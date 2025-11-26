<script setup>
/** UI */
import BookmarkButton from "@/components/BookmarkButton.vue"
import Button from "@/components/ui/Button.vue"
import Checkbox from "@/components/ui/Checkbox.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"
import Input from "@/components/ui/Input.vue"
import Popover from "@/components/ui/Popover.vue"

/** Components */
import TransactionsTable from "./tables/TransactionsTable.vue"
import NFTGrid from "@/components/modules/nfts/NFTGrid.vue"
import TokenTransfersTable from "@/components/modules/tokens/TokenTransfersTable.vue"

/** Services */
import { comma, splitAddress } from "@/services/utils"

/** API */
import {
	fetchAddressTransactionsClient,
	fetchAddressBalanceClient,
	fetchAddressStatsClient,
	fetchAddressTokenTransfersClient,
} from "@/services/api/address"
import { fetchAddressNFTsClient } from "@/services/api/nfts"

/** Store */
import { useCacheStore } from "@/store/cache.store"
import { useEnumStore } from "@/store/enums.store"
import { useModalsStore } from "@/store/modals.store"
const cacheStore = useCacheStore()
const enumStore = useEnumStore()
const modalsStore = useModalsStore()

const route = useRoute()
const router = useRouter()

const props = defineProps({
	address: {
		type: Object,
		required: true,
	},
})

// Make address available in template
const address = computed(() => props.address)

const isRefetching = ref(false)
const transactions = ref([])
const addressBalance = ref(null)
const addressStats = ref(null)
const isLoadingBalance = ref(false)
const isLoadingStats = ref(false)

/** Tabs */
const tabs = ref([
	{
		alias: "transactions",
		displayName: "Transactions",
		icon: "tx",
		show: true,
	},
	{
		alias: "tokens",
		displayName: "Token Transfers",
		icon: "token",
		show: true,
	},
	{
		alias: "nfts",
		displayName: "NFTs",
		icon: "nft",
		show: true,
	},
])

/** Token Transfers State */
const tokenTransfers = ref([])
const tokenTransfersNextParams = ref(null)
const tokenTransfersPrevPages = ref([])

/** NFTs State */
const nfts = ref([])
const nftsNextParams = ref(null)
const nftsPrevPages = ref([])

const preselectedTab =
	route.query.tab && tabs.value.map((tab) => tab.alias).includes(route.query.tab) ? route.query.tab : tabs.value[0].alias
const activeTab = ref(preselectedTab)

const tabsEl = ref(null)

const handleSelect = (tab) => {
	if (activeTab.value !== tab) {
		activeTab.value = tab

		let tabCenter = 0
		for (let i = 0; i < tabsEl.value.wrapper.children.length; i++) {
			if (tabsEl.value.wrapper.children[i].dataset.tab === tab) {
				tabCenter = tabsEl.value.wrapper.children[i].offsetLeft + tabsEl.value.wrapper.children[i].offsetWidth / 2
				break
			}
		}

		if (tabCenter) {
			let wrapperCenter = tabsEl.value.wrapper.offsetLeft + tabsEl.value.wrapper.offsetWidth / 2

			tabsEl.value.wrapper.scroll({ left: tabCenter - wrapperCenter })
		}
	}
}

/** Pagination - Cursor-based */
const nextPageParams = ref(null)
const previousPages = ref([])
const handleNext = () => {
	if (!nextPageParams.value) return

	// Save current state before moving forward
	previousPages.value.push({
		transactions: [...transactions.value],
		params: nextPageParams.value
	})

	getTransactions(nextPageParams.value)
}
const handlePrev = () => {
	if (previousPages.value.length === 0) return

	const previousState = previousPages.value.pop()
	transactions.value = previousState.transactions
	nextPageParams.value = previousState.params
}

/** Sorting */
const sort = reactive({
	by: "time",
	dir: "desc",
})

const onSort = (by) => {
	switch (sort.dir) {
		case "desc":
			if (sort.by == by) sort.dir = "asc"
			break

		case "asc":
			sort.dir = "desc"

			break
	}

	sort.by = by

	getTransactions()
}

