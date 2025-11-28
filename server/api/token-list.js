/**
 * Token List API with Upstash Redis
 * Fetches token metadata from monad-crypto/token-list repository
 * Features:
 * - Persistent Redis cache across serverless invocations
 * - Commit-based change detection
 * - Rate limit protection
 */

import { Redis } from '@upstash/redis'

const GITHUB_API_BASE = 'https://api.github.com'
const TOKEN_LIST_REPO = 'monad-crypto/token-list'
const TOKEN_LIST_RAW_URL = 'https://raw.githubusercontent.com/monad-crypto/token-list/main/tokenlist-mainnet.json'
const LOGO_BASE_URL = 'https://raw.githubusercontent.com/monad-crypto/token-list/main'

// Redis keys
const REDIS_KEYS = {
  TOKEN_CACHE: 'tokens:mainnet:cache',
  LAST_COMMIT_SHA: 'tokens:mainnet:commit_sha',
  LAST_FETCH_TIME: 'tokens:mainnet:fetch_time'
}

// Initialize Redis with Upstash environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

/**
 * Get GitHub API headers with authentication
 */
function getGithubHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Monad-Explorer/1.0'
  }

  const githubToken = process.env.GITHUB_TOKEN
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`
  }

  return headers
}

/**
 * Check if repository has new commits since last fetch
 */
async function hasNewCommits() {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${TOKEN_LIST_REPO}/commits?path=tokenlist-mainnet.json&per_page=1`,
      { headers: getGithubHeaders() }
    )

    if (!response.ok) {
      return false
    }

    const commits = await response.json()

    if (commits.length === 0) {
      return false
    }

    const latestCommit = commits[0].sha

    // Get last known commit from Redis
    const lastCommitSha = await redis.get(REDIS_KEYS.LAST_COMMIT_SHA)

    if (!lastCommitSha) {
      // First time setup
      await redis.set(REDIS_KEYS.LAST_COMMIT_SHA, latestCommit)
      return true
    }

    if (latestCommit !== lastCommitSha) {
      await redis.set(REDIS_KEYS.LAST_COMMIT_SHA, latestCommit)
      return true
    }

    return false

  } catch (error) {
    return false
  }
}

/**
 * Fetch and process token list from GitHub
 */
async function fetchTokenList() {
  try {
    const response = await fetch(TOKEN_LIST_RAW_URL)

    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.status}`)
    }

    const tokenList = await response.json()

    if (!tokenList?.tokens) {
      throw new Error('Invalid token list format')
    }

    // Build token map (address -> token info)
    const tokenMap = {}

    // Add native MON with chain logo (special key: "native")
    tokenMap['native'] = {
      name: 'Monad',
      symbol: 'MON',
      decimals: 18,
      logoURI: tokenList.logoURI || null, // Already full URL
      isNative: true
    }

    // Helper to resolve logo URL
    const resolveLogoURI = (logoURI) => {
      if (!logoURI) return null
      // If already a full URL, use as-is
      if (logoURI.startsWith('http://') || logoURI.startsWith('https://')) {
        return logoURI
      }
      // Otherwise prepend base URL
      return `${LOGO_BASE_URL}/${logoURI}`
    }

    // Add all tokens from the list
    tokenList.tokens.forEach(token => {
      const address = token.address?.toLowerCase()
      if (address) {
        tokenMap[address] = {
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logoURI: resolveLogoURI(token.logoURI)
        }
      }
    })

    // Cache in Redis with 2 hour expiration
    await Promise.all([
      redis.setex(REDIS_KEYS.TOKEN_CACHE, 7200, JSON.stringify(tokenMap)),
      redis.set(REDIS_KEYS.LAST_FETCH_TIME, Date.now())
    ])

    return tokenMap

  } catch (error) {
    // Try to return cached data from Redis
    const cachedData = await redis.get(REDIS_KEYS.TOKEN_CACHE)
    if (cachedData) {
      return typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData
    }

    throw error
  }
}

/**
 * Main API handler
 */
export default defineEventHandler(async (event) => {
  try {
    // Only support GET requests
    if (getMethod(event) !== 'GET') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    // Check for force refresh query param
    const query = getQuery(event)
    const forceRefresh = query.refresh === 'true'

    // If force refresh, clear cache first
    if (forceRefresh) {
      await Promise.all([
        redis.del(REDIS_KEYS.TOKEN_CACHE),
        redis.del(REDIS_KEYS.LAST_FETCH_TIME),
        redis.del(REDIS_KEYS.LAST_COMMIT_SHA)
      ])
    }

    // Get cache data from Redis
    const [cachedData, lastFetchTime] = await Promise.all([
      redis.get(REDIS_KEYS.TOKEN_CACHE),
      redis.get(REDIS_KEYS.LAST_FETCH_TIME)
    ])

    const now = Date.now()
    const cacheAge = lastFetchTime ? now - lastFetchTime : Infinity
    const maxAge = 30 * 60 * 1000 // 30 minutes

    // Check if we need to refresh data
    const shouldRefresh = (
      forceRefresh ||
      !cachedData ||
      cacheAge > maxAge ||
      await hasNewCommits()
    )

    // If we have cached data and don't need immediate refresh, serve cached
    if (cachedData && !shouldRefresh) {
      const parsedData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData

      setResponseStatus(event, 200)
      setResponseHeader(event, 'Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=7200')
      setResponseHeader(event, 'X-Data-Source', 'redis-cache')
      setResponseHeader(event, 'X-Last-Updated', new Date(lastFetchTime).toISOString())

      return {
        success: true,
        data: parsedData,
        meta: {
          count: Object.keys(parsedData).length,
          lastUpdated: new Date(lastFetchTime).toISOString(),
          source: 'redis-cache'
        }
      }
    }

    // Fetch fresh data
    const freshData = await fetchTokenList()

    setResponseStatus(event, 200)
    setResponseHeader(event, 'Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=7200')
    setResponseHeader(event, 'X-Data-Source', 'fresh')
    setResponseHeader(event, 'X-Last-Updated', new Date().toISOString())

    return {
      success: true,
      data: freshData,
      meta: {
        count: Object.keys(freshData).length,
        lastUpdated: new Date().toISOString(),
        source: 'fresh'
      }
    }

  } catch (error) {
    // If we have cached data in Redis, serve it even on error
    const cachedData = await redis.get(REDIS_KEYS.TOKEN_CACHE)
    const lastFetchTime = await redis.get(REDIS_KEYS.LAST_FETCH_TIME)

    if (cachedData) {
      const parsedData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData

      setResponseStatus(event, 200)
      setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800')
      setResponseHeader(event, 'X-Data-Source', 'redis-fallback')
      setResponseHeader(event, 'X-Last-Updated', new Date(lastFetchTime).toISOString())

      return {
        success: true,
        data: parsedData,
        meta: {
          count: Object.keys(parsedData).length,
          lastUpdated: new Date(lastFetchTime).toISOString(),
          source: 'redis-fallback'
        }
      }
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch token list',
      data: { message: error.message }
    })
  }
})
