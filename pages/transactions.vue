<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** Services */
import { comma, shortHex } from "@/services/utils"

/** API */
import { fetchTransactions } from "@/services/api/tx"

/** Components */
import Tooltip from "@/components/ui/Tooltip.vue"
import Button from "@/components/ui/Button.vue"
import Badge from "@/components/ui/Badge.vue"

const route = useRoute()
const router = useRouter()

const transactions = ref([])
const currentPage = ref(parseInt(route.query.page) || 1)
const pageSize = ref(20)
const totalTransactions = ref(0)
const isLoading = ref(false)

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
	if (tx.toAddress) return "Transfer"
	return "Unknown"
}

const getStatusColor = (status) => {
	return status === "success" || status === 1 ? "green" : "red"
}

const getStatusText = (status) => {
	return status === "success" || status === 1 ? "Success" : "Failed"
}

const loadTransactions = async (page = 1) => {
	isLoading.value = true
	
	try {
		const { data } = await fetchTransactions({
			limit: pageSize.value,
			page: page,
			offset: (page - 1) * pageSize.value
		})
		
		if (data.value && data.value.data) {
			transactions.value = data.value.data.transactions || []
			totalTransactions.value = data.value.data.pagination?.total || transactions.value.length
			currentPage.value = page
		}
	} catch (error) {
		console.error("Error loading transactions:", error)
		transactions.value = []
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
onMounted(() => {
	loadTransactions(currentPage.value)
})

// Watch for route changes
watch(() => route.query.page, (newPage) => {
	const page = parseInt(newPage) || 1
	if (page !== currentPage.value) {
		loadTransactions(page)
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
			content: "Browse all transactions on the Monad network. View transaction details, gas usage, token transfers, and more.",
		},
		{
			property: "og:title",
			content: "Transactions - Monad Explorer",
		},
		{
			property: "og:description",
			content: "Browse all transactions on the Monad network. View transaction details, gas usage, token transfers, and more.",
		},
		{
			property: "og:url",
			content: `${useRequestURL().origin}${useRequestURL().pathname}`,
		},
		{
			name: "twitter:title",
			content: "Transactions - Monad Explorer",
		},
		{
			name: "twitter:description",
			content: "Browse all transactions on the Monad network. View transaction details, gas usage, token transfers, and more.",
		},
		{
			name: "twitter:card",
			content: "summary_large_image",
		},
	],
})
</script>

<template>
	<Flex direction="column" gap="32" wide :class="$style.wrapper">
		<Flex direction="column" gap="16">
			<Flex align="end" justify="between" :class="$style.header">
				<Breadcrumbs
					:items="[
						{ link: '/', name: 'Dashboard' },
						{ link: '/transactions', name: 'Transactions' },
					]"
				/>
			</Flex>

			<Flex direction="column" gap="24">
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

				<Flex v-else direction="column" gap="16" :class="$style.content">
					<div :class="$style.table_wrapper">
						<table :class="$style.table">
							<thead>
								<tr>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Transaction Hash</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Status</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Block</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Type</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>From</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>To</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Value</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Gas Used</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Timestamp</Text></th>
								</tr>
							</thead>

							<tbody>
								<tr v-for="tx in transactions" :key="tx.hash">
									<td style="width: 1px">
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Outline>
													<Flex align="center" gap="6">
														<Icon name="tx" size="14" color="primary" />
														<Text size="13" weight="600" color="primary" mono>
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
												<Badge size="small" :color="getStatusColor(tx.status)">
													<Text size="11" weight="600" color="primary">
														{{ getStatusText(tx.status) }}
													</Text>
												</Badge>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${tx.blockNumber}`">
											<Flex align="center">
												<Outline>
													<Flex align="center" gap="6">
														<Icon name="block" size="14" color="secondary" />
														<Text size="13" weight="600" color="primary" tabular>
															{{ comma(tx.blockNumber) }}
														</Text>
													</Flex>
												</Outline>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Text size="13" weight="600" color="primary">
													{{ getTransactionType(tx) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Text size="13" weight="600" color="primary" mono>
													{{ shortHex(tx.fromAddress) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Text size="13" weight="600" color="primary" mono>
													{{ tx.toAddress ? shortHex(tx.toAddress) : "—" }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Text size="13" weight="600" color="primary">
													{{ formatMonValue(tx.value) }} MON
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Text size="13" weight="600" color="primary">
													{{ formatGasValue(tx.gasUsed) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/tx/${tx.hash}`">
											<Flex align="center">
												<Tooltip position="start" delay="500">
													<Text size="12" weight="600" color="primary">
														{{ DateTime.fromISO(tx.timestamp).toRelative({ locale: "en", style: "short" }) }}
													</Text>

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

.table_wrapper {
	overflow-x: auto;
}

.table {
	width: 100%;
	border-spacing: 0;
	
	& thead {
		& tr {
			& th {
				text-align: left;
				padding: 16px 24px 8px 16px;
				border-bottom: 1px solid var(--op-5);
				
				&:first-child {
					padding-left: 24px;
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
			padding: 12px 24px 12px 16px;
			white-space: nowrap;
			border-bottom: 1px solid var(--op-3);
			
			&:first-child {
				padding-left: 24px;
			}
			
			& > a {
				display: flex;
				align-items: center;
				min-height: 32px;
			}
		}
	}
}

.loading {
	padding: 60px 20px;
	text-align: center;
}

.pagination {
	padding: 16px;
	border-top: 1px solid var(--op-5);
}

@media (max-width: 500px) {
	.wrapper {
		padding: 32px 12px;
	}
	
	.table {
		& thead th,
		& tbody td {
			padding-left: 12px;
			padding-right: 12px;
		}
	}
}
</style> 