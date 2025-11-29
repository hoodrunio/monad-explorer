/**
 * Protocol List Service
 * Fetches protocol metadata from server API with client-side caching
 */
import { ref } from 'vue'

// Global cache stores
const addressCache = new Map()        // address -> protocol info
const protocolsCache = ref([])        // Full protocols list
const categoriesCache = ref({})       // Categories metadata
const cacheTimestamp = ref(null)
const cacheVersion = ref(0)           // Reactive trigger for cache updates
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

// Request deduplication
let fetchPromise = null
let isInitializing = false

/**
 * Fetch protocol list from server API with request deduplication
 */
export const fetchProtocolList = async () => {
  // Check local cache first
  if (addressCache.size > 0 && cacheTimestamp.value &&
      Date.now() - cacheTimestamp.value < CACHE_DURATION) {
    return {
      addressMap: addressCache,
      protocolsList: protocolsCache.value,
      categories: categoriesCache.value
    }
  }

  // Prevent multiple concurrent requests
  if (fetchPromise) {
    await fetchPromise
    return {
      addressMap: addressCache,
      protocolsList: protocolsCache.value,
      categories: categoriesCache.value
    }
  }

  if (isInitializing) {
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return {
      addressMap: addressCache,
      protocolsList: protocolsCache.value,
      categories: categoriesCache.value
    }
  }

  isInitializing = true

  try {
    fetchPromise = $fetch('/api/protocols')

    const result = await fetchPromise

    if (!result.success || !result.data) {
      throw new Error('Invalid response from server API')
    }

    // Update local caches
    addressCache.clear()
    Object.entries(result.data.addressMap || {}).forEach(([address, data]) => {
      addressCache.set(address.toLowerCase(), data)
    })

    protocolsCache.value = result.data.protocolsList || []
    categoriesCache.value = result.data.categories || {}
    cacheTimestamp.value = Date.now()
    cacheVersion.value++ // Trigger reactive updates

    return {
      addressMap: addressCache,
      protocolsList: protocolsCache.value,
      categories: categoriesCache.value
    }

  } catch (error) {
    console.error('Error fetching protocol list:', error)

    // Return cached data if available
    if (addressCache.size > 0) {
      return {
        addressMap: addressCache,
        protocolsList: protocolsCache.value,
        categories: categoriesCache.value
      }
    }

    return {
      addressMap: new Map(),
      protocolsList: [],
      categories: {}
    }
  } finally {
    fetchPromise = null
    isInitializing = false
  }
}

/**
 * Get protocol info by address (async)
 */
export const getProtocolInfo = async (address) => {
  if (!address) return null

  // Check cache first
  if (addressCache.size > 0 && cacheTimestamp.value &&
      Date.now() - cacheTimestamp.value < CACHE_DURATION) {
    return addressCache.get(address.toLowerCase()) || null
  }

  // Fetch if cache is empty or stale
  await fetchProtocolList()
  return addressCache.get(address.toLowerCase()) || null
}

/**
 * Get protocol info by address (sync, from cache only)
 * Use this in templates where async is not convenient
 */
export const getProtocolInfoSync = (address) => {
  if (!address || addressCache.size === 0) return null
  return addressCache.get(address.toLowerCase()) || null
}

/**
 * Get cache version ref for reactivity
 * Use this to trigger re-renders when cache updates
 */
export const useCacheVersion = () => cacheVersion

/**
 * Get protocol name by address (sync)
 */
export const getProtocolNameSync = (address) => {
  const info = getProtocolInfoSync(address)
  return info?.name || null
}

/**
 * Get protocol category by address (sync)
 */
export const getProtocolCategorySync = (address) => {
  const info = getProtocolInfoSync(address)
  return info ? { ctype: info.ctype, csubtype: info.csubtype } : null
}

/**
 * Check if address has a registered protocol (sync)
 */
