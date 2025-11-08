<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** Services */
import { comma, formatBytes } from "@/services/utils"

/** API */
import { fetchBlocks } from "@/services/api/block"

/** Components */
import Tooltip from "@/components/ui/Tooltip.vue"
import Button from "@/components/ui/Button.vue"
import GasBar from "@/components/GasBar.vue"
import CopyButton from "@/components/CopyButton.vue"

const route = useRoute()
const router = useRouter()

const blocks = ref([])
const nextPageParams = ref(null)
const previousPages = ref([]) // Stack to store previous page params for back navigation
const isLoading = ref(false)
const hasMore = computed(() => nextPageParams.value !== null)

// EVM block helper functions
const formatGasValue = (value) => {
	if (!value) return "0"
	return comma(value)
}

const getGasUsagePercent = (gasUsed, gasLimit) => {
	if (!gasLimit || gasLimit === "0") return 0
	const used = parseFloat(gasUsed) || 0
	const limit = parseFloat(gasLimit) || 1
	return Math.min((used / limit) * 100, 100)
}

const loadBlocks = async (params = null) => {
	isLoading.value = true

	try {
		const queryParams = params || { items_count: 20 }

		const { data, error } = await fetchBlocks(queryParams)

		if (error.value) {
			blocks.value = []
			nextPageParams.value = null
		} else if (data.value) {
			blocks.value = data.value.items || []
			nextPageParams.value = data.value.next_page_params || null
		} else {
			blocks.value = []
			nextPageParams.value = null
		}
	} catch (error) {
		blocks.value = []
		nextPageParams.value = null
	} finally {
		isLoading.value = false
	}
}

const handleNext = async () => {
	if (!hasMore.value) return

	// Store current state for back navigation
	previousPages.value.push({
		blocks: [...blocks.value],
		params: nextPageParams.value
	})

	await loadBlocks(nextPageParams.value)

	// Update URL with cursor (optional, for deep linking)
	if (nextPageParams.value?.block_number) {
		router.push({ query: { cursor: nextPageParams.value.block_number } })
	}
}

const handlePrev = () => {
	if (previousPages.value.length === 0) return

	const previousState = previousPages.value.pop()
	blocks.value = previousState.blocks
	nextPageParams.value = previousState.params

	// Update URL
	const prevCursor = previousPages.value[previousPages.value.length - 1]?.params?.block_number
	if (prevCursor) {
		router.push({ query: { cursor: prevCursor } })
	} else {
		router.push({ query: {} })
	}
}

const handleFirst = async () => {
	previousPages.value = []
	await loadBlocks()
	router.push({ query: {} })
}

const canGoPrev = computed(() => previousPages.value.length > 0)
const currentPageNumber = computed(() => previousPages.value.length + 1)

// Load blocks on mount
onMounted(async () => {
	await nextTick()

	// Check if there's a cursor in URL for deep linking
	const cursor = route.query.cursor
	if (cursor) {
		await loadBlocks({ items_count: 20, block_number: parseInt(cursor) })
	} else {
		await loadBlocks()
	}
})

useHead({
	title: "Blocks - Monad Explorer",
	link: [
		{
			rel: "canonical",
			href: `${useRequestURL().origin}${useRequestURL().pathname}`,
		},
	],
	meta: [
		{
			name: "description",
			content: "Browse all blocks on the Monad network. View block details, transactions, gas usage, and timestamps.",
		},
	],
})
</script>