/** Filters */
const transactionTypes = computed(() => enumStore.enums.transaction_types || [])

const filters = reactive({
	status: {
		success: false,
		failed: false,
	},
	transaction_types: transactionTypes.value?.reduce((a, b) => ({ ...a, [b]: false }), {}),
})
const hasActiveFilters = computed(() => {
	let has = false

	Object.keys(filters.status).forEach((s) => {
		if (filters.status[s]) has = true
	})
	Object.keys(filters.transaction_types).forEach((t) => {
		if (filters.transaction_types[t]) has = true
	})

	return has
})
const savedFiltersBeforeChanges = ref(null)

const handleClearAllFilters = () => {
	Object.keys(filters.status).forEach((f) => {
		filters.status[f] = false
	})

	Object.keys(filters.transaction_types).forEach((f) => {
		filters.transaction_types[f] = false
	})

	router.replace({
		query: null,
	})

	getTransactions()
}

const searchTerm = ref("")

onMounted(() => {
	router.replace({
		query: {
			tab: activeTab.value,
		},
	})
})

/** Parse route query */
Object.keys(route.query).forEach((key) => {
	if (key === "page" || key === "tab") return

	if (route.query[key].split(",").length) {
		route.query[key].split(",").forEach((item) => {
			filters[key][item] = true
		})
	} else {
		filters[key][route.query[key]] = true
	}
})

const updateRouteQuery = () => {
	router.replace({
		query: {
			status:
				Object.keys(filters.status).find((f) => filters.status[f]) &&
				Object.keys(filters.status)
					.filter((f) => filters.status[f])
					.join(","),
			transaction_types:
				Object.keys(filters.transaction_types).find((f) => filters.transaction_types[f]) &&
				Object.keys(filters.transaction_types)
					.filter((f) => filters.transaction_types[f])
					.join(","),
		},
	})
}

const isStatusPopoverOpen = ref(false)
const handleOpenStatusPopover = () => {
	isStatusPopoverOpen.value = true

	if (Object.keys(filters.status).find((f) => filters.status[f])) {
		savedFiltersBeforeChanges.value = { ...filters.status }
	}
}
const onStatusPopoverClose = () => {
	isStatusPopoverOpen.value = false

	if (savedFiltersBeforeChanges.value) {
		filters.status = savedFiltersBeforeChanges.value
		savedFiltersBeforeChanges.value = null
	} else {
		resetFilters("status")
	}
}
const handleApplyStatusFilters = () => {
	savedFiltersBeforeChanges.value = null
	isStatusPopoverOpen.value = false

	getTransactions()

	updateRouteQuery()
}

const isMessageTypePopoverOpen = ref(false)
const handleOpenMessageTypePopover = () => {
	isMessageTypePopoverOpen.value = true

	if (Object.keys(filters.transaction_types).find((f) => filters.transaction_types[f])) {
		savedFiltersBeforeChanges.value = { ...filters.transaction_types }
	}
}
const onMessageTypePopoverClose = () => {
	isMessageTypePopoverOpen.value = false

	searchTerm.value = ""

	if (savedFiltersBeforeChanges.value) {
		filters.transaction_types = savedFiltersBeforeChanges.value
		savedFiltersBeforeChanges.value = null
	} else {
		resetFilters("transaction_types")
	}
}
const handleApplyMessageTypeFilters = () => {
	savedFiltersBeforeChanges.value = null
	isMessageTypePopoverOpen.value = false

	getTransactions()

	updateRouteQuery()
}

const resetFilters = (target, refetch) => {
	Object.keys(filters[target]).forEach((f) => {
		filters[target][f] = false
	})

	if (refetch) {
		updateRouteQuery()

		getTransactions()
	}
}

