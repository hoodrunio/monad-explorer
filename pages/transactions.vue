<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** Services */
import { comma, shortHex } from "@/services/utils"

/** API */
import { fetchTransactions } from "@/services/api/tx"

/** Composables */
import { useTransactionMethods } from "@/composables/useTransactionMethods"

/** Components */
import Tooltip from "@/components/ui/Tooltip.vue"
import Button from "@/components/ui/Button.vue"

const route = useRoute()
const router = useRouter()

const transactions = ref([])
const nextPageParams = ref(null)
const previousPages = ref([])
const isLoading = ref(false)
const hasMore = computed(() => nextPageParams.value !== null)

// Transaction method information
const { batchGetMethodInfo } = useTransactionMethods()
const methodInfoMap = ref(new Map())

// EVM transaction helper functions
const formatGasValue = (value) => {
	if (!value) return "0"
	return comma(value)
}

const formatMonValue = (value) => {
	if (!value || value === "0") return "0"
	const monValue = parseFloat(value) / Math.pow(10, 18)
	return monValue.toFixed(6)
}

const getTransactionType = (tx) => {
	if (tx.method === "createContract") return "Contract Creation"
	if (tx.to?.is_contract) return "Contract Call"
	if (tx.to && tx.value !== "0") return "Mon Transfer"
	if (tx.to) return "Transfer"
	return "Unknown"
}

// Get enhanced method name for a transaction
const getEnhancedMethodName = (tx) => {
	if (!tx.method) return null

	const methodInfo = methodInfoMap.value.get(tx.method)
	return methodInfo?.methodName || tx.method || null
}

const loadTransactions = async (params = null) => {
	isLoading.value = true

	try {
		const queryParams = params || { items_count: 20 }

		const { data, error } = await fetchTransactions(queryParams)

		if (error.value) {
			console.error("Error fetching transactions:", error.value)
			transactions.value = []
			nextPageParams.value = null
			methodInfoMap.value.clear()
		} else if (data.value) {
			transactions.value = data.value.items || []
			nextPageParams.value = data.value.next_page_params || null

			// Fetch method information for all transactions
			if (transactions.value.length > 0) {
				try {
					const methodInfo = await batchGetMethodInfo(transactions.value)
					methodInfoMap.value = methodInfo
				} catch (methodError) {
					console.warn('Failed to fetch method information:', methodError)
				}
			}
		} else {
			transactions.value = []
			nextPageParams.value = null
			methodInfoMap.value.clear()
		}
	} catch (error) {
		console.error("Failed to load transactions:", error)
		transactions.value = []
		nextPageParams.value = null
		methodInfoMap.value.clear()
	} finally {
		isLoading.value = false
	}
}

const handleNext = async () => {
	if (!hasMore.value) return

	// Store current state for back navigation
	previousPages.value.push({
		transactions: [...transactions.value],
		params: nextPageParams.value
	})

	await loadTransactions(nextPageParams.value)

	// Update URL with cursor
	if (nextPageParams.value?.block_number) {
		router.push({ query: { cursor: `${nextPageParams.value.block_number}-${nextPageParams.value.index}` } })
	}
}

const handlePrev = () => {
	if (previousPages.value.length === 0) return

	const previousState = previousPages.value.pop()
	transactions.value = previousState.transactions
	nextPageParams.value = previousState.params

	// Update URL
	const prevCursor = previousPages.value[previousPages.value.length - 1]?.params
	if (prevCursor) {
		router.push({ query: { cursor: `${prevCursor.block_number}-${prevCursor.index}` } })
	} else {
		router.push({ query: {} })
	}
}

const handleFirst = async () => {
	previousPages.value = []
	await loadTransactions()
	router.push({ query: {} })
}

const canGoPrev = computed(() => previousPages.value.length > 0)
const currentPageNumber = computed(() => previousPages.value.length + 1)

// Load transactions on mount
onMounted(async () => {
	await nextTick()

	// Check if there's a cursor in URL for deep linking
	const cursor = route.query.cursor
	if (cursor) {
		const [block_number, index] = cursor.split('-')
		await loadTransactions({
			items_count: 20,
			block_number: parseInt(block_number),
			index: parseInt(index)
		})
	} else {
		await loadTransactions()
	}
})

