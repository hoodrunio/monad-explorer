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

const route = useRoute()
const router = useRouter()

const blocks = ref([])
const currentPage = ref(parseInt(route.query.page) || 1)
const pageSize = ref(20)
const totalBlocks = ref(0)
const isLoading = ref(false)

// EVM block helper functions
const formatGasValue = (value) => {
	if (!value) return "0"
	return comma(value)
}

const getGasUsagePercent = (gasUsed, gasLimit) => {
	if (!gasLimit || gasLimit === "0") return 0
	return Math.min((parseInt(gasUsed) / parseInt(gasLimit)) * 100, 100)
}

const loadBlocks = async (page = 1) => {
	isLoading.value = true
	
	try {
		const { data, error } = await fetchBlocks({
			limit: pageSize.value,
			page: page,
			offset: (page - 1) * pageSize.value
		})
		
		if (error.value) {
			blocks.value = []
			totalBlocks.value = 0
		} else if (data.value && data.value.data) {
			blocks.value = data.value.data.blocks || []
			totalBlocks.value = data.value.data.pagination?.total || blocks.value.length
			currentPage.value = page
		} else {
			blocks.value = []
			totalBlocks.value = 0
		}
	} catch (error) {
		blocks.value = []
		totalBlocks.value = 0
	} finally {
		isLoading.value = false
	}
}

const handlePageChange = (page) => {
	currentPage.value = page
	router.push({ query: { page } })
	loadBlocks(page)
}

const handleNext = () => {
	if (currentPage.value * pageSize.value < totalBlocks.value) {
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
	return Math.ceil(totalBlocks.value / pageSize.value)
})

// Load blocks on mount
onMounted(async () => {
	await nextTick()
	loadBlocks(currentPage.value)
})

// Watch for route changes
watch(() => route.query.page, (newPage) => {
	const page = parseInt(newPage) || 1
	if (page !== currentPage.value) {
		loadBlocks(page)
	}
}, { immediate: true })

// Additional handler for page refresh
onActivated(() => {
	loadBlocks(currentPage.value)
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
							{{ totalBlocks.toLocaleString() }} total blocks
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
								<tr v-for="block in blocks" :key="block.number">
									<td>
										<NuxtLink :to="`/block/${block.number}`">
											<Flex align="center">
												<Outline>
													<Flex align="center" gap="4">
														<Icon name="block" size="12" color="primary" />
														<Text size="12" weight="600" color="primary" tabular>
															{{ comma(block.number) }}
														</Text>
													</Flex>
												</Outline>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.number}`">
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
										<NuxtLink :to="`/block/${block.number}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ comma(block.transactionCount || 0) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.number}`">
											<Flex align="center" gap="2">
												<Text size="12" weight="600" color="primary">
													{{ formatGasValue(block.gasUsed) }}
												</Text>
												<Text size="11" weight="600" color="tertiary">
													({{ getGasUsagePercent(block.gasUsed, block.gasLimit).toFixed(1) }}%)
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.number}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ formatGasValue(block.gasLimit) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.number}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ formatBytes(block.size, 0) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.number}`">
											<Flex align="center">
												<Text size="12" weight="600" color="primary">
													{{ formatGasValue(block.baseFeePerGas) }}
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
						<div v-for="block in blocks" :key="block.number" :class="$style.card">
							<NuxtLink :to="`/block/${block.number}`" :class="$style.card_link">
								<Flex direction="column" gap="16">
									<!-- Header with block number and timestamp -->
									<Flex align="center" justify="between">
										<Flex align="center" gap="8">
											<Icon name="block" size="14" color="primary" />
											<Text size="13" weight="600" color="primary">
												Block {{ comma(block.number) }}
											</Text>
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
												{{ comma(block.transactionCount || 0) }}
											</Text>
										</Flex>
										<Flex align="center" justify="between">
											<Text size="12" weight="600" color="tertiary">Gas Used</Text>
											<Flex align="center" gap="4">
												<Text size="12" weight="600" color="primary">
													{{ formatGasValue(block.gasUsed) }}
												</Text>
												<Text size="11" weight="600" color="tertiary">
													({{ getGasUsagePercent(block.gasUsed, block.gasLimit).toFixed(1) }}%)
												</Text>
											</Flex>
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
												{{ formatGasValue(block.baseFeePerGas) }}
											</Text>
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