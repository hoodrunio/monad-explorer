/**
 * Event utilities for blockchain event handling
 */

/**
 * Check if an event is an EVM event
 * @param {Object} event - Event object
 * @returns {boolean} True if EVM event
 */
export function isEVMEvent(event) {
	return Boolean(event.topics)
}

/**
 * Check if an event is a legacy Cosmos event
 * @param {Object} event - Event object
 * @returns {boolean} True if legacy event
 */
export function isLegacyEvent(event) {
	return Boolean(event.type) && !event.topics
}

/**
 * Check if an event has decoded data
 * @param {Object} event - Event object
 * @returns {boolean} True if event has decoded parameters
 */
export function hasDecodedData(event) {
	return Boolean(event.decoded && event.decoded.parameters && event.decoded.parameters.length > 0)
}

/**
 * Get event display name
 * @param {Object} event - Event object
 * @returns {string} Event display name
 */
export function getEventDisplayName(event) {
	if (event.eventName) {
		return event.eventName
	}

	if (event.eventSignature) {
		return event.eventSignature.split('(')[0]
	}

	if (event.type) {
		return event.type
	}

	return 'Unknown Event'
}

/**
 * Get event signature without parameters
 * @param {string} signature - Full event signature
 * @returns {string} Event name only
 */
export function getEventName(signature) {
	if (!signature) return 'Unknown'
	return signature.split('(')[0]
}
