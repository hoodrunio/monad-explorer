/** Vendor */
import { ref } from "vue"

/** Store */
import { useModalsStore } from "@/store/modals.store"
import { useCacheStore } from "@/store/cache.store"

/**
 * Composable for event-related user actions
 * Handles viewing raw events, expanding/collapsing, and clipboard operations
 */
export function useEventActions() {
	const modalsStore = useModalsStore()
	const cacheStore = useCacheStore()

	/**
	 * Currently expanded event index
	 */
	const expandedEventIndex = ref(null)

	/**
	 * Open raw data modal for an event
	 * @param {Object} event - Event object to display
	 */
	const handleViewRawEvent = (event) => {
		cacheStore.current._target = "event"
		cacheStore.current.event = event
		modalsStore.open("rawData")
	}

	/**
	 * Toggle event expansion state
	 * @param {number} index - Event index
	 */
	const toggleEventExpanded = (index) => {
		if (expandedEventIndex.value === index) {
			expandedEventIndex.value = null
		} else {
			expandedEventIndex.value = index
		}
	}

	/**
	 * Copy text to clipboard
	 * @param {string} text - Text to copy
	 * @returns {Promise<void>}
	 */
	const copyToClipboard = async (text) => {
		try {
			await navigator.clipboard.writeText(text)
		} catch (err) {
			console.error('Failed to copy:', err)
		}
	}

	/**
	 * Reset expansion state (useful when changing pages)
	 */
	const resetExpansion = () => {
		expandedEventIndex.value = null
	}

	return {
		expandedEventIndex,
		handleViewRawEvent,
		toggleEventExpanded,
		copyToClipboard,
		resetExpansion,
	}
}
