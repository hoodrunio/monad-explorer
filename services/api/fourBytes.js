/** 
 * 4bytes.directory API integration for method signature lookups
 * API Documentation: https://github.com/ethereum-lists/4bytes
 */

/**
 * Cache for method signatures to avoid repeated API calls
 * Structure: { methodId: { signature: string, timestamp: number } }
 */
const methodSignatureCache = new Map()

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000

/**
 * Get function signature from 4bytes.directory
 * @param {string} methodId - The method ID (first 4 bytes of input data, e.g., "0x395ea61b")
 * @returns {Promise<string|null>} Function signature or null if not found
 */
export const getFunctionSignature = async (methodId) => {
	if (!methodId || typeof methodId !== 'string') {
		return null
	}

	// Remove 0x prefix if present and ensure it's 4 bytes (8 hex chars)
	const cleanMethodId = methodId.replace('0x', '').toLowerCase()
	if (cleanMethodId.length !== 8) {
		return null
	}

	const cacheKey = `0x${cleanMethodId}`

	// Check cache first
	if (methodSignatureCache.has(cacheKey)) {
		const cached = methodSignatureCache.get(cacheKey)
		const isExpired = Date.now() - cached.timestamp > CACHE_DURATION
		
		if (!isExpired) {
			return cached.signature
		} else {
			// Remove expired cache entry
			methodSignatureCache.delete(cacheKey)
		}
	}

	try {
		// 4bytes.directory API endpoint
		const response = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${cacheKey}`)
		
		if (!response.ok) {
			return null
		}

		const data = await response.json()
		
		// API returns an array of results, take the first one if available
		if (data.results && data.results.length > 0) {
			const signature = data.results[0].text_signature
			
			// Cache the result
			methodSignatureCache.set(cacheKey, {
				signature,
				timestamp: Date.now()
			})
			
			return signature
		}
		
		return null
	} catch (error) {
		console.warn('Failed to fetch function signature from 4bytes.directory:', error)
		return null
	}
}

/**
 * Extract method name from function signature
 * @param {string} signature - Function signature (e.g., "transfer(address,uint256)")
 * @returns {string} Method name (e.g., "transfer")
 */
export const extractMethodName = (signature) => {
	if (!signature || typeof signature !== 'string') {
		return ''
	}

	const parenIndex = signature.indexOf('(')
	return parenIndex > 0 ? signature.substring(0, parenIndex) : signature
}

/**
 * Get both signature and method name for a method ID
 * @param {string} methodId - The method ID
 * @returns {Promise<{signature: string|null, methodName: string|null}>}
 */
export const getMethodInfo = async (methodId) => {
	const signature = await getFunctionSignature(methodId)
	const methodName = signature ? extractMethodName(signature) : null
	
	return {
		signature,
		methodName
	}
}

/**
 * Check if a method ID exists in 4bytes.directory (for decode availability)
 * @param {string} methodId - The method ID
 * @returns {Promise<boolean>} True if method exists in 4bytes.directory
 */
export const hasMethodSignature = async (methodId) => {
	const signature = await getFunctionSignature(methodId)
	return signature !== null
}

/**
 * Clear the method signature cache (useful for testing or memory management)
 */
export const clearMethodCache = () => {
	methodSignatureCache.clear()
}

/**
 * Get cache statistics (useful for debugging)
 * @returns {{size: number, entries: Array}} Cache statistics
 */
export const getCacheStats = () => {
	return {
		size: methodSignatureCache.size,
		entries: Array.from(methodSignatureCache.entries()).map(([key, value]) => ({
			methodId: key,
			signature: value.signature,
			cached: new Date(value.timestamp).toISOString()
		}))
	}
}
