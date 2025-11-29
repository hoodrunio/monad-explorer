/**
 * Token List Service
 * Fetches token metadata from server API with client-side caching
 */
import { ref } from 'vue'

// Global cache and request state
const tokenCache = new Map()
const cacheTimestamp = ref(null)
const cacheVersion = ref(0) // Reactive trigger for cache updates
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

// Request deduplication
let fetchPromise = null
let isInitializing = false

/**
 * Fetch token list from server API with request deduplication
 */
export const fetchTokenList = async () => {
  // Check local cache first
  if (tokenCache.size > 0 && cacheTimestamp.value &&
      Date.now() - cacheTimestamp.value < CACHE_DURATION) {
    return tokenCache
  }

  // Prevent multiple concurrent requests
  if (fetchPromise) {
    await fetchPromise
    return tokenCache
  }

  if (isInitializing) {
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return tokenCache.size > 0 ? tokenCache : new Map()
  }

  isInitializing = true

  try {
    fetchPromise = $fetch('/api/token-list')

    const result = await fetchPromise

    if (!result.success || !result.data) {
      throw new Error('Invalid response from server API')
    }

    // Update local cache
    tokenCache.clear()
    Object.entries(result.data).forEach(([address, data]) => {
      tokenCache.set(address.toLowerCase(), data)
    })
    cacheTimestamp.value = Date.now()
    cacheVersion.value++ // Trigger reactive updates

    return tokenCache

  } catch (error) {
    console.error('Error fetching token list:', error)

    if (tokenCache.size > 0) {
      return tokenCache
    }

    return new Map()
  } finally {
    fetchPromise = null
    isInitializing = false
  }
}

/**
 * Get token info by address
 */
export const getTokenInfo = async (address) => {
  if (!address) return null

  // Check cache first
  if (tokenCache.size > 0 && cacheTimestamp.value &&
      Date.now() - cacheTimestamp.value < CACHE_DURATION) {
    return tokenCache.get(address.toLowerCase()) || null
  }

  // Fetch if cache is empty or stale
  const tokenMap = await fetchTokenList()

  if (!(tokenMap instanceof Map)) {
    return null
  }

  return tokenMap.get(address.toLowerCase()) || null
}

/**
 * Get token logo URL by address
 */
export const getTokenLogo = async (address) => {
  const info = await getTokenInfo(address)
  return info?.logoURI || null
}

/**
 * Get token logo URL synchronously (from cache only)
 * Use this in templates where async is not convenient
 */
export const getTokenLogoSync = (address) => {
  if (!address || tokenCache.size === 0) return null
  return tokenCache.get(address.toLowerCase())?.logoURI || null
}

/**
 * Get cache version ref for reactivity
 * Use this to trigger re-renders when cache updates
 */
export const useCacheVersion = () => cacheVersion

/**
 * Get token info synchronously (from cache only)
 */
export const getTokenInfoSync = (address) => {
  if (!address || tokenCache.size === 0) return null
  return tokenCache.get(address.toLowerCase()) || null
}

/**
 * Check if token has a registered logo (sync)
 */
export const hasTokenLogo = (address) => {
  if (!address || tokenCache.size === 0) return false
  return !!tokenCache.get(address.toLowerCase())?.logoURI
}

/**
 * Native MON key constant
 */
export const NATIVE_MON_KEY = 'native'

/**
 * Get native MON logo URL (sync)
 */
export const getNativeMonLogo = () => {
  if (tokenCache.size === 0) return null
  return tokenCache.get(NATIVE_MON_KEY)?.logoURI || null
}

/**
 * Get native MON info (sync)
 */
export const getNativeMonInfo = () => {
  if (tokenCache.size === 0) return null
  return tokenCache.get(NATIVE_MON_KEY) || null
}

/**
 * Preload token list (call on app init)
 */
export const preloadTokenList = async () => {
  if (tokenCache.size === 0 || !cacheTimestamp.value ||
      Date.now() - cacheTimestamp.value > CACHE_DURATION) {
    await fetchTokenList()
  }
}

/**
 * Get token list status for debugging
 */
export const getTokenListStatus = () => {
  const now = Date.now()
  const age = cacheTimestamp.value ? now - cacheTimestamp.value : null

  return {
    status: tokenCache.size > 0 ? 'ok' : (isInitializing ? 'loading' : 'empty'),
    tokenCount: tokenCache.size,
    cacheAge: age,
    cacheValid: age ? age < CACHE_DURATION : false,
    isInitializing,
    lastUpdated: cacheTimestamp.value ? new Date(cacheTimestamp.value).toISOString() : null
  }
}

/**
 * Force refresh token list (clears both client and server cache)
 */
export const refreshTokenList = async () => {
  tokenCache.clear()
  cacheTimestamp.value = null

  try {
    // Force server to refresh from GitHub
    const result = await $fetch('/api/token-list?refresh=true')

    if (!result.success || !result.data) {
      throw new Error('Invalid response from server API')
    }

    // Update local cache
    Object.entries(result.data).forEach(([key, data]) => {
      tokenCache.set(key.toLowerCase(), data)
    })
    cacheTimestamp.value = Date.now()

    return tokenCache
  } catch (error) {
    console.error('Error refreshing token list:', error)
    return new Map()
  }
}

export default {
  fetchTokenList,
  getTokenInfo,
  getTokenLogo,
  getTokenLogoSync,
  getTokenInfoSync,
  hasTokenLogo,
  preloadTokenList,
  getTokenListStatus,
  refreshTokenList,
  NATIVE_MON_KEY,
  getNativeMonLogo,
  getNativeMonInfo,
  useCacheVersion
}
