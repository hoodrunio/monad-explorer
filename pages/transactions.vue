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
import MessageTypeBadge from "@/components/shared/MessageTypeBadge.vue"

const route = useRoute()
const router = useRouter()

const transactions = ref([])
const currentPage = ref(parseInt(route.query.page) || 1)
const pageSize = ref(20)
const totalTransactions = ref(0)
const isLoading = ref(false)

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
	// Convert wei to MON (divide by 10^18)
	const monValue = parseInt(value) / Math.pow(10, 18)
	return monValue.toFixed(6)
}

const getTransactionType = (tx) => {
	if (tx.isContractCreation) return "Contract Creation"
	if (tx.isContractInteraction) return "Contract Call"
	if(tx.toAddress && tx.value !== "0") return "Mon Transfer"
	if (tx.toAddress) return "Transfer"
	return "Unknown"
}

// MessageTypeBadge için array format
const getTransactionTypes = (tx) => {
	return [getTransactionType(tx)]
}

// Get enhanced method name for a transaction
const getEnhancedMethodName = (tx) => {
	if (!tx.methodID) return null
	
	const methodInfo = methodInfoMap.value.get(tx.methodID)
	return methodInfo?.methodName || tx.methodName || null
}

// Check if transaction can be decoded
const canDecodeTransaction = (tx) => {
	if (!tx.methodID) return false
	
	const methodInfo = methodInfoMap.value.get(tx.methodID)
	return methodInfo?.canDecode || false
}



const loadTransactions = async (page = 1) => {
	isLoading.value = true
	
	try {
		const { data, error } = await fetchTransactions({
			limit: pageSize.value,
			page: page,
			offset: (page - 1) * pageSize.value
		})
		
		if (error.value) {
			transactions.value = []
			totalTransactions.value = 0
			methodInfoMap.value.clear()
		} else if (data.value && data.value.data) {
			transactions.value = data.value.data.transactions || []
			totalTransactions.value = data.value.data.pagination?.total || transactions.value.length
			currentPage.value = page
			
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
			totalTransactions.value = 0
			methodInfoMap.value.clear()
		}
	} catch (error) {
		transactions.value = []
		totalTransactions.value = 0
		methodInfoMap.value.clear()
	} finally {
		isLoading.value = false
	}
}

const handlePageChange = (page) => {
	currentPage.value = page
	router.push({ query: { page } })
	loadTransactions(page)
}

const handleNext = () => {
	if (currentPage.value * pageSize.value < totalTransactions.value) {
		handlePageChange(currentPage.value + 1)
	}
}

const handlePrev = () => {
	if (currentPage.value > 1) {
		handlePageChange(currentPage.value - 1)
	}
}

const handleFirst = () => {
	if (currentPage.value > 1) {
		handlePageChange(1)
	}
}

const totalPages = computed(() => {
	return Math.ceil(totalTransactions.value / pageSize.value)
})

// Load transactions on mount
onMounted(async () => {
	await nextTick()
	loadTransactions(currentPage.value)
})

// Watch for route changes
watch(() => route.query.page, (newPage) => {
	const page = parseInt(newPage) || 1
	if (page !== currentPage.value) {
		loadTransactions(page)
	}
}, { immediate: true })

