/**
 * Composable for event formatting utilities
 * Handles formatting of event types, values, and action types
 */
export function useEventFormatting() {
	/**
	 * Handle event type mapping for display
	 * @param {string} type - Event type
	 * @returns {string} Formatted event type
	 */
	const handlingEventType = (type) => {
		switch (type) {
			case "cosmos.authz.v1beta1.EventGrant":
				return "grant"

			case "cosmos.authz.v1beta1.EventRevoke":
				return "revoke"

			default:
				return type
		}
	}

	/**
	 * Extract action type from full qualified name
	 * @param {string} type - Full qualified type name
	 * @returns {string} Action type
	 */
	const handlingEventActionType = (type) => {
		return type.split(".").slice(-1)[0].replace('"', "")
	}

	/**
	 * Format parameter value based on type
	 * @param {*} value - Parameter value
	 * @param {string} type - Solidity type
	 * @returns {string} Formatted value
	 */
	const formatValue = (value, type) => {
		if (!value) return 'null'

		// Handle hex strings
		if (typeof value === 'string' && value.startsWith('0x')) {
			return value
		}

		// Handle BigInt/large numbers
		if (type?.includes('uint') || type?.includes('int')) {
			return value
		}

		// Handle booleans
		if (typeof value === 'boolean' || value === 'true' || value === 'false') {
			return value.toString()
		}

		// Handle addresses
		if (typeof value === 'string' && value.length === 42 && value.startsWith('0x')) {
			return value
		}

		return value.toString()
	}

	return {
		handlingEventType,
		handlingEventActionType,
		formatValue,
	}
}
