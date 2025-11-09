/**
 * Composable for event icon utilities
 * Maps event types to their corresponding icons and colors
 */
export function useEventIcons() {
	/**
	 * Event type to icon name mapping
	 */
	const EventIconMapping = {
		message: "message",
		coin_received: "coins_down",
		coin_spent: "coins_up",
		transfer: "arrow-circle-right-up",
		withdraw_rewards: "coins",
		withdraw_commission: "tag",
		tx: "zap",
		proposer_reward: "coins_down",
		commission: "coins_down",
		rewards: "coins_down",
		mint: "coins_down",
		burn: "burn",
		coinbase: "coins_down",
		unbond: "unlock",
		redelegate: "redelegate",
		complete_unbonding: "unlock",
		complete_redelegation: "redelegate",
		slash: "grid",
		cancel_unbonding_delegation: "unlock",
		liveness: "close-circle",
	}

	/**
	 * Get icon name for an event
	 * @param {Object} event - Event object
	 * @returns {string} Icon name
	 */
	const getEventIcon = (event) => {
		// EVM events
		if (event.topics) {
			return "zap"
		}

		// Legacy events with type mapping
		if (event.type && EventIconMapping[event.type]) {
			return EventIconMapping[event.type]
		}

		// Default icon
		return "zap"
	}

	/**
	 * Get icon color for an event
	 * @param {Object} event - Event object
	 * @returns {string} Color name
	 */
	const getEventColor = (event) => {
		// Decoded EVM events get brand color
		if (event.decoded) {
			return "brand"
		}

		// Others get tertiary color
		return "tertiary"
	}

	return {
		EventIconMapping,
		getEventIcon,
		getEventColor,
	}
}
