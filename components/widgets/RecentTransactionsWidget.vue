<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

/** Services */
import { comma, shortHex } from "@/services/utils"

/** API */
import { fetchTransactions } from "@/services/api/tx"

const isRefreshing = ref(false)

// Ensure transactions is always an array
const transactions = ref([])
watch(transactions, (newTransactions) => {
	if (!Array.isArray(newTransactions)) {
		transactions.value = []
	}
}, { immediate: true })

const formatGasValue = (value) => {
	if (!value) return "0"
	return comma(value)
}

const getTransactionType = (tx) => {
	if (!tx) return "Unknown"
	if (tx.isContractCreation) return "Create"
	if (tx.isContractInteraction) return "Call"
	return "Transfer"
}

// Use server-side data fetching for initial load
const { data: initialData, pending: isLoading } = await useAsyncData('recent-transactions', async () => {
	try {
		const { data } = await fetchTransactions({ limit: 10 })
		const response = data?.value?.data
		const txList = Array.isArray(response?.transactions) ? response.transactions : []
		
		return txList.map(tx => ({
			...tx,
			status: tx.status === 1 ? "success" : "failed",
		}))
	} catch (error) {
		return []
	}
}, {
	// Cache for 30 seconds on server side  
	server: true,
	default: () => [],
	ttl: 30000
})

// Set initial data
watch(initialData, (newData) => {
	if (newData) {
		transactions.value = newData
	}
}, { immediate: true })

const getTransactions = async (isInitial = false) => {
	if (isInitial) {
		// Already loaded via useAsyncData
		return
	}
	
	isRefreshing.value = true
	
	try {
		const { data } = await fetchTransactions({ limit: 10 })
		const response = data?.value?.data
		const txList = Array.isArray(response?.transactions) ? response.transactions : []
		
		// Add a small delay for smooth transition
		if (transactions.value.length > 0) {
			await new Promise(resolve => setTimeout(resolve, 100))
		}
		
		transactions.value = txList.map(tx => ({
			...tx,
			status: tx.status === 1 ? "success" : "failed",
		}))
	} catch (error) {
		// Don't clear existing data on refresh error
	}
	
	isRefreshing.value = false
}

// Initial data fetch and refresh setup
let refreshInterval = null

onMounted(async () => {
	// Data already loaded via useAsyncData, just start refresh interval
	refreshInterval = setInterval(() => getTransactions(false), 5000)
})

onUnmounted(() => {
	if (refreshInterval) {
		clearInterval(refreshInterval)
		refreshInterval = null
	}
})
</script>

<template>
	<Flex direction="column" gap="16" :class="$style.wrapper">
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="tx" size="16" color="primary" />
				<Text size="16" weight="600" color="primary">Recent Transactions</Text>
				<div v-if="isRefreshing" :class="$style.refresh_indicator">
					<Icon name="refresh" size="12" color="secondary" :class="$style.spinning" />
				</div>
			</Flex>
			
			<NuxtLink to="/transactions">
				<Flex align="center" gap="4" :class="$style.view_all">
					<Text size="12" weight="600" color="secondary">View All</Text>
					<Icon name="chevron" size="12" color="secondary" style="transform: rotate(-90deg)" />
				</Flex>
			</NuxtLink>
		</Flex>

		<div v-if="isLoading" :class="$style.loading">
			<Text size="13" weight="600" color="tertiary">Loading recent transactions...</Text>
		</div>

		<div v-else-if="transactions && transactions.length" :class="[$style.table_wrapper, isRefreshing && $style.refreshing]">
			<transition name="fade" mode="out-in">
				<table :key="transactions.length" :class="$style.table">
					<thead>
						<tr>
							<th><Text size="12" weight="600" color="tertiary">Hash</Text></th>
							<th><Text size="12" weight="600" color="tertiary">Type</Text></th>
							<th><Text size="12" weight="600" color="tertiary">Block</Text></th>
							<th><Text size="12" weight="600" color="tertiary">Gas</Text></th>
						</tr>
					</thead>

					<transition-group name="list-item" tag="tbody">
						<tr v-for="(tx, index) in transactions" :key="tx?.hash || `tx-${index}`">
								<td v-if="tx?.hash">
									<NuxtLink :to="`/tx/${tx.hash}`">
										<Tooltip position="start" delay="500">
											<Flex align="center" gap="8">
												<Icon
													:name="tx.status === 'success' ? 'check-circle' : 'close-circle'"
													size="13"
													:color="tx.status === 'success' ? 'green' : 'red'"
												/>
												<Text size="13" weight="600" color="primary" mono>
													{{ shortHex(tx.hash) }}
												</Text>
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
												</Flex>
											</template>
										</Tooltip>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/tx/${tx?.hash || '#'}`">
										<Text size="13" weight="600" color="primary">
											{{ getTransactionType(tx || {}) }}
										</Text>
									</NuxtLink>
								</td>
								<td v-if="tx?.blockNumber">
									<NuxtLink :to="`/block/${tx.blockNumber}`">
										<Flex align="center" gap="6">
											<Icon name="block" size="14" color="secondary" />
											<Text size="13" weight="600" color="primary" tabular>
												{{ comma(tx.blockNumber) }}
											</Text>
										</Flex>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/tx/${tx?.hash || '#'}`">
										<Text size="13" weight="600" color="primary">
											{{ formatGasValue(tx?.gasUsed) }}
										</Text>
									</NuxtLink>
								</td>
							</tr>
						</transition-group>
				</table>
			</transition>
		</div>

		<div v-else :class="$style.empty">
			<Text size="13" weight="600" color="tertiary">No recent transactions found</Text>
		</div>
	</Flex>