const getTransactions = async (params = null) => {
	isRefetching.value = true

	try {
		// Use provided params or default to initial load
		const queryParams = params || { items_count: 10 }

		const { data } = await fetchAddressTransactionsClient(props.address.hash, queryParams)

		// New Indexer API returns { items: [], next_page_params: {} }
		if (data.value?.items) {
			let txs = data.value.items

			// Apply status filters
			if (Object.keys(filters.status).find((f) => filters.status[f])) {
				const activeStatuses = Object.keys(filters.status).filter((f) => filters.status[f])
				txs = txs.filter((tx) => {
					const status = tx.status === "ok" ? "success" : "failed"
					return activeStatuses.includes(status)
				})
			}

			// Apply transaction type filters (using API's transaction_types array)
			if (Object.keys(filters.transaction_types).find((f) => filters.transaction_types[f])) {
				const activeTypes = Object.keys(filters.transaction_types).filter((f) => filters.transaction_types[f])
				txs = txs.filter((tx) => {
					// Check if any of the tx's transaction_types match active filters
					return tx.transaction_types?.some(type => activeTypes.includes(type))
				})
			}

			transactions.value = txs.map(tx => ({
				...tx,
				// Map new Indexer API fields to expected format
				status: tx.status === "ok" ? "success" : "failed",
				gas_used: tx.gas_used || tx.gasUsed,
				gas_wanted: tx.gas_limit || tx.gas,
				fee: tx.fee || tx.transactionFee || "0",
				// Ensure transaction_types is always an array with at least one item
				transaction_types: (tx.transaction_types && tx.transaction_types.length > 0)
					? tx.transaction_types
					: ['unknown'],
				time: tx.timestamp,
				height: tx.block_number || tx.blockNumber,
			}))

			// Update cursor pagination state
			nextPageParams.value = data.value.next_page_params || null
		} else {
			transactions.value = []
			nextPageParams.value = null
		}

		cacheStore.current.transactions = transactions.value
	} catch (error) {
		transactions.value = []
		nextPageParams.value = null
	}

	isRefetching.value = false
}

const collapseBalances = ref(false)

/** Token Transfers fetch function */
const getTokenTransfers = async (params = null) => {
	isRefetching.value = true

	try {
		const queryParams = params || { items_count: 10 }
		const { data } = await fetchAddressTokenTransfersClient(props.address.hash, queryParams)

		if (data.value?.items) {
			tokenTransfers.value = data.value.items
			tokenTransfersNextParams.value = data.value.next_page_params || null
		} else {
			tokenTransfers.value = []
			tokenTransfersNextParams.value = null
		}
	} catch (error) {
		tokenTransfers.value = []
		tokenTransfersNextParams.value = null
	}

	isRefetching.value = false
}

/** NFTs fetch function */
const getNFTs = async (params = null) => {
	isRefetching.value = true

	try {
		const queryParams = params || { items_count: 12 }
		const { data } = await fetchAddressNFTsClient(props.address.hash, queryParams)

		if (data.value?.items) {
			nfts.value = data.value.items
			nftsNextParams.value = data.value.next_page_params || null
		} else {
			nfts.value = []
			nftsNextParams.value = null
		}
	} catch (error) {
		nfts.value = []
		nftsNextParams.value = null
	}

	isRefetching.value = false
}

/** Token Transfers Pagination */
const handleTokenTransfersNext = () => {
	if (!tokenTransfersNextParams.value) return

	tokenTransfersPrevPages.value.push({
		data: [...tokenTransfers.value],
		params: tokenTransfersNextParams.value
	})

	getTokenTransfers(tokenTransfersNextParams.value)
}

const handleTokenTransfersPrev = () => {
	if (tokenTransfersPrevPages.value.length === 0) return

	const previousState = tokenTransfersPrevPages.value.pop()
	tokenTransfers.value = previousState.data
	tokenTransfersNextParams.value = previousState.params
}

/** NFTs Pagination */
const handleNFTsNext = () => {
	if (!nftsNextParams.value) return

	nftsPrevPages.value.push({
		data: [...nfts.value],
		params: nftsNextParams.value
	})

	getNFTs(nftsNextParams.value)
}

const handleNFTsPrev = () => {
	if (nftsPrevPages.value.length === 0) return

	const previousState = nftsPrevPages.value.pop()
	nfts.value = previousState.data
	nftsNextParams.value = previousState.params
}

