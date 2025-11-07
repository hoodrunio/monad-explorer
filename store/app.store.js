import { useModalsStore } from "./modals.store"
import { fetchGasHistoryAnalytics } from "@/services/api/analytics"

export const useAppStore = defineStore("app", () => {
	const version = ref()

	const modalsStore = useModalsStore()

	const network = ref()

	const head = ref()
	const gas = ref({
		fast: 0,
		median: 0,
		slow: 0,
	})
	const currentPrice = ref({
		time: "",
		open: "0",
		high: "0",
		low: "0",
		close: "0",
	})

	// Price fetching
	let priceInterval = null

	const updatePrice = async () => {
		try {
			// Use market data endpoint to get current price
			const marketData = await fetchGasHistoryAnalytics({})
			console.log("Market API Response:", marketData)

			if (marketData?.success && marketData?.data?.data?.length > 0) {
				// Get the most recent price (first item in array)
				const latestData = marketData.data.data[0]

				// Map to currentPrice structure
				currentPrice.value = {
					time: latestData.date,
					open: latestData.closingPrice || "0",
					high: latestData.closingPrice || "0",
					low: latestData.closingPrice || "0",
					close: latestData.closingPrice || "0"
				}
				console.log("Price updated in store:", currentPrice.value)
			}
		} catch (error) {
			console.error("Failed to fetch price:", error)
		}
	}

	const startPriceFetching = () => {
		// Fetch immediately
		updatePrice()

		// Then fetch every 60 seconds
		if (!priceInterval) {
			priceInterval = setInterval(() => {
				updatePrice()
			}, 60000) // 60 seconds
		}
	}

	const stopPriceFetching = () => {
		if (priceInterval) {
			clearInterval(priceInterval)
			priceInterval = null
		}
	}

	const wallet = ref("")
	const address = ref("")
	const balance = ref(0)
	const isConnected = ref(false)

	const latestBlocks = ref([])
	const lastBlock = computed(() => latestBlocks.value[0])
	const lastHead = ref({})
	const isLatestBlocksLoaded = ref(false)
	const isPaused = ref(false)

	const showCmd = ref(false)
	const cmdAction = ref()

	const showSidebar = ref(false)

	const theme = ref("")

	const confirmation = ref(null)
	const createConfirmation = (metadata) => {
		confirmation.value = metadata

		modalsStore.open("confirmation")
	}

	return {
		version,
		network,
		head,
		gas,
		currentPrice,
		updatePrice,
		startPriceFetching,
		stopPriceFetching,
		wallet,
		address,
		balance,
		isConnected,
		latestBlocks,
		lastBlock,
		lastHead,
		isPaused,
		isLatestBlocksLoaded,
		showCmd,
		cmdAction,
		showSidebar,
		theme,
		confirmation,
		createConfirmation,
	}
})