</template>

<style module>
.wrapper {
	background: var(--card-background);
	border-radius: 8px;
	padding: 16px;
	height: 500px;
	min-height: 500px;
	display: flex;
	flex-direction: column;
}

.header {
	padding-bottom: 8px;
	border-bottom: 1px solid var(--op-5);
}

.view_all {
	cursor: pointer;
	transition: all 0.1s ease;
	padding: 4px 8px;
	border-radius: 4px;
}

.view_all:hover {
	background: var(--op-5);
}

.loading,
.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	min-height: 200px;
}

.table_wrapper {
	width: 100%;
	overflow-x: auto;
	flex: 1;
	position: relative;
}

.table {
	width: 100%;
	border-spacing: 0;
	
	& thead th {
		text-align: left;
		padding: 8px 12px;
		border-bottom: 1px solid var(--op-5);
		
		&:first-child {
			padding-left: 0;
		}
		
		&:last-child {
			padding-right: 0;
		}
	}
	
	& tbody {
		& tr {
			cursor: pointer;
			transition: all 0.05s ease;
			
			&:hover {
				background: var(--op-3);
			}
			
			&:active {
				background: var(--op-5);
			}
		}
		
		& td {
			padding: 12px 12px;
			white-space: nowrap;
			border-bottom: 1px solid var(--op-3);
			
			&:first-child {
				padding-left: 0;
			}
			
			&:last-child {
				padding-right: 0;
			}
			
			& > a {
				display: flex;
				align-items: center;
				width: 100%;
				color: inherit;
				text-decoration: none;
			}
		}
	}
}

/* Refresh indicator */
.refresh_indicator {
	display: flex;
	align-items: center;
	justify-content: center;
}

.spinning {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

/* Table refreshing state */
.refreshing {
	opacity: 0.7;
	transition: opacity 0.3s ease;
}

/* Prevent layout shifts during transitions */
.table_wrapper .table {
	position: relative;
	width: 100%;
	height: 100%;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

/* List item transitions */
.list-item-enter-active,
.list-item-leave-active {
	transition: all 0.3s ease;
	will-change: transform, opacity;
}

.list-item-enter-from {
	opacity: 0;
	transform: translateY(-10px);
}

.list-item-leave-to {
	opacity: 0;
	transform: translateY(10px);
}

.list-item-move {
	transition: transform 0.3s ease;
	will-change: transform;
}

/* Force GPU acceleration for smoother animations */
.fade-enter-active,
.fade-leave-active,
.list-item-enter-active,
.list-item-leave-active {
	backface-visibility: hidden;
	transform: translateZ(0);
}

@media (max-width: 768px) {
	.wrapper {
		padding: 12px;
	}
	
	.table {
		font-size: 12px;
	}
}
</style> 