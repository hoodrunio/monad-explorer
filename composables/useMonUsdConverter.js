import { convertFromWei } from "@/services/utils/amounts"
import { useAppStore } from "@/store/app.store"

/**
 * Composable for converting MON amounts to USD
 * @returns {Object} Converter functions
 */
export const useMonUsdConverter = () => {
	const appStore = useAppStore()

	// Fallback price for development/when API is unavailable (can be removed in production)
	const FALLBACK_PRICE = 0 // Set to 0 to disable USD display when API is down, or set to a number like 25.50 for testing

	/**
	 * Convert MON amount (in wei) to USD string
	 * @param {string|number} weiAmount - Amount in wei
	 * @param {number} decimals - Decimal places (default: 18)
	 * @returns {string} Formatted USD string (e.g., "≈ $142.28")
	 */
	const convertToUsd = (weiAmount, decimals = 18) => {
		if (!weiAmount || weiAmount === "0" || weiAmount === 0) {
			return null
		}

		// Get current price from store
		let currentPrice = appStore.currentPrice?.close

		// Use fallback price if API price is not available
		if (!currentPrice || currentPrice === "0" || currentPrice === 0) {
			if (FALLBACK_PRICE > 0) {
				currentPrice = FALLBACK_PRICE
			} else {
				return null // No price available
			}
		}

		try {
			// Convert from wei to MON
			const monAmount = convertFromWei(weiAmount, decimals)

			// Parse price (it might be a string)
			const price = parseFloat(currentPrice)

			// Convert to USD
			const usdValue = monAmount * price

			if (!usdValue || isNaN(usdValue)) {
				return null
			}

			// Format based on value
			if (usdValue < 0.01) {
				return "≈ <$0.01"
			} else if (usdValue < 1) {
				return `≈ $${usdValue.toFixed(3)}`
			} else if (usdValue < 1000) {
				return `≈ $${usdValue.toFixed(2)}`
			} else if (usdValue < 1000000) {
				return `≈ $${(usdValue / 1000).toFixed(2)}K`
			} else if (usdValue < 1000000000) {
				return `≈ $${(usdValue / 1000000).toFixed(2)}M`
			} else {
				return `≈ $${(usdValue / 1000000000).toFixed(2)}B`
			}
		} catch (error) {
			console.error("Error converting to USD:", error, { weiAmount, currentPrice })
			return null
		}
	}

	/**
	 * Check if price data is available
	 * @returns {boolean} True if price is available
	 */
	const isPriceAvailable = computed(() => {
		const price = appStore.currentPrice?.close
		return !!(price && price !== "0" && price !== 0)
	})

	return {
		convertToUsd,
		isPriceAvailable,
	}
}
