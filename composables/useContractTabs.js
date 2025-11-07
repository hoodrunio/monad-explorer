/**
 * Contract Tabs Composable
 *
 * Manages tab state and navigation for contract detail view
 * Tabs: Source | ABI | Bytecode | Read | Write
 */
import { ref, computed } from "vue"

export const CONTRACT_TABS = {
	SOURCE: "source",
	ABI: "abi",
	BYTECODE: "bytecode",
	READ: "read",
	WRITE: "write",
}

export const TAB_CONFIG = [
	{
		id: CONTRACT_TABS.SOURCE,
		label: "Source Code",
		icon: "code",
		requiresVerification: true,
	},
	{
		id: CONTRACT_TABS.ABI,
		label: "Contract ABI",
		icon: "brackets",
		requiresVerification: false,
	},
	{
		id: CONTRACT_TABS.BYTECODE,
		label: "Bytecode",
		icon: "binary",
		requiresVerification: false,
	},
	{
		id: CONTRACT_TABS.READ,
		label: "Read Contract",
		icon: "eye",
		requiresVerification: true,
	},
	{
		id: CONTRACT_TABS.WRITE,
		label: "Write Contract",
		icon: "edit",
		requiresVerification: true,
	},
]

/**
 * Main composable for managing contract tabs
 *
 * @param {Object} options - Configuration options
 * @param {string} options.defaultTab - Default active tab
 * @param {boolean} options.isVerified - Whether the contract is verified
 * @returns {Object} - Tab state and methods
 */
export function useContractTabs(options = {}) {
	const { defaultTab = CONTRACT_TABS.SOURCE, isVerified = false } = options

	const activeTab = ref(defaultTab)

	/**
	 * Get available tabs based on verification status
	 */
	const availableTabs = computed(() => {
		if (isVerified) {
			return TAB_CONFIG
		}
		// If not verified, only show tabs that don't require verification
		return TAB_CONFIG.filter((tab) => !tab.requiresVerification)
	})

	/**
	 * Check if a tab is active
	 */
	const isTabActive = (tabId) => {
		return activeTab.value === tabId
	}

	/**
	 * Change active tab
	 */
	const setActiveTab = (tabId) => {
		const tab = TAB_CONFIG.find((t) => t.id === tabId)

		// Don't allow switching to tabs that require verification if not verified
		if (tab && !isVerified && tab.requiresVerification) {
			return false
		}

		activeTab.value = tabId
		return true
	}

	/**
	 * Get tab configuration by ID
	 */
	const getTabConfig = (tabId) => {
		return TAB_CONFIG.find((t) => t.id === tabId)
	}

	/**
	 * Check if a tab is available
	 */
	const isTabAvailable = (tabId) => {
		const tab = getTabConfig(tabId)
		if (!tab) return false

		if (tab.requiresVerification && !isVerified) {
			return false
		}

		return true
	}

	/**
	 * Get next available tab
	 */
	const getNextTab = () => {
		const currentIndex = TAB_CONFIG.findIndex((t) => t.id === activeTab.value)
		const nextIndex = (currentIndex + 1) % TAB_CONFIG.length
		const nextTab = TAB_CONFIG[nextIndex]

		if (isTabAvailable(nextTab.id)) {
			return nextTab.id
		}

		return activeTab.value
	}

	/**
	 * Get previous available tab
	 */
	const getPreviousTab = () => {
		const currentIndex = TAB_CONFIG.findIndex((t) => t.id === activeTab.value)
		const prevIndex = currentIndex === 0 ? TAB_CONFIG.length - 1 : currentIndex - 1
		const prevTab = TAB_CONFIG[prevIndex]

		if (isTabAvailable(prevTab.id)) {
			return prevTab.id
		}

		return activeTab.value
	}

	/**
	 * Navigate to next tab
	 */
	const goToNextTab = () => {
		const nextTab = getNextTab()
		setActiveTab(nextTab)
	}

	/**
	 * Navigate to previous tab
	 */
	const goToPreviousTab = () => {
		const prevTab = getPreviousTab()
		setActiveTab(prevTab)
	}

	return {
		activeTab,
		availableTabs,
		isTabActive,
		setActiveTab,
		getTabConfig,
		isTabAvailable,
		getNextTab,
		getPreviousTab,
		goToNextTab,
		goToPreviousTab,
		CONTRACT_TABS,
	}
}
