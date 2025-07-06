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
		{
			property: "og:title",
			content: "Blocks - Monad Explorer",
		},
		{
			property: "og:description",
			content: "Browse all blocks on the Monad network. View block details, transactions, gas usage, and timestamps.",
		},
		{
			property: "og:url",
			content: `${useRequestURL().origin}${useRequestURL().pathname}`,
		},
		{
			name: "twitter:title",
			content: "Blocks - Monad Explorer",
		},
		{
			name: "twitter:description",
			content: "Browse all blocks on the Monad network. View block details, transactions, gas usage, and timestamps.",
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
						{ link: '/blocks', name: 'Blocks' },
					]"
				/>
			</Flex>

			<Flex direction="column" gap="24">
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

				<Flex v-else direction="column" gap="16" :class="$style.content">
					<div :class="$style.table_wrapper">
						<table :class="$style.table">
							<thead>
								<tr>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Block Number</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Timestamp</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Transactions</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Gas Used</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Gas Limit</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Size</Text></th>
									<th><Text size="12" weight="600" color="tertiary" noWrap>Base Fee</Text></th>
								</tr>
							</thead>

							<tbody>
								<tr v-for="block in blocks" :key="block.number">
									<td style="width: 1px">
										<NuxtLink :to="`/block/${block.number}`">
											<Flex align="center">
												<Outline>
													<Flex align="center" gap="6">
														<Icon name="block" size="14" color="primary" />
														<Text size="13" weight="600" color="primary" tabular>
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
													<Text size="12" weight="600" color="primary">
														{{ DateTime.fromISO(block.timestamp).toRelative({ locale: "en", style: "short" }) }}
													</Text>

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
												<Text size="13" weight="600" color="primary">
													{{ comma(block.transactionCount || 0) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.number}`">
											<Flex align="center" gap="4">
												<Text size="13" weight="600" color="primary">
													{{ formatGasValue(block.gasUsed) }}
												</Text>
												<Text size="12" weight="600" color="tertiary">
													({{ getGasUsagePercent(block.gasUsed, block.gasLimit).toFixed(1) }}%)
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.number}`">
											<Flex align="center">
												<Text size="13" weight="600" color="primary">
													{{ formatGasValue(block.gasLimit) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.number}`">
											<Flex align="center">
												<Text size="13" weight="600" color="primary">
													{{ formatBytes(block.size, 0) }}
												</Text>
											</Flex>
										</NuxtLink>
									</td>
									<td>
										<NuxtLink :to="`/block/${block.number}`">
											<Flex align="center">
												<Text size="13" weight="600" color="primary">
													{{ formatGasValue(block.baseFeePerGas) }}
												</Text>
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