/**
 * Protocols API with Upstash Redis
 * Fetches protocol metadata from monad-crypto/protocols repository
 * Features:
 * - Persistent Redis cache across serverless invocations
 * - Commit-based change detection
 * - CSV parsing with proper handling of quoted values
 */

import { Redis } from '@upstash/redis'

const GITHUB_API_BASE = 'https://api.github.com'
const PROTOCOLS_REPO = 'monad-crypto/protocols'
const PROTOCOLS_RAW_URL = 'https://raw.githubusercontent.com/monad-crypto/protocols/refs/heads/main/protocols-mainnet.csv'

// Redis keys
const REDIS_KEYS = {
  PROTOCOLS_CACHE: 'protocols:mainnet:cache',
  LAST_COMMIT_SHA: 'protocols:mainnet:commit_sha',
  LAST_FETCH_TIME: 'protocols:mainnet:fetch_time'
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
      `${GITHUB_API_BASE}/repos/${PROTOCOLS_REPO}/commits?path=protocols-mainnet.csv&per_page=1`,
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
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Push the last value
  values.push(current.trim())

  return values
}

/**
 * Parse CSV text into array of objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')

  if (lines.length < 2) {
    throw new Error('Invalid CSV format: no data rows')
  }

  // Parse header row
  const headers = parseCSVLine(lines[0])

  // Parse data rows
  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])

    if (values.length !== headers.length) {
      continue // Skip malformed rows
    }

    const row = {}
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] || ''
    })

    // Only include rows with valid address
    if (row.address && row.address.startsWith('0x')) {
      data.push(row)
    }
  }

  return data
}

/**
 * Build protocol data structures from parsed CSV
 */
function buildProtocolMaps(csvData) {
  // Address map for O(1) lookups
  const addressMap = {}

  // Protocol aggregation map
  const protocolsMap = {}

  // Categories tracking
  const categorySet = new Set()
  const subcategoryByCategory = {}

  csvData.forEach(row => {
    const address = row.address?.toLowerCase()
    if (!address) return

    const protocol = {
      name: row.name || 'Unknown',
      ctype: row.ctype || 'Other',
      csubtype: row.csubtype || '',
      contract: row.contract || '',
      allCategories: row.all_categories ? row.all_categories.split(';').map(c => c.trim()).filter(Boolean) : []
    }

    // Add to address map
    addressMap[address] = protocol

    // Track categories
    if (protocol.ctype) {
      categorySet.add(protocol.ctype)

      if (!subcategoryByCategory[protocol.ctype]) {
        subcategoryByCategory[protocol.ctype] = new Set()
      }
      if (protocol.csubtype) {
        subcategoryByCategory[protocol.ctype].add(protocol.csubtype)
      }
    }

    // Aggregate by protocol name
    if (!protocolsMap[protocol.name]) {
      protocolsMap[protocol.name] = {
        name: protocol.name,
        ctype: protocol.ctype,
        csubtype: protocol.csubtype,
        contracts: [],
        allCategories: new Set()
      }
    }

    protocolsMap[protocol.name].contracts.push({
      address: address,
      contract: protocol.contract
    })

    protocol.allCategories.forEach(cat => {
      protocolsMap[protocol.name].allCategories.add(cat)
    })
  })

  // Convert protocols map to sorted array
  const protocolsList = Object.values(protocolsMap)
    .map(p => ({
      ...p,
      allCategories: Array.from(p.allCategories)
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Build categories object
  const categories = {
    primary: Array.from(categorySet).sort(),
    byPrimary: {}
  }

  Object.entries(subcategoryByCategory).forEach(([category, subcats]) => {
    categories.byPrimary[category] = Array.from(subcats).sort()
  })

  return {
    addressMap,
    protocolsList,
    categories
  }
}

/**
 * Fetch and process protocols from GitHub
 */
async function fetchProtocols() {
  try {
    const response = await fetch(PROTOCOLS_RAW_URL)

    if (!response.ok) {
      throw new Error(`Failed to fetch protocols: ${response.status}`)
    }

    const csvText = await response.text()

    // Parse CSV
    const csvData = parseCSV(csvText)

    if (csvData.length === 0) {
      throw new Error('No valid protocol data found')
    }

    // Build data structures
    const protocolData = buildProtocolMaps(csvData)

    // Cache in Redis with 2 hour expiration
    await Promise.all([
      redis.setex(REDIS_KEYS.PROTOCOLS_CACHE, 7200, JSON.stringify(protocolData)),
      redis.set(REDIS_KEYS.LAST_FETCH_TIME, Date.now())
    ])

    return protocolData

  } catch (error) {
    // Try to return cached data from Redis
    const cachedData = await redis.get(REDIS_KEYS.PROTOCOLS_CACHE)
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
        redis.del(REDIS_KEYS.PROTOCOLS_CACHE),
        redis.del(REDIS_KEYS.LAST_FETCH_TIME),
        redis.del(REDIS_KEYS.LAST_COMMIT_SHA)
      ])
    }

    // Get cache data from Redis
    const [cachedData, lastFetchTime] = await Promise.all([
      redis.get(REDIS_KEYS.PROTOCOLS_CACHE),
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
          addressCount: Object.keys(parsedData.addressMap || {}).length,
          protocolCount: (parsedData.protocolsList || []).length,
          lastUpdated: new Date(lastFetchTime).toISOString(),
          source: 'redis-cache'
        }
      }
    }

    // Fetch fresh data
    const freshData = await fetchProtocols()

    setResponseStatus(event, 200)
    setResponseHeader(event, 'Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=7200')
    setResponseHeader(event, 'X-Data-Source', 'fresh')
    setResponseHeader(event, 'X-Last-Updated', new Date().toISOString())

    return {
      success: true,
      data: freshData,
      meta: {
        addressCount: Object.keys(freshData.addressMap || {}).length,
        protocolCount: (freshData.protocolsList || []).length,
        lastUpdated: new Date().toISOString(),
        source: 'fresh'
      }
    }

  } catch (error) {
    // If we have cached data in Redis, serve it even on error
    const cachedData = await redis.get(REDIS_KEYS.PROTOCOLS_CACHE)
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
          addressCount: Object.keys(parsedData.addressMap || {}).length,
          protocolCount: (parsedData.protocolsList || []).length,
          lastUpdated: new Date(lastFetchTime).toISOString(),
          source: 'redis-fallback'
        }
      }
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch protocols',
      data: { message: error.message }
    })
  }
})