<template>
	<Flex direction="column" gap="20" wide :class="$style.wrapper">
		<Flex direction="column" gap="12">
			<Flex align="end" justify="between" :class="$style.header">
				<Breadcrumbs
					:items="[
						{ link: '/', name: 'Dashboard' },
						{ link: '/blocks', name: 'Blocks' },
					]"
				/>
			</Flex>

			<Flex direction="column" gap="16">
				<Flex align="center" justify="between">
					<Flex align="center" gap="8">
						<Icon name="block" size="16" color="primary" />
						<Text size="16" weight="600" color="primary">Blocks</Text>
					</Flex>

					<Flex align="center" gap="8">
						<Text size="13" weight="600" color="secondary">
							Page {{ currentPageNumber }}
						</Text>
					</Flex>
				</Flex>

				<Flex v-if="isLoading" align="center" justify="center" :class="$style.loading">
					<Text size="13" weight="600" color="secondary">Loading blocks...</Text>
				</Flex>

				<Flex v-else direction="column" gap="8" :class="$style.content">
					<!-- Desktop Table View -->
					<div :class="$style.desktop_table">
						<table :class="$style.table">
							<thead>
								<tr>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Block Number</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Timestamp</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Transactions</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Gas Used</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Gas Limit</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Size</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Base Fee</Text></th>
								</tr>
							</thead>

							<tbody>
								<tr v-for="block in blocks" :key="block.hash || block.height">
									<td>
										<NuxtLink :to="`/block/${block.height}`">
											<Flex align="center" gap="6">
												<Outline>
													<Flex align="center" gap="4">
														<Icon name="block" size="12" color="primary" />
														<Text size="12" weight="600" color="primary" tabular>
															{{ comma(block.height) }}
														</Text>
													</Flex>
												</Outline>
												<CopyButton :text="block.height.toString()" size="10" />
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.height}`">
											<Flex direction="column" gap="4">
												<Tooltip position="start" delay="500">
													<ClientOnlyTime fallback-text="..." fallback-size="11" fallback-color="primary">
														<Text size="11" weight="600" color="primary">
															{{ DateTime.fromISO(block.timestamp).toRelative({ locale: "en", style: "short" }) }}
														</Text>
													</ClientOnlyTime>

													<template #content>
														{{ DateTime.fromISO(block.timestamp).setLocale("en").toFormat("LLL d, t") }}
													</template>
												</Tooltip>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.height}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ comma(block.transactions_count || block.tx_count || 0) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.height}`">
											<Flex direction="column" gap="6">
												<Flex align="center" gap="2">
													<Text size="12" weight="600" color="primary">
														{{ formatGasValue(block.gas_used) }}
													</Text>
													<Text size="11" weight="600" color="tertiary">
														({{ getGasUsagePercent(block.gas_used, block.gas_limit).toFixed(1) }}%)
													</Text>
												</Flex>
												<GasBar :percent="getGasUsagePercent(block.gas_used, block.gas_limit)" />
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.height}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ formatGasValue(block.gas_limit) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.height}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ formatBytes(block.size, 0) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.height}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ formatGasValue(block.base_fee_per_gas) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<!-- Mobile Card View -->
					<div :class="$style.mobile_cards">
						<div v-for="block in blocks" :key="block.hash || block.height" :class="$style.card">
							<NuxtLink :to="`/block/${block.height}`" :class="$style.card_link">
								<Flex direction="column" gap="16">
									<!-- Header with block number and timestamp -->
									<Flex align="center" justify="between">
										<Flex align="center" gap="6">
											<Icon name="block" size="14" color="primary" />
											<Text size="13" weight="600" color="primary">
												Block {{ comma(block.height) }}
											</Text>
											<CopyButton :text="block.height.toString()" size="10" />
										</Flex>
										<ClientOnlyTime fallback-text="..." fallback-size="12" fallback-color="tertiary">
											<Text size="12" weight="600" color="tertiary">
												{{ DateTime.fromISO(block.timestamp).toRelative({ locale: "en", style: "short" }) }}
											</Text>
										</ClientOnlyTime>
									</Flex>

									<!-- Block details -->
									<Flex direction="column" gap="12">
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Transactions</Text>
											<Text size="12" weight="600" color="primary">
												{{ comma(block.transactions_count || block.tx_count || 0) }}
											</Text>
										</Flex>
										<Flex direction="column" gap="6">
											<Flex align="center" justify="between">
												<Text size="12" weight="600" color="tertiary">Gas Used</Text>
												<Flex align="center" gap="4">
													<Text size="12" weight="600" color="primary">
														{{ formatGasValue(block.gas_used) }}
													</Text>
													<Text size="11" weight="600" color="tertiary">
														({{ getGasUsagePercent(block.gas_used, block.gas_limit).toFixed(1) }}%)
													</Text>
												</Flex>
											</Flex>
											<GasBar :percent="getGasUsagePercent(block.gas_used, block.gas_limit)" />
										</Flex>
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Size</Text>
											<Text size="12" weight="600" color="primary">
												{{ formatBytes(block.size, 0) }}
											</Text>
										</Flex>
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Base Fee</Text>
											<Text size="12" weight="600" color="primary">
												{{ formatGasValue(block.base_fee_per_gas) }}
											</Text>
										</Flex>
									</Flex>
								</Flex>
							</NuxtLink>
						</div>
					</div>

					<!-- Cursor-based Pagination -->
					<Flex align="center" justify="center" gap="8" :class="$style.pagination">
						<Button @click="handleFirst" type="secondary" size="mini" :disabled="!canGoPrev || isLoading">
							<Icon name="arrow-left-stop" size="12" color="primary" />
						</Button>

						<Button @click="handlePrev" type="secondary" size="mini" :disabled="!canGoPrev || isLoading">
							<Icon name="arrow-left" size="12" color="primary" />
						</Button>

						<Flex align="center" gap="4">
							<Text size="12" weight="600" color="secondary">
								Page {{ currentPageNumber }}
							</Text>
						</Flex>

						<Button @click="handleNext" type="secondary" size="mini" :disabled="!hasMore || isLoading">
							<Icon name="arrow-right" size="12" color="primary" />
						</Button>
					</Flex>
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	padding: 20px 24px 60px 24px;
}