/** Address Balance & Stats */
const getAddressBalance = async () => {
	isLoadingBalance.value = true
	try {
		const { data } = await fetchAddressBalanceClient(props.address.hash, {
			includeNative: true,
			includeMetadata: true,
		})
		addressBalance.value = data.value?.data || null
	} catch (error) {
		addressBalance.value = null
	}
	isLoadingBalance.value = false
}

const getAddressStats = async () => {
	isLoadingStats.value = true
	try {
		const { data } = await fetchAddressStatsClient(props.address.hash)
		// New Indexer API returns counters directly at root level
		addressStats.value = data.value || null
	} catch (error) {
		addressStats.value = null
	}
	isLoadingStats.value = false
}

// Computed properties for display
const nativeBalance = computed(() => {
	if (!addressBalance.value?.nativeBalance) return "0"
	// Convert wei to MON (divide by 10^18)
	const monValue = parseInt(addressBalance.value.nativeBalance) / Math.pow(10, 18)
	return monValue.toFixed(6)
})

const totalTransactions = computed(() => {
	// New Indexer API uses transactions_count instead of transactionCount.total
	return addressStats.value?.transactions_count || 0
})

const isActive = computed(() => {
	// Determine activity based on transaction count
	return (addressStats.value?.transactions_count || 0) > 0
})

/** Watchers */
watch(
	() => props.address.hash,
	async () => {
		// Reset state when address changes
		nextPageParams.value = null
		previousPages.value = []
		transactions.value = []

		// Reload data for new address
		await Promise.all([
			getTransactions(),
			getAddressBalance(),
			getAddressStats(),
		])
	}
)

watch(
	activeTab,
	async () => {
		// Reset cursor pagination state
		nextPageParams.value = null
		previousPages.value = []
		tokenTransfersNextParams.value = null
		tokenTransfersPrevPages.value = []
		nftsNextParams.value = null
		nftsPrevPages.value = []

		router.replace({
			query: {
				tab: activeTab.value,
			},
		})

		if (activeTab.value === "transactions") {
			await getTransactions()
		} else if (activeTab.value === "tokens") {
			await getTokenTransfers()
		} else if (activeTab.value === "nfts") {
			await getNFTs()
		}
	},
	{ immediate: true },
)

// Load balance and stats on component mount
onMounted(async () => {
	await Promise.all([
		getAddressBalance(),
		getAddressStats(),
	])
})

// Removed page watcher - using cursor pagination now

// Modal handlers
const handleSend = () => {
	// TODO: Implement send modal when available
	// modalsStore.open("send")
}

const handleOpenQRModal = () => {
	// Set QR data in cache store
	cacheStore.qr.data = address.value.hash
	cacheStore.qr.description = "Address"
	cacheStore.qr.icon = "address"
	
	// Open QR modal
	modalsStore.open("qr")
}

const handleViewRawAddress = () => {
	// Set raw data in cache store
	cacheStore.current.address = address.value
	cacheStore.current._target = "address"
	
	// Open raw data modal
	modalsStore.open("rawData")
}
</script>

