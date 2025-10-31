/**
 * Vendor
 */
import { ref, computed } from "vue"
import { defineStore, acceptHMRUpdate } from "pinia"

export const useVerificationStore = defineStore("verification", () => {
	// Form state
	const verificationMethod = ref('solidity-multi-part') // 'solidity-multi-part', 'solidity-standard-json', 'vyper-multi-part', 'vyper-standard-json', 'sourcify'
	const contractAddress = ref('')
	const compilerVersion = ref('')
	const evmVersion = ref('cancun')
	const optimizationEnabled = ref(true)
	const optimizationRuns = ref(200)
	const licenseType = ref('none')
	const autodetectConstructorArgs = ref(true)
	const sourceFiles = ref({})
	const libraries = ref({})
	const constructorArguments = ref('')
	const standardJsonInput = ref('')

	// Vyper specific
	const interfaces = ref({})

	// UI state
	const isVerifying = ref(false)
	const isPolling = ref(false)
	const pollingAttempt = ref(0)
	const verificationResult = ref(null)
	const verificationError = ref(null)
	const currentStep = ref(1) // Multi-step form: 1 = Method, 2 = Compiler, 3 = Settings, 4 = Source Code, 5 = Submit

	// Verification config cache
	const verificationConfig = ref(null)
	const configLoading = ref(false)

	// Verification history (stored in localStorage)
	const verificationHistory = ref([])

	// Computed
	const missingFields = computed(() => {
		const missing = []

		// Basic validation
		if (!contractAddress.value) missing.push('Contract Address')
		if (!compilerVersion.value) missing.push('Compiler Version')
		if (!licenseType.value) missing.push('License Type')

		// Method-specific validation
		if (verificationMethod.value === 'solidity-flattened' ||
		    verificationMethod.value === 'solidity-multi-part' ||
		    verificationMethod.value === 'vyper-flattened' ||
		    verificationMethod.value === 'vyper-multi-part') {
			if (Object.keys(sourceFiles.value).length === 0) {
				missing.push('Source Files')
			}
		}

		if (verificationMethod.value === 'solidity-standard-json' || verificationMethod.value === 'vyper-standard-json') {
			if (!standardJsonInput.value.trim()) {
				missing.push('Standard JSON Input')
			}
		}

		if (verificationMethod.value === 'sourcify') {
			if (Object.keys(sourceFiles.value).length === 0) {
				missing.push('Source Files')
			}
		}

		return missing
	})

	const isFormValid = computed(() => {
		return missingFields.value.length === 0
	})

	const hasVerificationResult = computed(() => {
		return verificationResult.value !== null
	})

	const isVerificationSuccess = computed(() => {
		return verificationResult.value?.status === 'SUCCESS'
	})

	const matchType = computed(() => {
		return verificationResult.value?.source?.matchType || null
	})

	// Actions
	const setVerificationMethod = (method) => {
		verificationMethod.value = method
		// Reset method-specific fields
		resetSourceData()
	}

	const setContractAddress = (address) => {
		contractAddress.value = address
	}

	const setCompilerVersion = (version) => {
		compilerVersion.value = version
	}

	const setLicenseType = (license) => {
		licenseType.value = license
	}

	const setAutodetectConstructorArgs = (autodetect) => {
		autodetectConstructorArgs.value = autodetect
	}

	const setEvmVersion = (version) => {
		evmVersion.value = version
	}

	const setOptimizationEnabled = (enabled) => {
		optimizationEnabled.value = enabled
		if (!enabled) {
			optimizationRuns.value = null
		} else if (optimizationRuns.value === null) {
			optimizationRuns.value = 200
		}
	}

	const setOptimizationRuns = (runs) => {
		optimizationRuns.value = runs
	}

	const addSourceFile = (filename, content) => {
		sourceFiles.value = {
			...sourceFiles.value,
			[filename]: content
		}
	}

	const removeSourceFile = (filename) => {
		const newFiles = { ...sourceFiles.value }
		delete newFiles[filename]
		sourceFiles.value = newFiles
	}

	const updateSourceFile = (filename, content) => {
		if (sourceFiles.value[filename] !== undefined) {
			sourceFiles.value = {
				...sourceFiles.value,
				[filename]: content
			}
		}
	}

	const addLibrary = (name, address) => {
		libraries.value = {
			...libraries.value,
			[name]: address
		}
	}

	const removeLibrary = (name) => {
		const newLibraries = { ...libraries.value }
		delete newLibraries[name]
		libraries.value = newLibraries
	}

	const setConstructorArguments = (args) => {
		constructorArguments.value = args
	}

	const setStandardJsonInput = (input) => {
		standardJsonInput.value = input
	}

	const addInterface = (name, content) => {
		interfaces.value = {
			...interfaces.value,
			[name]: content
		}
	}

	const removeInterface = (name) => {
		const newInterfaces = { ...interfaces.value }
		delete newInterfaces[name]
		interfaces.value = newInterfaces
	}

	const setCurrentStep = (step) => {
		currentStep.value = step
	}

	const nextStep = () => {
		if (currentStep.value < 5) {
			currentStep.value++
		}
	}

	const previousStep = () => {
		if (currentStep.value > 1) {
			currentStep.value--
		}
	}

	const setVerificationConfig = (config) => {
		verificationConfig.value = config
	}

	const setConfigLoading = (loading) => {
		configLoading.value = loading
	}

	const startVerification = () => {
		isVerifying.value = true
		isPolling.value = false
		pollingAttempt.value = 0
		verificationResult.value = null
		verificationError.value = null
	}

	const startPolling = () => {
		isPolling.value = true
		pollingAttempt.value = 0
	}

	const updatePollingAttempt = (attempt) => {
		pollingAttempt.value = attempt
	}

	const stopPolling = () => {
		isPolling.value = false
	}

	const setVerificationResult = (result) => {
		verificationResult.value = result
		isVerifying.value = false
		isPolling.value = false

		// Add to history
		if (result) {
			addToHistory({
				address: contractAddress.value,
				method: verificationMethod.value,
				compilerVersion: compilerVersion.value,
				status: result.status,
				matchType: result.source?.matchType,
				timestamp: new Date().toISOString(),
				result: result
			})
		}
	}

	const setVerificationError = (error) => {
		verificationError.value = error
		isVerifying.value = false
		isPolling.value = false
	}

	const clearVerificationResult = () => {
		verificationResult.value = null
		verificationError.value = null
	}

	const resetForm = () => {
		contractAddress.value = ''
		compilerVersion.value = ''
		evmVersion.value = 'cancun'
		optimizationEnabled.value = true
		optimizationRuns.value = 200
		licenseType.value = 'none'
		autodetectConstructorArgs.value = true
		resetSourceData()
		currentStep.value = 1
		clearVerificationResult()
	}

	const resetSourceData = () => {
		sourceFiles.value = {}
		libraries.value = {}
		interfaces.value = {}
		constructorArguments.value = ''
		standardJsonInput.value = ''
	}

	const addToHistory = (entry) => {
		// Add to beginning of array
		verificationHistory.value = [entry, ...verificationHistory.value]

		// Keep only last 50 entries
		if (verificationHistory.value.length > 50) {
			verificationHistory.value = verificationHistory.value.slice(0, 50)
		}

		// Save to localStorage
		saveHistoryToLocalStorage()
	}

	const loadHistoryFromLocalStorage = () => {
		if (typeof window !== 'undefined') {
			try {
				const stored = localStorage.getItem('verification-history')
				if (stored) {
					verificationHistory.value = JSON.parse(stored)
				}
			} catch (error) {
				console.error('Failed to load verification history from localStorage:', error)
			}
		}
	}

	const saveHistoryToLocalStorage = () => {
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('verification-history', JSON.stringify(verificationHistory.value))
			} catch (error) {
				console.error('Failed to save verification history to localStorage:', error)
			}
		}
	}

	const clearHistory = () => {
		verificationHistory.value = []
		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem('verification-history')
			} catch (error) {
				console.error('Failed to clear verification history from localStorage:', error)
			}
		}
	}

	const getHistoryByAddress = (address) => {
		return verificationHistory.value.filter(entry =>
			entry.address.toLowerCase() === address.toLowerCase()
		)
	}

	// Load history on store initialization
	loadHistoryFromLocalStorage()

	return {
		// State
		verificationMethod,
		contractAddress,
		compilerVersion,
		evmVersion,
		optimizationEnabled,
		optimizationRuns,
		licenseType,
		autodetectConstructorArgs,
		sourceFiles,
		libraries,
		interfaces,
		constructorArguments,
		standardJsonInput,
		isVerifying,
		isPolling,
		pollingAttempt,
		verificationResult,
		verificationError,
		currentStep,
		verificationConfig,
		configLoading,
		verificationHistory,

		// Computed
		isFormValid,
		missingFields,
		hasVerificationResult,
		isVerificationSuccess,
		matchType,

		// Actions
		setVerificationMethod,
		setContractAddress,
		setCompilerVersion,
		setEvmVersion,
		setLicenseType,
		setAutodetectConstructorArgs,
		setOptimizationEnabled,
		setOptimizationRuns,
		addSourceFile,
		removeSourceFile,
		updateSourceFile,
		addLibrary,
		removeLibrary,
		setConstructorArguments,
		setStandardJsonInput,
		addInterface,
		removeInterface,
		setCurrentStep,
		nextStep,
		previousStep,
		setVerificationConfig,
		setConfigLoading,
		startVerification,
		startPolling,
		updatePollingAttempt,
		stopPolling,
		setVerificationResult,
		setVerificationError,
		clearVerificationResult,
		resetForm,
		resetSourceData,
		addToHistory,
		loadHistoryFromLocalStorage,
		saveHistoryToLocalStorage,
		clearHistory,
		getHistoryByAddress
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useVerificationStore, import.meta.hot))
}
