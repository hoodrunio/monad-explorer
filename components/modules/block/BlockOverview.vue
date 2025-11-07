<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** UI */
import AmountInCurrency from "@/components/AmountInCurrency.vue"
import Badge from "@/components/ui/Badge.vue"
import BookmarkButton from "@/components/BookmarkButton.vue"
import Button from "@/components/ui/Button.vue"
import Checkbox from "@/components/ui/Checkbox.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"
import Input from "@/components/ui/Input.vue"
import Popover from "@/components/ui/Popover.vue"
import Tooltip from "@/components/ui/Tooltip.vue"

/** Shared Components */
import MessageTypeBadge from "@/components/shared/MessageTypeBadge.vue"
import Events from "@/components/shared/tables/Events.vue"

/** Services */
import { comma, formatBytes, space, shortHex } from "@/services/utils"

/** API */
import { fetchBlockTransactions } from "@/services/api/block"

/** Store */
import { useAppStore } from "@/store/app.store"
import { useModalsStore } from "@/store/modals.store"
import { useCacheStore } from "@/store/cache.store"
const appStore = useAppStore()
const modalsStore = useModalsStore()
const cacheStore = useCacheStore()

const route = useRoute()
const router = useRouter()

const props = defineProps({
	block: {
		type: Object,
		required: true,
	},
	transactions: {
		type: Array,
	},
	nextTxParams: {
		type: Object,
		default: null,
	},
})

const lastBlock = computed(() => appStore.latestBlocks[0])

// Removed activeTab logic since transactions are now in separate section

const isLoading = ref(false)
const transactions = ref([])
const nextPageParams = ref(props.nextTxParams)
const previousPages = ref([])

const handleNext = async () => {
	if (!nextPageParams.value) return

	// Store current state for back navigation
	previousPages.value.push({
		transactions: [...transactions.value],
		params: nextPageParams.value
	})

	await getTransactions(nextPageParams.value)
}

const handlePrev = () => {
	if (previousPages.value.length === 0) return

	const previousState = previousPages.value.pop()
	transactions.value = previousState.transactions
	nextPageParams.value = previousState.params
}

/** Filters for EVM transactions */
const filters = reactive({
	status: {
		success: false,
		failed: false,
	},
	// Remove message_type filter for EVM - transactions don't have message types
})

const hasActiveFilters = computed(() => {
	let has = false
	Object.keys(filters.status).forEach((s) => {
		if (filters.status[s]) has = true
	})
	return has
})

const savedFiltersBeforeChanges = ref(null)

const handleClearAllFilters = () => {
	Object.keys(filters.status).forEach((f) => {
		filters.status[f] = false
	})

	router.replace({
		query: null,
	})

	getTransactions()
}

