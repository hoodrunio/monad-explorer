/**
 * Vercel-Optimized GitHub Validators API with Upstash Redis
 * Features:
 * - Persistent Redis cache across serverless invocations
 * - Commit-based change detection
 * - Rate limit protection
 * - Intelligent background refresh
 */

import { Redis } from '@upstash/redis'

const GITHUB_API_BASE = 'https://api.github.com'
const VALIDATOR_INFO_REPO = 'monad-developers/validator-info'
const TESTNET_FOLDER = 'testnet'

// Redis keys for persistent caching
const REDIS_KEYS = {
  VALIDATORS_CACHE: 'validators:cache',
  LAST_COMMIT_SHA: 'validators:commit_sha',
  LAST_FETCH_TIME: 'validators:fetch_time'
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
      `${GITHUB_API_BASE}/repos/${VALIDATOR_INFO_REPO}/commits?path=${TESTNET_FOLDER}&per_page=1`,
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
 * Controlled delay to prevent rate limiting
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch all validator data with rate limiting and batching
 */
async function fetchValidatorData() {
  try {
    
    // Get the contents of testnet directory
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${VALIDATOR_INFO_REPO}/contents/${TESTNET_FOLDER}`,
      { headers: getGithubHeaders() }
    )
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }
    
    const contents = await response.json()
    const validatorFiles = contents.filter(item =>
      item.type === 'file' && (item.name.endsWith('.json') || !item.name.includes('.'))
    )
        
    const validatorsObject = {}
    const batchSize = 5 // Process in small batches
    
    // Process files in controlled batches
    for (let i = 0; i < validatorFiles.length; i += batchSize) {
      const batch = validatorFiles.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (file) => {
        try {
          const fileResponse = await fetch(file.download_url)
          
          if (!fileResponse.ok) {
            return null
          }
          
          const validatorData = await fileResponse.json()
          
          // Validate required fields
          if (!validatorData.secp) {
            return null
          }
          
          return {
            secp: validatorData.secp,
            data: validatorData
          }
          
        } catch (error) {
          return null
        }
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Process successful results
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          const { secp, data } = result.value
          validatorsObject[secp] = data
        }
      })
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < validatorFiles.length) {
        await delay(200)
      }
    }
    
    // Cache in Redis with 2 hour expiration
    await Promise.all([
      redis.setex(REDIS_KEYS.VALIDATORS_CACHE, 7200, JSON.stringify(validatorsObject)), // 2 hours
      redis.set(REDIS_KEYS.LAST_FETCH_TIME, Date.now())
    ])
        
    return validatorsObject
    
  } catch (error) {    
    // Try to return cached data from Redis
    const cachedData = await redis.get(REDIS_KEYS.VALIDATORS_CACHE)
    if (cachedData) {
      // Handle both string and object responses from Redis
      return typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData
    }
    
    throw error
  }
}

/**
 * Main API handler using h3/Nuxt 3 structure with Redis caching
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
    
    // Get cache data from Redis
    const [cachedData, lastFetchTime] = await Promise.all([
      redis.get(REDIS_KEYS.VALIDATORS_CACHE),
      redis.get(REDIS_KEYS.LAST_FETCH_TIME)
    ])
    
    const now = Date.now()
    const cacheAge = lastFetchTime ? now - lastFetchTime : Infinity
    const maxAge = 10 * 60 * 1000 // 30 minutes
    
    // Check if we need to refresh data
    const shouldRefresh = (
      !cachedData || 
      cacheAge > maxAge || 
      await hasNewCommits()
    )
    
    // If we have cached data and don't need immediate refresh, serve cached
    if (cachedData && !shouldRefresh) {
      
      // Handle both string and object responses from Redis
      const parsedData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData
      
      // Set response headers
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
    const freshData = await fetchValidatorData()
    
    // Set response headers
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
    const cachedData = await redis.get(REDIS_KEYS.VALIDATORS_CACHE)
    const lastFetchTime = await redis.get(REDIS_KEYS.LAST_FETCH_TIME)
    
    if (cachedData) {
      // Handle both string and object responses from Redis
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
      statusMessage: 'Failed to fetch validator data',
      data: { message: error.message }
    })
  }
}) 