useHead({
	title: "Transactions - Monad Explorer",
	link: [
		{
			rel: "canonical",
			href: `${useRequestURL().origin}${useRequestURL().pathname}`,
		},
	],
	meta: [
		{
			name: "description",
			content: "Browse all transactions on the Monad network. View transaction details, gas usage, and status.",
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
						{ link: '/transactions', name: 'Transactions' },
					]"
				/>
			</Flex>

			<Flex direction="column" gap="16">
				<Flex align="center" justify="between">
					<Flex align="center" gap="8">
						<Icon name="zap" size="16" color="primary" />
						<Text size="16" weight="600" color="primary">Transactions</Text>
					</Flex>

					<Flex align="center" gap="8">
						<Text size="13" weight="600" color="secondary">
							Page {{ currentPageNumber }}
						</Text>
					</Flex>
				</Flex>

				<Flex v-if="isLoading" align="center" justify="center" :class="$style.loading">
					<Text size="13" weight="600" color="secondary">Loading transactions...</Text>
				</Flex>

				<Flex v-else direction="column" gap="8" :class="$style.content">
					<!-- Desktop Table View -->
					<div :class="$style.desktop_table">
						<table :class="$style.table">
							<thead>
								<tr>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Hash</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Method</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Block</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Timestamp</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>From</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>To</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Value</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Gas</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Status</Text></th>
								</tr>
							</thead>

							<tbody>
								<tr v-for="tx in transactions" :key="tx.hash">
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Outline>
													<Flex align="center" gap="4">
														<Icon name="zap" size="12" color="primary" />
														<Text size="12" weight="600" color="primary" tabular>
															{{ shortHex(tx.hash) }}
														</Text>
													</Flex>
												</Outline>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ getEnhancedMethodName(tx) || tx.method || 'Transfer' }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${tx.block}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary" tabular>
													{{ comma(tx.block_number || tx.block) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex direction="column" gap="4">
												<Tooltip position="start" delay="500">
													<ClientOnlyTime fallback-text="..." fallback-size="11" fallback-color="primary">
														<Text size="11" weight="600" color="primary">
															{{ DateTime.fromISO(tx.timestamp).toRelative({ locale: "en", style: "short" }) }}
														</Text>
													</ClientOnlyTime>

													<template #content>
														{{ DateTime.fromISO(tx.timestamp).setLocale("en").toFormat("LLL d, t") }}
													</template>
												</Tooltip>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/address/${tx.from?.hash}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ shortHex(tx.from?.hash) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/address/${tx.to?.hash}`" v-if="tx.to">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ shortHex(tx.to.hash) }}
												</Text>
											</Flex>
										</NuxtLink>
										<Text v-else size="12" weight="600" color="tertiary">Contract Creation</Text>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ formatMonValue(tx.value) }} MON
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ formatGasValue(tx.gas_used) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Badge :color="tx.status === 'ok' ? 'green' : 'red'" size="mini">
													{{ tx.status === 'ok' ? 'Success' : 'Failed' }}
												</Badge>
											</Flex>
										</NuxtLink>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<!-- Mobile Card View -->
					<div :class="$style.mobile_cards">
						<div v-for="tx in transactions" :key="tx.hash" :class="$style.card">
							<NuxtLink :to="`/tx/${tx.hash}`" :class="$style.card_link">
								<Flex direction="column" gap="16">
									<!-- Header -->
									<Flex align="center" justify="between">
										<Flex align="center" gap="8">
											<Icon name="zap" size="14" color="primary" />
											<Text size="13" weight="600" color="primary">
												{{ shortHex(tx.hash) }}
											</Text>
										</Flex>
										<Badge :color="tx.status === 'ok' ? 'green' : 'red'" size="mini">
											{{ tx.status === 'ok' ? 'Success' : 'Failed' }}
										</Badge>
									</Flex>

									<!-- Details -->
									<Flex direction="column" gap="12">
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Block</Text>
											<Text size="12" weight="600" color="primary">
												{{ comma(tx.block_number || tx.block) }}
											</Text>
										</Flex>
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Method</Text>
											<Text size="12" weight="600" color="primary">
												{{ getEnhancedMethodName(tx) || tx.method || 'Transfer' }}
											</Text>
										</Flex>
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Value</Text>
											<Text size="12" weight="600" color="primary">
												{{ formatMonValue(tx.value) }} MON
											</Text>
										</Flex>
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Gas</Text>
											<Text size="12" weight="600" color="primary">
												{{ formatGasValue(tx.gas_used) }}
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
	min-width: 1200px;
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

/* Responsive */
@media (max-width: 1400px) {
	.table {
		min-width: 1000px;
		& thead th:nth-child(8),
		& tbody td:nth-child(8) {
			display: none;
		}
	}
}

@media (max-width: 1200px) {
	.table {
		min-width: 900px;
		& thead th:nth-child(7),
		& tbody td:nth-child(7) {
			display: none;
		}
	}
}

@media (max-width: 1000px) {
	.table {
		min-width: 800px;
		& thead th:nth-child(6),
		& tbody td:nth-child(6) {
			display: none;
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