export const hasProtocol = (address) => {
  if (!address || addressCache.size === 0) return false
  return addressCache.has(address.toLowerCase())
}

/**
 * Get full protocols list (sync)
 */
export const getProtocolsList = () => protocolsCache.value

/**
 * Get protocols filtered by category (sync)
 */
export const getProtocolsByCategory = (category) => {
  if (!category || category === 'all') return protocolsCache.value
  return protocolsCache.value.filter(p => p.ctype === category)
}

/**
 * Get protocols filtered by subcategory (sync)
 */
export const getProtocolsBySubcategory = (category, subcategory) => {
  if (!category || category === 'all') return protocolsCache.value
  let result = protocolsCache.value.filter(p => p.ctype === category)
  if (subcategory && subcategory !== 'all') {
    result = result.filter(p => p.csubtype === subcategory)
  }
  return result
}

/**
 * Get categories metadata (sync)
 */
export const getCategories = () => categoriesCache.value

/**
 * Get primary categories list (sync)
 */
export const getPrimaryCategories = () => categoriesCache.value.primary || []

/**
 * Get subcategories for a primary category (sync)
 */
export const getSubcategories = (category) => {
  return categoriesCache.value.byPrimary?.[category] || []
}

/**
 * Search protocols by name (sync)
 */
export const searchProtocols = (query) => {
  if (!query) return protocolsCache.value

  const lowerQuery = query.toLowerCase()
  return protocolsCache.value.filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.csubtype?.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Preload protocol list (call on app init)
 */
export const preloadProtocolList = async () => {
  if (addressCache.size === 0 || !cacheTimestamp.value ||
      Date.now() - cacheTimestamp.value > CACHE_DURATION) {
    await fetchProtocolList()
  }
}

/**
 * Get protocol list status for debugging
 */
export const getProtocolListStatus = () => {
  const now = Date.now()
  const age = cacheTimestamp.value ? now - cacheTimestamp.value : null

  return {
    status: addressCache.size > 0 ? 'ok' : (isInitializing ? 'loading' : 'empty'),
    addressCount: addressCache.size,
    protocolCount: protocolsCache.value.length,
    categoryCount: categoriesCache.value.primary?.length || 0,
    cacheAge: age,
    cacheValid: age ? age < CACHE_DURATION : false,
    isInitializing,
    lastUpdated: cacheTimestamp.value ? new Date(cacheTimestamp.value).toISOString() : null
  }
}

/**
 * Force refresh protocol list (clears both client and server cache)
 */
export const refreshProtocolList = async () => {
  addressCache.clear()
  protocolsCache.value = []
  categoriesCache.value = {}
  cacheTimestamp.value = null

  try {
    // Force server to refresh from GitHub
    const result = await $fetch('/api/protocols?refresh=true')

    if (!result.success || !result.data) {
      throw new Error('Invalid response from server API')
    }

    // Update local caches
    Object.entries(result.data.addressMap || {}).forEach(([address, data]) => {
      addressCache.set(address.toLowerCase(), data)
    })

    protocolsCache.value = result.data.protocolsList || []
    categoriesCache.value = result.data.categories || {}
    cacheTimestamp.value = Date.now()

    return {
      addressMap: addressCache,
      protocolsList: protocolsCache.value,
      categories: categoriesCache.value
    }
  } catch (error) {
    console.error('Error refreshing protocol list:', error)
    return {
      addressMap: new Map(),
      protocolsList: [],
      categories: {}
    }
  }
}

export default {
  fetchProtocolList,
  getProtocolInfo,
  getProtocolInfoSync,
  getProtocolNameSync,
  getProtocolCategorySync,
  hasProtocol,
  getProtocolsList,
  getProtocolsByCategory,
  getProtocolsBySubcategory,
  getCategories,
  getPrimaryCategories,
  getSubcategories,
  searchProtocols,
  preloadProtocolList,
  getProtocolListStatus,
  refreshProtocolList,
  useCacheVersion
}
