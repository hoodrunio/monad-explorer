/** Vendor */
import { ref, computed } from "vue"

/**
 * Composable for event pagination
 * Manages page state and navigation for paginated event lists
 *
 * @param {Object} props - Component props
 * @param {number} itemsPerPage - Number of items per page
 * @returns {Object} Pagination state and methods
 */
export function useEventPagination(props, itemsPerPage = 10) {
	/**
	 * Current page number (1-indexed)
	 */
	const page = ref(1)

	/**
	 * Calculate total number of pages
	 */
	const pages = computed(() => {
		if (props.block) {
			// For EVM blocks, use totalCount from events
			const eventsCount = props.tx?.decodedLogs?.length || 0
			return Math.ceil(eventsCount / itemsPerPage)
		} else if (props.tx) {
			// For EVM transactions, use decodedLogs length
			const eventsCount = props.tx.decodedLogs?.length || 0
			return Math.ceil(eventsCount / itemsPerPage)
		}
		return 1
	})

	/**
	 * Navigate to next page
	 */
	const handleNext = () => {
		if (page.value === pages.value) return
		page.value += 1
	}

	/**
	 * Navigate to previous page
	 */
	const handlePrev = () => {
		if (page.value === 1) return
		page.value -= 1
	}

	/**
	 * Navigate to first page
	 */
	const handleFirst = () => {
		page.value = 1
	}

	/**
	 * Navigate to last page
	 */
	const handleLast = () => {
		page.value = pages.value
	}

	/**
	 * Go to specific page
	 * @param {number} pageNumber - Target page number
	 */
	const goToPage = (pageNumber) => {
		if (pageNumber < 1 || pageNumber > pages.value) return
		page.value = pageNumber
	}

	return {
		page,
		pages,
		handleNext,
		handlePrev,
		handleFirst,
		handleLast,
		goToPage,
	}
}