/** Parse route query */
Object.keys(route.query).forEach((key) => {
	if (key === "page" || key === "tab") return

	if (filters[key] && route.query[key].split(",").length) {
		route.query[key].split(",").forEach((item) => {
			filters[key][item] = true
		})
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

const resetFilters = (target, refetch) => {
	Object.keys(filters[target]).forEach((f) => {
		filters[target][f] = false
	})

	if (refetch) {
		updateRouteQuery()
		getTransactions()
	}
}

// EVM block data helper functions
const getGasUsagePercent = (gasUsed, gasLimit) => {
	if (!gasLimit || gasLimit === "0") return 0
	const used = parseFloat(gasUsed) || 0
	const limit = parseFloat(gasLimit) || 1
	return Math.min((used / limit) * 100, 100)
}

const formatGasValue = (value) => {
	if (!value) return "0"
	return comma(value)
}

const formatMonValue = (value) => {
	if (!value || value === "0") return "0"
	// Convert wei to MON (divide by 10^18)
	const monValue = parseInt(value) / Math.pow(10, 18)
	return monValue.toFixed(6)
}

const getTransactions = async (params = null) => {
	isLoading.value = true

	try {
		const queryParams = params || {
			blockNumberOrHash: props.block.height,
			items_count: 20
		}

		const { data } = await fetchBlockTransactions(queryParams)

		// Process transactions data to match display format
		let txs = data.value?.items || []

		// Update next page params
		nextPageParams.value = data.value?.next_page_params || null

		// Apply status filters
		if (Object.keys(filters.status).find((f) => filters.status[f])) {
			const activeStatuses = Object.keys(filters.status).filter((f) => filters.status[f])
			txs = txs.filter((tx) => {
				const status = tx.status === "ok" ? "success" : "failed"
				return activeStatuses.includes(status)
			})
		}

		transactions.value = txs.map(tx => ({
			...tx,
			// Map EVM fields to expected format
			hash: tx.hash,
			status: tx.status === "ok" ? "success" : "failed",
			// Extract addresses from nested objects - map to expected field names
			from: tx.from?.hash || tx.from,
			to: tx.to?.hash || tx.to,
			fromAddress: tx.from?.hash || tx.from,
			toAddress: tx.to?.hash || tx.to,
			value: tx.value,
			gas_used: tx.gas_used,
			gas_wanted: tx.gas_limit || tx.gas_used,
			fee: tx.fee?.value || "0",
			method: tx.method,
			// Use transaction_types from API
			transaction_types: tx.transaction_types || [],
		}))

		cacheStore.current.transactions = transactions.value
	} catch (error) {
		console.error("Error fetching block transactions:", error)
		transactions.value = []
		nextPageParams.value = null
	}

	isLoading.value = false
}

await getTransactions()

onMounted(() => {
	// Remove tab query logic since transactions are now in separate section
})

/** Refetch transactions when filters change */
watch(
	() => filters.status,
	() => {
		// Reset pagination when filters change
		previousPages.value = []
		getTransactions()
	},
	{ deep: true }
)

const handleViewRawBlock = () => {
	cacheStore.current._target = "block"
	modalsStore.open("rawData")
}

const handleViewRawTransactions = () => {
	cacheStore.current._target = "transactions"
	modalsStore.open("rawData")
}
</script>

<template>
	<Flex direction="column" gap="4">
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="block" size="14" color="primary" />
				<Text as="h1" size="13" weight="600" color="primary">
					Block <Text color="secondary">{{ comma(block.height) }} </Text>
				</Text>
				<CopyButton :text="block.height" size="12" />
			</Flex>

			<Flex align="center" gap="12">
				<BookmarkButton type="block" :id="block.height" />

				<div class="divider_v" />

				<Dropdown>
					<Button type="secondary" size="mini">
						<Icon name="dots" size="16" color="primary" />
					</Button>

					<template #popup>
						<DropdownItem @click="handleViewRawBlock"> View Raw Block </DropdownItem>
						<DropdownItem @click="handleViewRawTransactions"> View Raw Transactions </DropdownItem>
					</template>
				</Dropdown>
			</Flex>
		</Flex>

		<Flex gap="4" :class="$style.content">
			<Flex direction="column" :class="$style.data">
				<Flex wide direction="column" gap="8" :class="$style.top">
					<Flex align="center" justify="between" wide>
						<Text size="12" weight="600" color="secondary"> Timeline </Text>
						<Text size="12" weight="600" color="tertiary">
							{{ DateTime.fromISO(block.timestamp).setLocale("en").toFormat("ff") }}
						</Text>
					</Flex>

					<Badge>
						<Flex align="center" justify="between" wide>
							<Text size="12" weight="600" color="secondary" align="center">
								{{ DateTime.fromISO(block.timestamp).setLocale("en").toFormat("TT") }}
							</Text>

							<div v-for="dot in 5" class="dot" />

							<Flex align="center" gap="6">
								<Icon name="zap" size="12" color="secondary" />
								<Text size="12" weight="600" color="primary">
									{{ formatGasValue(block.gas_used) }} gas
								</Text>
							</Flex>

							<div v-for="dot in 5" class="dot" />

							<Text size="12" weight="600" color="secondary" align="center">
								{{ getGasUsagePercent(block.gas_used, block.gas_limit).toFixed(1) }}% used
							</Text>
						</Flex>
					</Badge>
				</Flex>

				<Flex direction="column" gap="24" :class="$style.main">
					<Flex v-if="block.hash" direction="column" gap="8" :class="$style.key_value">
						<Text size="12" weight="600" color="secondary">Hash</Text>
						<BadgeValue :text="block.hash" />
					</Flex>

					<Flex v-if="block.parent_hash" direction="column" gap="8" :class="$style.key_value">
						<Text size="12" weight="600" color="secondary">Parent Hash</Text>
						<BadgeValue :text="block.parent_hash" />
					</Flex>

					<Flex direction="column" gap="16">
						<Text size="12" weight="600" color="secondary">Details</Text>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Transactions</Text>
							<Text size="12" weight="600" color="secondary">{{ block.transactions_count || block.tx_count }}</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Gas Used</Text>
							<Flex align="center" gap="4">
								<Text size="12" weight="600" color="secondary">{{ formatGasValue(block.gas_used) }}</Text>
								<Text size="12" weight="600" color="tertiary">
									({{ getGasUsagePercent(block.gas_used, block.gas_limit).toFixed(1) }}%)
								</Text>
							</Flex>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Gas Limit</Text>
							<Text size="12" weight="600" color="secondary">{{ formatGasValue(block.gas_limit) }}</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Base Fee</Text>
							<Text size="12" weight="600" color="secondary">{{ formatGasValue(block.base_fee_per_gas) }} wei</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Block Size</Text>
							<Text size="12" weight="600" color="secondary">{{ formatBytes(block.size) }}</Text>
						</Flex>
					</Flex>

					<Flex align="center" gap="8">
						<Button
							@click="router.push(`/block/${block.height - 1}`)"
							wide
							type="secondary"
							size="mini"
							:disabled="block.height === 0"
						>
							<Icon name="arrow-redo-right" size="16" color="tertiary" :style="{ transform: 'scaleX(-1)' }" />
							<Text :class="$style.block_nav__txt"><Text color="secondary">Go to</Text> {{ comma(block.height - 1) }}</Text>
						</Button>

						<Button
							@click="router.push(`/block/${block.height + 1}`)"
							wide
							type="secondary"
							size="mini"
							:disabled="block.height === lastBlock?.height"
						>
							<Text :class="$style.block_nav__txt"><Text color="secondary">Go to </Text>{{ comma(block.height + 1) }}</Text>
							<Icon name="arrow-redo-right" size="16" color="tertiary" />
						</Button>
					</Flex>
				</Flex>
			</Flex>

			<Flex direction="column" gap="4" wide :class="$style.logs_wrapper">
				<Flex align="center" justify="between" :class="$style.tabs_wrapper">
					<Flex gap="4" :class="$style.tabs">
						<Flex
							align="center"
							gap="6"
							:class="[$style.tab, $style.active]"
						>
							<Icon name="zap" size="12" color="secondary" />
							<Text size="13" weight="600">Logs</Text>
						</Flex>
					</Flex>
				</Flex>

				<Events :block="block" />
			</Flex>
		</Flex>

		<!-- Transactions Section -->
		<Flex direction="column" gap="4" wide :class="$style.transactions_section">
			<Flex align="center" justify="between" :class="$style.section_header">
				<Flex align="center" gap="8">
					<Icon name="tx" size="14" color="primary" />
					<Text size="16" weight="600" color="primary">Transactions</Text>
					<Text size="13" weight="600" color="tertiary">{{ block.transactionCount }}</Text>
				</Flex>
			</Flex>

			<Flex direction="column" :class="[$style.table, isLoading && $style.disabled]">
				<Flex wrap="wrap" align="center" justify="start" gap="8" :class="$style.filters">
					<Popover :open="isStatusPopoverOpen" @on-close="onStatusPopoverClose" width="200">
						<Button @click="handleOpenStatusPopover" type="secondary" size="mini" :disabled="!transactions.length">
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
				</Flex>

				<div v-if="transactions.length" :class="$style.table_scroller">
					<table>
						<thead>
							<tr>
								<th><Text size="12" weight="600" color="tertiary">Hash</Text></th>
								<th><Text size="12" weight="600" color="tertiary">From</Text></th>
								<th><Text size="12" weight="600" color="tertiary">To</Text></th>
								<th><Text size="12" weight="600" color="tertiary">Value</Text></th>
								<th><Text size="12" weight="600" color="tertiary">Gas</Text></th>
							</tr>
						</thead>

						<tbody>
							<tr v-for="tx in transactions" :key="tx.hash">
								<td>
									<NuxtLink :to="`/tx/${tx.hash}`">
										<Tooltip position="start" delay="500">
											<Flex align="center" gap="8">
												<Icon
													:name="tx.status === 'success' ? 'check-circle' : 'close-circle'"
													size="13"
													:color="tx.status === 'success' ? 'green' : 'red'"
												/>

												<Text size="13" weight="600" color="primary" mono>{{
													tx.hash.slice(0, 6)
												}}</Text>

												<Flex align="center" gap="3">
													<div v-for="dot in 3" class="dot" />
												</Flex>

												<Text size="13" weight="600" color="primary" mono>{{
													tx.hash.slice(tx.hash.length - 4, tx.hash.length)
												}}</Text>

												<CopyButton :text="tx.hash" />
											</Flex>

											<template #content>
												<Flex direction="column" gap="6">
													<Flex align="center" gap="4">
														<Icon
															:name="tx.status === 'success' ? 'check-circle' : 'close-circle'"
															size="13"
															:color="tx.status === 'success' ? 'green' : 'red'"
														/>
														<Text size="13" weight="600" color="primary">
															{{ tx.status === "success" ? "Successful" : "Failed" }} Transaction
														</Text>
													</Flex>

													<Text color="tertiary" mono>{{ tx.hash }}</Text>

													<Text v-if="tx.error" height="120" color="tertiary" style="max-width: 400px" mono align="left">
														{{ tx.error }}
													</Text>
												</Flex>
											</template>
										</Tooltip>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/tx/${tx.hash}`">
										<Tooltip position="start">
											<Text size="13" weight="600" color="primary" mono>
												{{ shortHex(tx.fromAddress) }}
											</Text>
											<template #content>
												<Text color="primary" mono>{{ tx.fromAddress }}</Text>
											</template>
										</Tooltip>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/tx/${tx.hash}`">
										<Tooltip position="start">
											<Text size="13" weight="600" color="primary" mono>
												{{ shortHex(tx.toAddress) }}
											</Text>
											<template #content>
												<Text color="primary" mono>{{ tx.toAddress }}</Text>
											</template>
										</Tooltip>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/tx/${tx.hash}`">
										<Text size="13" weight="600" color="primary">
											{{ formatMonValue(tx.value) }} MON
										</Text>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/tx/${tx.hash}`">
										<Tooltip>
											<Flex align="center" gap="8">
												<GasBar :percent="getGasUsagePercent(tx.gas_used, tx.gas_wanted)" />
												<Text size="13" weight="600" color="primary">
													{{ formatGasValue(tx.gas_used) }}
												</Text>
											</Flex>

											<template #content>
												<Flex align="center" gap="4">
													<Text size="13" weight="600" color="primary">{{ formatGasValue(tx.gas_used) }}</Text>
													<Text size="13" weight="600" color="tertiary">used</Text>
												</Flex>
											</template>
										</Tooltip>
									</NuxtLink>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
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
						This block does not contain any transactions
					</Text>
				</Flex>

				<!-- Pagination -->
				<Flex v-if="transactions.length" align="center" gap="6" :class="$style.pagination">
					<Button @click="page = 1" type="secondary" size="mini" :disabled="page === 1">
						<Icon name="arrow-left-stop" size="12" color="primary" />
					</Button>
					<Button type="secondary" @click="handlePrev" size="mini" :disabled="page === 1">
						<Icon name="arrow-left" size="12" color="primary" />
					</Button>

					<Button type="secondary" size="mini" disabled>
						<Text size="12" weight="600" color="primary">Page {{ page }}</Text>
					</Button>

					<Button @click="handleNext" type="secondary" size="mini" :disabled="transactions.length !== 10">
						<Icon name="arrow-right" size="12" color="primary" />
					</Button>
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

	.top {
		padding: 16px;

		border-bottom: 1px solid var(--op-5);
	}

	.main {
		padding: 16px;

		& .key_value {
			max-width: 100%;
		}
	}
}

.logs_wrapper {
	min-width: 0;
}

.transactions_section {
	margin-top: 16px;
}

.section_header {
	height: 40px;
	border-radius: 8px 8px 4px 4px;
	background: var(--card-background);
	padding: 0 12px;
}

.tabs_wrapper {
	min-height: 44px;
	overflow-x: auto;

	border-radius: 4px;
	background: var(--card-background);

	padding: 0 8px;
}

.tabs_wrapper::-webkit-scrollbar {
	display: none;
}

.tab {
	height: 28px;

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

.tab.hide {
	display: none;
}

.table_scroller {
	width: 100%;
	height: 100%;
	overflow-x: auto;
	overflow-y: visible;
}

.table_scroller::-webkit-scrollbar {
	height: 8px;
}

.table_scroller::-webkit-scrollbar-track {
	background: var(--op-3);
	border-radius: 4px;
}

.table_scroller::-webkit-scrollbar-thumb {
	background: var(--op-10);
	border-radius: 4px;
}

.table_scroller::-webkit-scrollbar-thumb:hover {
	background: var(--op-15);
}

.inner {
	height: 100%;

	border-radius: 4px 4px 8px 4px;
	background: var(--card-background);
}

.events {
	padding: 16px;
}

.table {
	height: 100%;

	border-radius: 4px 4px 8px 4px;
	background: var(--card-background);

	& table {
		width: 100%;
		min-width: 800px;
		height: fit-content;
		border-spacing: 0;
		table-layout: fixed;

		& tbody {
			& tr {
				cursor: pointer;
				transition: all 0.05s ease;

				&:hover {
					background: var(--op-5);
				}

				&:active {
					background: var(--op-8);
				}
			}
		}

		& tr th {
			text-align: left;
			padding: 8px 16px;
			white-space: nowrap;
			vertical-align: top;

			&:first-child {
				width: 20%;
				padding-left: 16px;
			}

			&:nth-child(2) {
				width: 18%;
			}

			&:nth-child(3) {
				width: 18%;
			}

			&:nth-child(4) {
				width: 16%;
			}

			&:nth-child(5) {
				width: 16%;
			}

			& span {
				display: flex;
			}
		}

		& tr td {
			padding: 8px 16px;
			white-space: nowrap;
			vertical-align: middle;
			border-bottom: 1px solid var(--op-3);

			&:first-child {
				padding-left: 16px;
			}

			& > a {
				display: flex;
				align-items: center;
				min-height: 40px;
				width: 100%;
			}
		}
	}
}

.genesis_td {
	display: flex;

	min-height: 40px;

	padding-right: 24px;
}

.table.disabled {
	opacity: 0.5;
	pointer-events: none;
}

.badge {
	border-radius: 5px;
	background: var(--op-5);
	box-shadow: inset 0 0 0 1px var(--op-10);

	padding: 4px 6px;
}

.filters {
	border-bottom: 1px dashed var(--op-8);

	padding: 4px 8px 6px 8px;
}

.empty {
	flex: 1;
	padding: 16px 0;
}

.pagination {
	padding: 8px 16px 16px 16px;
}

@media (max-width: 1000px) {
	.ods_btn {
		display: none;
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

	.transactions_section {
		margin-top: 12px;
	}

	.section_header {
		height: initial;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
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

@media (max-width: 1200px) {
	.table {
		& table {
			min-width: 700px;
		}
	}
}

@media (max-width: 900px) {
	.table {
		& table {
			min-width: 600px;

			& tr th {
				&:nth-child(3) {
					display: none;
				}
			}

			& tr td {
				&:nth-child(3) {
					display: none;
				}
			}
		}
	}
}

@media (max-width: 700px) {
	.table {
		& table {
			min-width: 500px;

			& tr th {
				&:nth-child(4) {
					display: none;
				}
			}

			& tr td {
				&:nth-child(4) {
					display: none;
				}
			}
		}
	}
}

@media (max-width: 400px) {
	.tabs_wrapper {
		overflow-x: auto;

		&::-webkit-scrollbar {
			display: none;
		}
	}

	.hint {
		display: none;
	}

	.block_nav__txt {
		display: none;
	}

	.table {
		& table {
			min-width: 400px;

			& tr th {
				padding: 8px 8px;
				font-size: 11px;

				&:first-child {
					padding-left: 12px;
				}
			}

			& tr td {
				padding: 8px 8px;

				&:first-child {
					padding-left: 12px;
				}
			}
		}
	}
}
</style>
