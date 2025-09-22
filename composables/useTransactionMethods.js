/**
 * Composable for managing transaction method information
 * Handles 4bytes.directory integration and method signature caching
 */

import { ref, computed, watch } from 'vue'
import { getFunctionSignature, extractMethodName, hasMethodSignature } from '@/services/api/fourBytes'

/**
 * Global state for method information to avoid duplicate API calls
 */
const methodInfoCache = new Map()

export const useTransactionMethods = () => {
	const isLoading = ref(false)
	const error = ref(null)

	/**
	 * Get method information for a transaction
	 * @param {Object} transaction - Transaction object with methodID and input fields
	 * @returns {Object} Reactive method information
	 */
	const getMethodInfo = (transaction) => {
		const methodId = computed(() => transaction?.methodID || null)
		const input = computed(() => transaction?.input || null)
		const existingMethodName = computed(() => transaction?.methodName || null)
		
		const signature = ref(null)
		const methodName = ref(existingMethodName.value)
		const canDecode = ref(false)
		const isLoadingMethod = ref(false)

		// Function to fetch method information
		const fetchMethodInfo = async () => {
			const currentMethodId = methodId.value
			
			if (!currentMethodId || currentMethodId === '0x' || currentMethodId.length < 10) {
				signature.value = null
				methodName.value = existingMethodName.value
				canDecode.value = false
				return
			}

			// Check cache first
			if (methodInfoCache.has(currentMethodId)) {
				const cached = methodInfoCache.get(currentMethodId)
				signature.value = cached.signature
				methodName.value = cached.methodName || existingMethodName.value
				canDecode.value = cached.canDecode
				return
			}

			isLoadingMethod.value = true
			error.value = null

			try {
				// Fetch from 4bytes.directory
				const fetchedSignature = await getFunctionSignature(currentMethodId)
				const fetchedMethodName = fetchedSignature ? extractMethodName(fetchedSignature) : null
				const decodeable = fetchedSignature !== null

				// Cache the result
				const cacheData = {
					signature: fetchedSignature,
					methodName: fetchedMethodName,
					canDecode: decodeable,
					timestamp: Date.now()
				}
				methodInfoCache.set(currentMethodId, cacheData)

				// Update reactive values
				signature.value = fetchedSignature
				methodName.value = fetchedMethodName || existingMethodName.value
				canDecode.value = decodeable
			} catch (err) {
				error.value = err.message || 'Failed to fetch method information'
				console.warn('Error fetching method info:', err)
			} finally {
				isLoadingMethod.value = false
			}
		}

		// Watch for changes in methodId and fetch info
		watch(methodId, fetchMethodInfo, { immediate: true })

		return {
			methodId,
			input,
			signature,
			methodName,
			canDecode,
			isLoadingMethod,
			refetch: fetchMethodInfo
		}
	}

	/**
	 * Batch fetch method information for multiple transactions
	 * @param {Array} transactions - Array of transaction objects
	 * @returns {Promise<Map>} Map of methodId to method information
	 */
	const batchGetMethodInfo = async (transactions) => {
		if (!Array.isArray(transactions)) {
			return new Map()
		}

		isLoading.value = true
		error.value = null

		const results = new Map()
		const uniqueMethodIds = new Set()

		// Collect unique method IDs
		transactions.forEach(tx => {
			if (tx.methodID && tx.methodID !== '0x' && tx.methodID.length >= 10) {
				uniqueMethodIds.add(tx.methodID)
			}
		})

		try {
			// Process each unique method ID
			const promises = Array.from(uniqueMethodIds).map(async (methodId) => {
				// Check cache first
				if (methodInfoCache.has(methodId)) {
					const cached = methodInfoCache.get(methodId)
					results.set(methodId, cached)
					return
				}

				try {
					const signature = await getFunctionSignature(methodId)
					const methodName = signature ? extractMethodName(signature) : null
					const canDecode = signature !== null

					const methodInfo = {
						signature,
						methodName,
						canDecode,
						timestamp: Date.now()
					}

					methodInfoCache.set(methodId, methodInfo)
					results.set(methodId, methodInfo)
				} catch (err) {
					console.warn(`Failed to fetch method info for ${methodId}:`, err)
					// Set default values for failed requests
					results.set(methodId, {
						signature: null,
						methodName: null,
						canDecode: false,
						timestamp: Date.now()
					})
				}
			})

			await Promise.all(promises)
		} catch (err) {
			error.value = err.message || 'Failed to batch fetch method information'
		} finally {
			isLoading.value = false
		}

		return results
	}

	/**
	 * Check if input data can be decoded (has method signature in 4bytes.directory)
	 * @param {string} methodId - Method ID to check
	 * @returns {Promise<boolean>} True if can be decoded
	 */
	const checkCanDecode = async (methodId) => {
		if (!methodId || methodId === '0x' || methodId.length < 10) {
			return false
		}

		// Check cache first
		if (methodInfoCache.has(methodId)) {
			return methodInfoCache.get(methodId).canDecode
		}

		try {
			return await hasMethodSignature(methodId)
		} catch (err) {
			console.warn('Error checking decode availability:', err)
			return false
		}
	}

	/**
	 * Format input data for display
	 * @param {string} input - Raw input data
	 * @param {number} maxLength - Maximum length to display (default: 100)
	 * @returns {string} Formatted input data
	 */
	const formatInputData = (input, maxLength = 100) => {
		if (!input || input === '0x') {
			return '0x'
		}

		if (input.length <= maxLength) {
			return input
		}

		const start = input.substring(0, 10) // 0x + 8 chars
		const end = input.substring(input.length - 8)
		return `${start}...${end}`
	}

	/**
	 * Clear method cache (useful for testing or memory management)
	 */
	const clearCache = () => {
		methodInfoCache.clear()
	}

	return {
		// Main functions
		getMethodInfo,
		batchGetMethodInfo,
		checkCanDecode,
		formatInputData,
		
		// State
		isLoading: readonly(isLoading),
		error: readonly(error),
		
		// Utilities
		clearCache
	}
}