<template>
	<Flex direction="column" gap="4" wide>
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="address" size="14" color="primary" />
				<Text as="h1" size="13" weight="600" color="primary">
					Address <Text color="secondary">{{ splitAddress(address.hash) }}</Text>
				</Text>
				<CopyButton :text="address.hash" size="12" />
			</Flex>

			<Flex align="center" gap="12">
				<Flex align="center" gap="8">
					<Button @click="handleSend" type="secondary" size="mini">
						<Icon name="arrow-circle-broken-right" size="12" color="primary" />
						Send
					</Button>

					<BookmarkButton type="address" :id="address.hash" />
				</Flex>

				<div class="divider_v"></div>

				<Dropdown>
					<Button type="secondary" size="mini">
						<Icon name="dots" size="16" color="primary" />
					</Button>

					<template #popup>
						<DropdownItem @click="handleOpenQRModal">
							<Flex align="center" gap="8">
								<Icon name="qr" size="12" color="secondary" />
								Get QR Code
							</Flex>
						</DropdownItem>
						<DropdownItem @click="handleViewRawAddress">
							<Flex align="center" gap="8">
								<Icon name="address" size="12" color="secondary" />
								View Raw Address
							</Flex>
						</DropdownItem>
					</template>
				</Dropdown>
			</Flex>
		</Flex>

		<Flex gap="16" :class="$style.content">
			<Flex direction="column" justify="between" gap="32" :class="$style.data">
				<Flex direction="column" gap="24" :class="$style.main">
					<Flex v-if="address.celestials" align="center" gap="12" :class="$style.key_value">
						<Flex v-if="address.celestials?.image_url" align="center" justify="center" :class="$style.avatar_container">
							<img :src="address.celestials?.image_url" :class="$style.avatar_image" />
						</Flex>

						<Flex direction="column" gap="8" :class="$style.key_value">
							<Text size="14" weight="600" color="secondary"> Address </Text>

							<Flex align="center" gap="10">
								<Text size="12" weight="600" color="secondary"> {{ splitAddress(address.hash) }} </Text>

								<CopyButton :text="address.hash" />
							</Flex>
						</Flex>
					</Flex>
					<Flex v-else direction="column" gap="8" :class="$style.key_value">
						<Text size="12" weight="600" color="tertiary"> Address </Text>
						<Text size="12" weight="600" color="secondary"> {{ splitAddress(address.hash) }} </Text>
					</Flex>

					<Flex direction="column" gap="16">
						<Flex @click="collapseBalances = !collapseBalances" align="center" justify="between" style="cursor: pointer">
							<Text size="12" weight="600" color="secondary">Balance</Text>
							<Icon
								name="chevron"
								size="14"
								color="secondary"
								:style="{
									transform: `rotate(${collapseBalances ? '0' : '180'}deg)`,
									transition: 'all 400ms ease',
								}"
							/>
						</Flex>

						<Flex v-if="!collapseBalances" direction="column" gap="12" :class="$style.key_value">
							<Flex align="center" justify="between">
								<Text size="12" weight="600" color="tertiary"> Native Balance</Text>
								<Text size="12" weight="600" color="secondary">{{ nativeBalance }} MON</Text>
							</Flex>
						</Flex>
					</Flex>

					<Flex direction="column" gap="16">
						<Text size="12" weight="600" color="secondary">Details</Text>

						<!-- NOTE: First/Last Activity dates removed - not available in new Indexer API -->

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary"> Total Transactions</Text>
							<Text size="12" weight="600" color="secondary"> {{ comma(totalTransactions) }} </Text>
						</Flex>
					</Flex>
				</Flex>
			</Flex>

			<Flex direction="column" gap="4" wide :class="$style.txs_wrapper">
				<Flex align="center" gap="4" :class="$style.tabs_wrapper" ref="tabsEl">
					<template v-for="tab in tabs">
						<Flex
							v-if="tab.show"
							:data-tab="tab.alias"
							@click="handleSelect(tab.alias)"
							align="center"
							gap="6"
							:class="[$style.tab, activeTab === tab.alias && $style.active]"
							:style="{ transition: 'all 200ms ease' }"
						>
							<Icon :name="tab.icon" size="12" color="secondary" />

							<Text size="13" weight="600">{{ tab.displayName }}</Text>
						</Flex>
					</template>
				</Flex>

				<Flex direction="column" justify="center" :class="[$style.tables, isRefetching && $style.disabled]">
					<Flex v-if="activeTab === 'transactions'" wrap="wrap" align="center" gap="8" :class="$style.filters">
						<Popover :open="isStatusPopoverOpen" @on-close="onStatusPopoverClose" width="200">
							<Button
								@click="handleOpenStatusPopover"
								type="secondary"
								size="mini"
								:disabled="!transactions.length && !hasActiveFilters"
							>
								<Icon name="plus-circle" size="12" color="tertiary" />
								<Text color="secondary">Status</Text>

								<template v-if="Object.keys(filters.status).find((f) => filters.status[f])">
									<div :class="$style.vertical_divider" />

									<Text size="12" weight="600" color="primary" style="text-transform: capitalize">
										{{
											Object.keys(filters.status)
												.filter((f) => filters.status[f])
												.join(", ")
										}}
									</Text>

									<Icon @click.stop="resetFilters('status', true)" name="close-circle" size="12" color="secondary" />
								</template>
							</Button>

							<template #content>
								<Flex direction="column" gap="12">
									<Text size="12" weight="500" color="secondary">Filter by Status</Text>

									<Flex direction="column" gap="8">
										<Checkbox v-model="filters.status.success">
											<Text size="12" weight="500" color="primary">Success</Text>
										</Checkbox>
										<Checkbox v-model="filters.status.failed">
											<Text size="12" weight="500" color="primary">Failed</Text>
										</Checkbox>
									</Flex>

									<Button @click="handleApplyStatusFilters" type="secondary" size="mini" wide>Apply</Button>
								</Flex>
							</template>
						</Popover>

						<Popover :open="isMessageTypePopoverOpen" @on-close="onMessageTypePopoverClose" width="250">
							<Button
								@click="handleOpenMessageTypePopover"
								type="secondary"
								size="mini"
								:disabled="!transactions.length && !hasActiveFilters"
							>
								<Icon name="plus-circle" size="12" color="tertiary" />
								<Text color="secondary">Transaction Type</Text>

								<template v-if="Object.keys(filters.transaction_types).find((f) => filters.transaction_types[f])">
									<div :class="$style.vertical_divider" />

									<Text size="12" weight="600" color="primary">
										{{
											Object.keys(filters.transaction_types).filter((f) => filters.transaction_types[f]).length < 3
												? Object.keys(filters.transaction_types)
														.filter((f) => filters.transaction_types[f])
														.map((f) => f.replace(/_/g, " "))
														.join(", ")
												: `${Object.keys(filters.transaction_types)
														.filter((f) => filters.transaction_types[f])[0]
														.replace(/_/g, " ")} and ${
														Object.keys(filters.transaction_types).filter((f) => filters.transaction_types[f]).length - 1
												  } more`
										}}
									</Text>

									<Icon
										@click.stop="resetFilters('transaction_types', true)"
										name="close-circle"
										size="12"
										color="secondary"
									/>
								</template>
							</Button>

							<template #content>
								<Flex direction="column" gap="12">
									<Text size="12" weight="500" color="secondary">Filter by Transaction Type</Text>

									<Input v-model="searchTerm" size="small" placeholder="Search" autofocus />

									<Flex direction="column" gap="8" :class="$style.transaction_types_list">
										<template
											v-if="
												Object.keys(filters.transaction_types).filter((t) =>
													t.toLowerCase().includes(searchTerm.trim().toLowerCase()),
												).length
											"
										>
											<Checkbox
												v-for="tx_type in Object.keys(filters.transaction_types).filter((t) =>
													t.toLowerCase().includes(searchTerm.trim().toLowerCase()),
												)"
												v-model="filters.transaction_types[tx_type]"
											>
												<Text size="12" weight="500" color="primary">{{ tx_type.replace(/_/g, " ") }}</Text>
											</Checkbox>
										</template>
										<Flex v-else direction="column" gap="8">
											<Text size="12" weight="500" color="tertiary">Nothing was found</Text>
										</Flex>
									</Flex>

									<Button @click="handleApplyMessageTypeFilters" type="secondary" size="mini" wide>Apply</Button>
								</Flex>
							</template>
						</Popover>
					</Flex>

					<Flex :class="$style.table">
						<!-- Loading State -->
						<Flex v-if="isRefetching" direction="column" align="center" justify="center" gap="8" :class="$style.empty">
							<Text size="13" weight="600" color="tertiary">Loading...</Text>
						</Flex>

						<!-- Transactions Table -->
						<template v-else-if="activeTab === 'transactions'">
							<TransactionsTable v-if="transactions.length" :transactions="transactions" :sort="sort" @onSort="onSort" />

							<Flex
								v-else-if="hasActiveFilters && !transactions.length"
								align="center"
								justify="center"
								direction="column"
								gap="20"
								wide
								:class="$style.empty"
							>
								<Icon name="search" size="24" color="support" />

								<Flex direction="column" gap="8">
									<Text size="13" weight="600" color="secondary" align="center"> Nothing was found </Text>
									<Text size="12" weight="500" height="160" color="tertiary" align="center" style="max-width: 220px">
										Clear filters to see all transactions
									</Text>
								</Flex>

								<Button @click="handleClearAllFilters" type="secondary" size="small">Clear all filters</Button>
							</Flex>

							<Flex v-else direction="column" align="center" justify="center" gap="8" :class="$style.empty">
								<Text size="13" weight="600" color="secondary" align="center"> No transactions </Text>
								<Text size="12" weight="500" height="160" color="tertiary" align="center" style="max-width: 220px">
									This address has no transactions
								</Text>
							</Flex>
						</template>

						<!-- Token Transfers Table -->
						<template v-else-if="activeTab === 'tokens'">
							<TokenTransfersTable
								v-if="tokenTransfers.length"
								:transfers="tokenTransfers"
								:tokenDecimals="18"
								tokenSymbol=""
							/>

							<Flex v-else direction="column" align="center" justify="center" gap="8" :class="$style.empty">
								<Icon name="coins" size="24" color="support" />
								<Text size="13" weight="600" color="secondary" align="center"> No token transfers </Text>
								<Text size="12" weight="500" height="160" color="tertiary" align="center" style="max-width: 220px">
									This address has no token transfer activity
								</Text>
							</Flex>
						</template>

						<!-- NFTs Grid -->
						<template v-else-if="activeTab === 'nfts'">
							<NFTGrid v-if="nfts.length" :nfts="nfts" :showCollection="true" />

							<Flex v-else direction="column" align="center" justify="center" gap="8" :class="$style.empty">
								<Icon name="grid" size="24" color="support" />
								<Text size="13" weight="600" color="secondary" align="center"> No NFTs </Text>
								<Text size="12" weight="500" height="160" color="tertiary" align="center" style="max-width: 220px">
									This address does not own any NFTs
								</Text>
							</Flex>
						</template>
					</Flex>

					<!-- Pagination - Transactions -->
					<Flex v-if="activeTab === 'transactions'" align="center" justify="between">
						<Flex align="center" gap="6" :class="$style.pagination">
							<Button type="secondary" @click="handlePrev" size="mini" :disabled="previousPages.length === 0">
								<Icon name="arrow-left" size="12" color="primary" />
							</Button>

							<Button type="secondary" size="mini" disabled>
								<Text size="12" weight="600" color="primary">Page {{ previousPages.length + 1 }}</Text>
							</Button>

							<Button @click="handleNext" type="secondary" size="mini" :disabled="!nextPageParams">
								<Icon name="arrow-right" size="12" color="primary" />
							</Button>
						</Flex>
					</Flex>

					<!-- Pagination - Token Transfers -->
					<Flex v-if="activeTab === 'tokens'" align="center" justify="between">
						<Flex align="center" gap="6" :class="$style.pagination">
							<Button type="secondary" @click="handleTokenTransfersPrev" size="mini" :disabled="tokenTransfersPrevPages.length === 0">
								<Icon name="arrow-left" size="12" color="primary" />
							</Button>

							<Button type="secondary" size="mini" disabled>
								<Text size="12" weight="600" color="primary">Page {{ tokenTransfersPrevPages.length + 1 }}</Text>
							</Button>

							<Button @click="handleTokenTransfersNext" type="secondary" size="mini" :disabled="!tokenTransfersNextParams">
								<Icon name="arrow-right" size="12" color="primary" />
							</Button>
						</Flex>
					</Flex>

					<!-- Pagination - NFTs -->
					<Flex v-if="activeTab === 'nfts'" align="center" justify="between">
						<Flex align="center" gap="6" :class="$style.pagination">
							<Button type="secondary" @click="handleNFTsPrev" size="mini" :disabled="nftsPrevPages.length === 0">
								<Icon name="arrow-left" size="12" color="primary" />
							</Button>

							<Button type="secondary" size="mini" disabled>
								<Text size="12" weight="600" color="primary">Page {{ nftsPrevPages.length + 1 }}</Text>
							</Button>

							<Button @click="handleNFTsNext" type="secondary" size="mini" :disabled="!nftsNextParams">
								<Icon name="arrow-right" size="12" color="primary" />
							</Button>
						</Flex>
					</Flex>
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.header {
	height: 40px;

	border-radius: 8px 8px 4px 4px;
	background: var(--card-background);

	padding: 0 12px;
}