// Additional handler for page refresh
onActivated(() => {
	loadTransactions(currentPage.value)
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
			content: "Browse all transactions on the Monad network. View transaction details, gas usage, token transfers, and more.",
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
						<Icon name="tx" size="16" color="primary" />
						<Text size="16" weight="600" color="primary">Transactions</Text>
					</Flex>
					
					<Flex align="center" gap="8">
						<Text size="13" weight="600" color="secondary">
							{{ totalTransactions.toLocaleString() }} total transactions
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
									<th><Text size="11" weight="600" color="tertiary" noWrap>Block</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Type</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>From</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>To</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Value</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Gas</Text></th>
									<th><Text size="11" weight="600" color="tertiary" noWrap>Time</Text></th>
								</tr>
							</thead>

							<tbody>
								<tr v-for="tx in transactions" :key="tx.hash">
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Outline>
													<Flex align="center" gap="6">
														<Icon 
															:name="(tx.status === 'success' || tx.status === 1) ? 'check' : 'close'" 
															size="10" 
															:color="(tx.status === 'success' || tx.status === 1) ? 'green' : 'red'" 
														/>
														<Icon name="tx" size="12" color="primary" />
														<Text size="12" weight="600" color="primary" mono>
															{{ shortHex(tx.hash) }}
														</Text>
													</Flex>
												</Outline>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${tx.blockNumber}`">
											<Flex align="center">
												<Outline>
													<Flex align="center" gap="4">
														<Icon name="block" size="12" color="secondary" />
														<Text size="12" weight="600" color="primary" tabular>
															{{ comma(tx.blockNumber) }}
														</Text>
													</Flex>
												</Outline>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center" gap="6">
												<MessageTypeBadge :types="getTransactionTypes(tx)" compact />
												<Flex v-if="getEnhancedMethodName(tx)" align="center" gap="4">
													<Text size="11" weight="500" color="tertiary">
														{{ getEnhancedMethodName(tx) }}
													</Text>
													<Icon v-if="canDecodeTransaction(tx)" name="code" size="10" color="green" />
												</Flex>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary" mono>
													{{ shortHex(tx.fromAddress) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary" mono>
													{{ tx.toAddress ? shortHex(tx.toAddress) : "—" }}
												</Text>
											</Flex>
										</NuxtLink>
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
													{{ formatGasValue(tx.gasUsed) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
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
								</tr>
							</tbody>
						</table>
					</div>

					<!-- Mobile Card View -->
					<div :class="$style.mobile_cards">
						<div v-for="tx in transactions" :key="tx.hash" :class="$style.card">
							<NuxtLink :to="`/tx/${tx.hash}`" :class="$style.card_link">
								<Flex direction="column" gap="16">
									<!-- Header with hash and status -->
									<Flex align="center" justify="between">
										<Flex align="center" gap="8">
											<Icon 
												:name="(tx.status === 'success' || tx.status === 1) ? 'check' : 'close'" 
												size="12" 
												:color="(tx.status === 'success' || tx.status === 1) ? 'green' : 'red'" 
											/>
											<Icon name="tx" size="14" color="primary" />
											<Text size="13" weight="600" color="primary" mono>
												{{ shortHex(tx.hash) }}
											</Text>
										</Flex>
									</Flex>

									<!-- Transaction details -->
									<Flex direction="column" gap="12">
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">From</Text>
											<Text size="12" weight="600" color="primary" mono>
												{{ shortHex(tx.fromAddress) }}
											</Text>
										</Flex>
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">To</Text>
											<Text size="12" weight="600" color="primary" mono>
												{{ tx.toAddress ? shortHex(tx.toAddress) : "—" }}
											</Text>
										</Flex>
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Value</Text>
											<Text size="12" weight="600" color="primary">
												{{ formatMonValue(tx.value) }} MON
											</Text>
										</Flex>
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Block</Text>
											<Text size="12" weight="600" color="primary">
												{{ comma(tx.blockNumber) }}
											</Text>
										</Flex>
										<Flex v-if="getEnhancedMethodName(tx)" align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Method</Text>
											<Flex align="center" gap="4">
												<Text size="12" weight="600" color="primary">
													{{ getEnhancedMethodName(tx) }}
												</Text>
												<Icon v-if="canDecodeTransaction(tx)" name="code" size="10" color="green" />
											</Flex>
										</Flex>
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Time</Text>
											<ClientOnlyTime fallback-text="..." fallback-size="12" fallback-color="primary">
												<Text size="12" weight="600" color="primary">
													{{ DateTime.fromISO(tx.timestamp).toRelative({ locale: "en", style: "short" }) }}
												</Text>
											</ClientOnlyTime>
										</Flex>
									</Flex>
								</Flex>
							</NuxtLink>
						</div>
					</div>

					<!-- Pagination -->
					<Flex v-if="totalPages > 1" align="center" justify="center" gap="8" :class="$style.pagination">
						<Button @click="handleFirst" type="secondary" size="mini" :disabled="currentPage === 1">
							<Icon name="arrow-left-stop" size="12" color="primary" />
						</Button>
						
						<Button @click="handlePrev" type="secondary" size="mini" :disabled="currentPage === 1">
							<Icon name="arrow-left" size="12" color="primary" />
						</Button>

						<Flex align="center" gap="4">
							<Text size="12" weight="600" color="secondary">
								Page {{ currentPage }} of {{ totalPages }}
							</Text>
						</Flex>

						<Button @click="handleNext" type="secondary" size="mini" :disabled="currentPage >= totalPages">
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
				padding: 12px 12px 6px 12px;
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
			padding: 6px 12px 6px 12px;
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
@media (max-width: 1400px) {
	.table {
		min-width: 900px;
		& thead th:nth-child(3),
		& tbody td:nth-child(3) {
			display: none; /* Hide Type column */
		}
	}
}

@media (max-width: 1200px) {
	.table {
		min-width: 800px;
		& thead th:nth-child(7),
		& tbody td:nth-child(7) {
			display: none; /* Hide Gas column */
		}
	}
}

@media (max-width: 1024px) {
	.table {
		min-width: 700px;
		& thead th:nth-child(2),
		& tbody td:nth-child(2) {
			display: none; /* Hide Block column */
		}
	}
}

@media (max-width: 900px) {
	.table {
		min-width: 600px;
		& thead th:nth-child(5),
		& tbody td:nth-child(5) {
			display: none; /* Hide To column */
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