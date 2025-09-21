<script setup>
/** UI */
import BookmarkButton from "@/components/BookmarkButton.vue"
import Button from "@/components/ui/Button.vue"
import Checkbox from "@/components/ui/Checkbox.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"
import Input from "@/components/ui/Input.vue"
import Popover from "@/components/ui/Popover.vue"
import Toggle from "@/components/ui/Toggle.vue"

/** Components */
import AmountInCurrency from "@/components/AmountInCurrency.vue"
import TransactionsTable from "./tables/TransactionsTable.vue"

/** Services */
import { comma, splitAddress } from "@/services/utils"

/** API */
import {
	fetchAddressTransactions,
	fetchAddressBalance,
	fetchAddressStats,
	fetchAddressTokenTransfers,
} from "@/services/api/address"

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
])

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

/** Pagination */
const page = ref(1)
const handleNextCondition = ref(true)
const handleNext = () => {
	page.value += 1
}
const handlePrev = () => {
	if (page.value === 1) return
	page.value -= 1
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
const msgTypes = computed(() => enumStore.enums.messageTypes.sort())

const filters = reactive({
	status: {
		success: false,
		failed: false,
	},
	message_type: msgTypes.value?.reduce((a, b) => ({ ...a, [b]: false }), {}),
})
const hasActiveFilters = computed(() => {
	let has = false

	Object.keys(filters.status).forEach((s) => {
		if (filters.status[s]) has = true
	})
	Object.keys(filters.message_type).forEach((t) => {
		if (filters.message_type[t]) has = true
	})

	return has
})
const savedFiltersBeforeChanges = ref(null)

const handleClearAllFilters = () => {
	Object.keys(filters.status).forEach((f) => {
		filters.status[f] = false
	})

	Object.keys(filters.message_type).forEach((f) => {
		filters.message_type[f] = false
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
			message_type:
				Object.keys(filters.message_type).find((f) => filters.message_type[f]) &&
				Object.keys(filters.message_type)
					.filter((f) => filters.message_type[f])
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

	if (Object.keys(filters.message_type).find((f) => filters.message_type[f])) {
		savedFiltersBeforeChanges.value = { ...filters.message_type }
	}
}
const onMessageTypePopoverClose = () => {
	isMessageTypePopoverOpen.value = false

	searchTerm.value = ""

	if (savedFiltersBeforeChanges.value) {
		filters.message_type = savedFiltersBeforeChanges.value
		savedFiltersBeforeChanges.value = null
	} else {
		resetFilters("message_type")
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

const getTransactions = async () => {
	isRefetching.value = true

	try {
		const { data } = await fetchAddressTransactions(props.address.hash, {
			limit: 10,
			offset: (page.value - 1) * 10,
			includeTokenTransfers: true,
		})

		// Process the response to match the expected format
		if (data.value?.data?.transactions) {
			let txs = data.value.data.transactions

			// Apply status filters
			if (Object.keys(filters.status).find((f) => filters.status[f])) {
				const activeStatuses = Object.keys(filters.status).filter((f) => filters.status[f])
				txs = txs.filter((tx) => {
					const status = tx.status === 1 ? "success" : "failed"
					return activeStatuses.includes(status)
				})
			}

			// Apply message type filters (map EVM transaction types to message types)
			if (Object.keys(filters.message_type).find((f) => filters.message_type[f])) {
				const activeTypes = Object.keys(filters.message_type).filter((f) => filters.message_type[f])
				txs = txs.filter((tx) => {
					const txType = tx.isContractCreation ? "contract_creation" : 
								   tx.isContractInteraction ? "contract_call" : "transfer"
					return activeTypes.includes(txType)
				})
			}

			transactions.value = txs.map(tx => ({
				...tx,
				// Map EVM fields to expected format
				status: tx.status === 1 ? "success" : "failed",
				gas_used: tx.gasUsed,
				gas_wanted: tx.gas || tx.gasUsed,
				fee: tx.transactionFee || "0",
				message_types: tx.isContractCreation ? ["Contract Creation"] : 
							   tx.isContractInteraction ? ["Contract Call"] : ["Transfer"],
			}))

			handleNextCondition.value = transactions.value.length < 10
		} else {
			transactions.value = []
			handleNextCondition.value = true
		}

		cacheStore.current.transactions = transactions.value
	} catch (error) {
		console.error('Failed to fetch address transactions:', error)
		transactions.value = []
		handleNextCondition.value = true
	}

	isRefetching.value = false
}

const collapseBalances = ref(false)

/** Address Balance & Stats */
const getAddressBalance = async () => {
	isLoadingBalance.value = true
	try {
		const { data } = await fetchAddressBalance(props.address.hash, {
			includeNative: true,
			includeMetadata: true,
		})
		addressBalance.value = data.value?.data || null
	} catch (error) {
		console.error('Failed to fetch address balance:', error)
		addressBalance.value = null
	}
	isLoadingBalance.value = false
}

const getAddressStats = async () => {
	isLoadingStats.value = true
	try {
		const { data } = await fetchAddressStats(props.address.hash)
		addressStats.value = data.value?.data?.stats || null
	} catch (error) {
		console.error('Failed to fetch address stats:', error)
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
	return addressStats.value?.transactionCount?.total || 0
})

const isActive = computed(() => {
	return addressStats.value?.isActive || false
})

/** Watchers */
watch(
	activeTab,
	async () => {
		page.value = 1
		handleNextCondition.value = true

		router.replace({
			query: {
				tab: activeTab.value,
			},
		})

		if (activeTab.value === "transactions") {
			await getTransactions()
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

watch(page, () => {
	if (activeTab.value === "transactions") {
		getTransactions()
	}
})
</script>

<template>
	<Flex direction="column" gap="4">
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

		<Flex gap="4" :class="$style.content">
			<Flex direction="column" justify="between" gap="32" :class="$style.data">
				<Flex direction="column" gap="24" :class="$style.main">
					<Flex v-if="address.celestials" align="center" gap="12" :class="$style.key_value">
						<Flex v-if="address.celestials?.image_url" align="center" justify="center" :class="$style.avatar_container">
							<img :src="address.celestials?.image_url" :class="$style.avatar_image" />
						</Flex>

						<Flex direction="column" gap="8" :class="$style.key_value">
							<Text size="14" weight="600" color="secondary"> {{ $getDisplayName("addresses", "", address) }}</Text>

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
								<Text size="12" weight="600" color="tertiary"> Spendable</Text>
								<AmountInCurrency
									:amount="{ value: address.balance.spendable }"
									:styles="{ amount: { color: 'secondary' }, currency: { color: 'secondary' } }"
								/>
							</Flex>
						</Flex>
					</Flex>

					<Flex direction="column" gap="16">
						<Text size="12" weight="600" color="secondary">Details</Text>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary"> First Height</Text>
							<Text size="12" weight="600" color="secondary"> {{ comma(address.first_height) }} </Text>
						</Flex>
						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary"> Last Height</Text>
							<Text size="12" weight="600" color="secondary"> {{ comma(address.last_height) }} </Text>
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
								<Text color="secondary">Message Type</Text>

								<template v-if="Object.keys(filters.message_type).find((f) => filters.message_type[f])">
									<div :class="$style.vertical_divider" />

									<Text size="12" weight="600" color="primary">
										{{
											Object.keys(filters.message_type).filter((f) => filters.message_type[f]).length < 3
												? Object.keys(filters.message_type)
														.filter((f) => filters.message_type[f])
														.map((f) => f.replace("Msg", ""))
														.join(", ")
												: `${Object.keys(filters.message_type)
														.filter((f) => filters.message_type[f])[0]
														.replace("Msg", "")} and ${
														Object.keys(filters.message_type).filter((f) => filters.message_type[f]).length - 1
												  } more`
										}}
									</Text>

									<Icon
										@click.stop="resetFilters('message_type', true)"
										name="close-circle"
										size="12"
										color="secondary"
									/>
								</template>
							</Button>

							<template #content>
								<Flex direction="column" gap="12">
									<Text size="12" weight="500" color="secondary">Filter by Message Type</Text>

									<Input v-model="searchTerm" size="small" placeholder="Search" autofocus />

									<Flex direction="column" gap="8" :class="$style.message_types_list">
										<template
											v-if="
												Object.keys(filters.message_type).filter((t) =>
													t.toLowerCase().includes(searchTerm.trim().toLowerCase()),
												).length
											"
										>
											<Checkbox
												v-for="msg_type in Object.keys(filters.message_type).filter((t) =>
													t.toLowerCase().includes(searchTerm.trim().toLowerCase()),
												)"
												v-model="filters.message_type[msg_type]"
											>
												<Text size="12" weight="500" color="primary">{{ msg_type.replace("Msg", "") }}</Text>
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
						<!-- Transactions Table -->
						<template v-if="activeTab === 'transactions'">
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
									This address did not signed any {{ page === 1 ? "" : "more" }} transactions
								</Text>
							</Flex>
						</template>
					</Flex>

					<!-- Pagination -->
					<Flex align="center" justify="between">
						<Flex align="center" gap="6" :class="$style.pagination">
							<Button @click="page = 1" type="secondary" size="mini" :disabled="page === 1">
								<Icon name="arrow-left-stop" size="12" color="primary" />
							</Button>
							<Button type="secondary" @click="handlePrev" size="mini" :disabled="page === 1">
								<Icon name="arrow-left" size="12" color="primary" />
							</Button>

							<Button type="secondary" size="mini" disabled>
								<Text size="12" weight="600" color="primary">Page {{ page }}</Text>
							</Button>

							<Button @click="handleNext" type="secondary" size="mini" :disabled="handleNextCondition">
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

.data {
	min-width: 384px;

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
	min-width: 0;
}

.message_types_list {
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
}

.filters {
	border-bottom: 1px dashed var(--op-8);

	padding: 12px 8px 12px 8px;
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

@media (max-width: 800px) {
	.content {
		flex-direction: column;
	}

	.data {
		min-width: initial;

		border-radius: 4px;
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
