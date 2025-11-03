/** GitHub API Service for Monad Validator Info */
import { ref } from 'vue'

// Global cache and request state
const validatorCache = new Map()
const cacheTimestamp = ref(null)
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

// Request deduplication - prevent multiple concurrent requests
let fetchPromise = null
let isInitializing = false

/**
 * Fetch validator information from server API with request deduplication
 * This uses the Vercel-optimized server endpoint with intelligent caching
 */
export const fetchGithubValidatorInfo = async () => {
  // Check local cache first (short-term cache for immediate reuse)
  if (validatorCache.size > 0 && cacheTimestamp.value && 
      Date.now() - cacheTimestamp.value < CACHE_DURATION) {
    return validatorCache
  }

  // Prevent multiple concurrent requests - wait for existing request to complete
  if (fetchPromise) {
    await fetchPromise  // Wait for the request to complete
    return validatorCache  // Return the processed Map from cache
  }

  // Mark that we're initializing
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    // Ensure we return a Map even if initialization failed
    return validatorCache.size > 0 ? validatorCache : new Map()
  }

  isInitializing = true

  try {
    // Create and store the fetch promise for deduplication
    fetchPromise = $fetch('/api/validators-github')
    
    const result = await fetchPromise
    
    if (!result.success || !result.data) {
      throw new Error('Invalid response from server API')
    }

    // Update local cache
    validatorCache.clear()
    Object.entries(result.data).forEach(([secp, data]) => {
      validatorCache.set(secp, data)
    })
    cacheTimestamp.value = Date.now()

    return validatorCache

  } catch (error) {    
    // If we have cached data, return it even if it's old
    if (validatorCache.size > 0) {
      return validatorCache
    }
    
    // Return empty Map if no cache available
    return new Map()
  } finally {
    // Clear the fetch promise and initialization flag
    fetchPromise = null
    isInitializing = false
  }
}

/**
 * Get validator info by secp key (validator ID) with optimized caching
 */
export const getValidatorInfoBySecp = async (secp) => {
  if (!secp) return null
  
  // First check if we already have the data in cache
  if (validatorCache.size > 0 && cacheTimestamp.value && 
      Date.now() - cacheTimestamp.value < CACHE_DURATION) {
    return validatorCache.get(secp) || null
  }
  
  // If cache is empty or stale, fetch all validator data once
  const validatorMap = await fetchGithubValidatorInfo()
  
  // Safety check to ensure we have a Map
  if (!(validatorMap instanceof Map)) {
    return null
  }
  
  return validatorMap.get(secp) || null
}

/**
 * Merge GitHub validator data with backend validator data
 * Priority: github.name → infrastructure.validator_name → Validator #ID → validator_id
 */
export const mergeValidatorData = (backendValidator, githubData) => {
  if (!backendValidator) return null

  // Compute display name with proper fallback priority
  let displayName

  if (githubData?.name) {
    // Priority 1: GitHub name
    displayName = githubData.name
  } else if (backendValidator.infrastructure?.validator_name &&
             backendValidator.infrastructure.validator_name !== 'unknown') {
    // Priority 2: Infrastructure validator name
    displayName = backendValidator.infrastructure.validator_name
  } else if (backendValidator.staking?.precompile_validator_id) {
    // Priority 3: Validator #<precompile_validator_id>
    displayName = `Validator #${backendValidator.staking.precompile_validator_id}`
  } else {
    // Priority 4: Short hex of validator_id
    const validatorId = backendValidator.validator_id
    if (validatorId && validatorId.length > 16) {
      displayName = `${validatorId.slice(0, 8)} ••• ${validatorId.slice(-8)}`
    } else {
      displayName = validatorId || 'Unknown'
    }
  }

  return {
    ...backendValidator,
    github: githubData || null,
    displayName,
    // Enhanced logo URL - prefer GitHub logo over keybase
    logoUrl: githubData?.logo || backendValidator.keybase?.logo_url || null,
    // Additional GitHub fields
    description: githubData?.description || null,
    website: githubData?.website || null,
    twitter: githubData?.x || null
  }
}

/**
 * Get GitHub validator status for debugging
 */
export const getGithubValidatorStatus = () => {
  const now = Date.now()
  const age = cacheTimestamp.value ? now - cacheTimestamp.value : null
  
  return {
    status: validatorCache.size > 0 ? 'ok' : (isInitializing ? 'loading' : 'empty'),
    validatorCount: validatorCache.size,
    cacheAge: age,
    cacheValid: age ? age < CACHE_DURATION : false,
    isInitializing,
    lastUpdated: cacheTimestamp.value ? new Date(cacheTimestamp.value).toISOString() : null
  }
}

/**
 * Preload GitHub validator data (useful for initialization)
 */
export const preloadGithubValidatorData = async () => {
  if (validatorCache.size === 0 || !cacheTimestamp.value || 
      Date.now() - cacheTimestamp.value > CACHE_DURATION) {
    await fetchGithubValidatorInfo()
  }
} 