.header {
	margin-bottom: 16px;
}

.content {
	border-radius: 8px;
	background: var(--card-background);
	overflow: hidden;
}

/* Desktop Table View */
.desktop_table {
	display: block;
	overflow-x: auto;
}

.table {
	width: 100%;
	min-width: 1000px; /* Ensure all columns are visible */
	border-spacing: 0;

	& thead {
		& tr {
			& th {
				text-align: left;
				padding: 12px 8px 6px 8px;
				border-bottom: 1px solid var(--op-5);

				&:first-child {
					padding-left: 16px;
				}

				&:last-child {
					padding-right: 16px;
				}

				& span {
					display: flex;
				}
			}
		}
	}

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

		& td {
			padding: 6px 8px 6px 8px;
			white-space: nowrap;
			border-bottom: 1px solid var(--op-3);

			&:first-child {
				padding-left: 16px;
			}

			&:last-child {
				padding-right: 16px;
			}

			& > a {
				display: flex;
				align-items: center;
				min-height: 24px;
			}
		}
	}
}

/* Mobile Card View */
.mobile_cards {
	display: none;
	flex-direction: column;
	gap: 16px;
	padding: 16px;
}

.card {
	border: 1px solid var(--op-5);
	border-radius: 8px;
	background: var(--card-background);
	transition: all 0.2s ease;

	&:hover {
		border-color: var(--op-10);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
}

.card_link {
	display: block;
	padding: 16px;
	text-decoration: none;
	color: inherit;
}

.loading {
	padding: 60px 20px;
	text-align: center;
}

.pagination {
	padding: 12px;
	border-top: 1px solid var(--op-5);
}

/* Responsive Breakpoints - Progressive column hiding */
@media (max-width: 1200px) {
	.table {
		min-width: 850px;
		& thead th:nth-child(6),
		& tbody td:nth-child(6) {
			display: none; /* Hide Size column */
		}
	}
}

@media (max-width: 1000px) {
	.table {
		min-width: 750px;
		& thead th:nth-child(7),
		& tbody td:nth-child(7) {
			display: none; /* Hide Base Fee column */
		}
	}
}

@media (max-width: 900px) {
	.table {
		min-width: 650px;
		& thead th:nth-child(5),
		& tbody td:nth-child(5) {
			display: none; /* Hide Gas Limit column */
		}
	}
}

@media (max-width: 800px) {
	.table {
		min-width: 550px;
		& thead th:nth-child(4),
		& tbody td:nth-child(4) {
			display: none; /* Hide Gas Used column */
		}
	}
}

@media (max-width: 768px) {
	.desktop_table {
		display: none;
	}

	.mobile_cards {
		display: flex;
	}

	.wrapper {
		padding: 20px 16px 60px 16px;
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 32px 12px;
	}
}
</style>