.content {
	width: 100%;
	max-width: none;
}

.data {
	flex: 0 0 320px;
	max-width: 320px;

	border-radius: 4px 4px 4px 8px;
	background: var(--card-background);

	.main {
		padding: 16px;

		& .key_value {
			max-width: 100%;
		}
	}

	.avatar_container {
		position: relative;
		width: 50px;
		height: 50px;
		overflow: hidden;
		border-radius: 50%;
	}

	.avatar_image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.cel_image_container {
	position: relative;
	width: 16px;
	height: 16px;
	overflow: hidden;
	border-radius: 50%;
}

.cel_image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.txs_wrapper {
	flex: 1;
	min-width: 0;
}

.transaction_types_list {
	height: 200px;

	overflow-y: auto;
	overflow-x: hidden;
}

.tabs_wrapper {
	min-height: 44px;
	overflow-x: auto;

	border-radius: 4px;
	background: var(--card-background);

	padding: 0 8px;

	scroll-behavior: smooth;
}

.tabs_wrapper::-webkit-scrollbar {
	display: none;
}

.tab {
	height: 28px;

	white-space: nowrap;

	cursor: pointer;
	border-radius: 6px;

	padding: 0 8px;

	transition: all 0.1s ease;

	& span {
		color: var(--txt-tertiary);

		transition: all 0.1s ease;
	}

	&:hover {
		& span {
			color: var(--txt-secondary);
		}
	}
}

.tab.active {
	background: var(--op-8);

	& span {
		color: var(--txt-primary);
	}
}

.tables {
	height: 100%;

	border-radius: 4px 4px 8px 4px;
	background: var(--card-background);
}

.tables.disabled {
	opacity: 0.5;
	pointer-events: none;
}

.table {
	flex: 1;
	width: 100%;
	min-width: 0;
}

.filters {
	border-bottom: 1px dashed var(--op-8);

	padding: 12px 16px 12px 16px;
}

.badge {
	border-radius: 5px;
	background: var(--op-5);
	box-shadow: inset 0 0 0 1px var(--op-10);

	padding: 4px 6px;
}

.empty {
	flex: 1;

	padding-top: 16px;
	padding-bottom: 16px;
}

.pagination {
	padding: 16px;
}

.toggle {
	margin: 16px;
}

.qrcode {
	max-width: 60px;

	filter: invert(1);
	opacity: 0.2;

	transition: all 0.2s ease;

	&:hover {
		opacity: 1;

		transform: scale(1.2);
	}
}

.link {
	&:hover {
		span {
			color: var(--txt-primary);
		}

		img {
			filter: brightness(1.2);
		}
	}
}

@media (max-width: 1200px) {
	.data {
		flex: 0 0 300px;
		max-width: 300px;
	}
}

@media (max-width: 1000px) {
	.data {
		flex: 0 0 280px;
		max-width: 280px;
	}
}

@media (max-width: 800px) {
	.content {
		flex-direction: column;
	}

	.data {
		flex: none;
		max-width: none;
		width: 100%;

		border-radius: 4px;
	}

	.txs_wrapper {
		flex: none;
	}

	.table {
		border-radius: 4px 4px 8px 8px;
	}
}

@media (max-width: 550px) {
	.header {
		height: initial;
		flex-direction: column;
		gap: 12px;

		padding: 12px 0;
	}
}

@media (max-width: 400px) {
	.tabs_wrapper {
		overflow-x: auto;

		scroll-behavior: smooth;

		&::-webkit-scrollbar {
			display: none;
		}
	}

	.hint {
		display: none;
	}
}
</style>
