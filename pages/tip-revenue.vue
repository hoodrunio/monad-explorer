<script setup>
/** UI */
import Button from "@/components/ui/Button.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"
import ValidatorLogo from "@/components/ValidatorLogo.vue"

/** Components */
import TipRevenueTrendsChart from "@/components/modules/tip-revenue/TipRevenueTrendsChart.vue"

/** Services */
import { comma, shortHex } from "@/services/utils"

/** API */
import { fetchTipRevenueRankings, fetchNetworkTipSummary, fetchTipRevenueTrends } from "@/services/api/tipRevenue"
import { fetchGithubValidatorInfo } from "@/services/api/github"

const route = useRoute()
const router = useRouter()

useHead({
	title: "Tip Revenue - Monad Explorer",
	link: [
		{
			rel: "canonical",
			href: "/tip-revenue",
		},
	],
	meta: [
		{
			name: "description",
			content: "View validator tip revenue rankings and network-wide tip statistics on the Monad network.",
		},
	],
})

const isLoading = ref(true)
const rankings = ref([])
const networkSummary = ref(null)
const trends = ref([])

// Time window options
const timeWindows = ref([
	{ label: "24 Hours", value: "24h", hours: 24 },
	{ label: "7 Days", value: "7d", hours: 168 },
	{ label: "30 Days", value: "30d", hours: 720 },
])
const selectedTimeWindow = ref(route.query.window || "24h")

// Get hours for trends API based on selected window
const getTrendHours = computed(() => {
	const window = timeWindows.value.find(w => w.value === selectedTimeWindow.value)
	return window?.hours || 24
})

// Get label for current time window
const currentWindowLabel = computed(() => {
	const window = timeWindows.value.find(w => w.value === selectedTimeWindow.value)
	return window?.label || "24 Hours"
})

// Pagination
const page = ref(route.query.page ? parseInt(route.query.page) : 1)
const totalPages = ref(1)
const totalCount = ref(0)
const hasNextPage = computed(() => page.value < totalPages.value)
const hasPrevPage = computed(() => page.value > 1)

const fetchData = async () => {
	isLoading.value = true

	try {
		// Fetch all data in parallel
		const [rankingsRes, summaryRes, trendsRes, githubMap] = await Promise.all([
			fetchTipRevenueRankings({ page: page.value, window: selectedTimeWindow.value }),
			fetchNetworkTipSummary(),
			fetchTipRevenueTrends({ hours: getTrendHours.value }),
			fetchGithubValidatorInfo()
		])

		// Process rankings
		if (rankingsRes.data.value?.rankings) {
			const rawRankings = rankingsRes.data.value.rankings

			rankings.value = rawRankings.map(v => {
				const githubData = githubMap instanceof Map ? githubMap.get(v.validatorId) : null

				// Compute display name with proper fallback priority
				let preferredName
				if (githubData?.name) {
					preferredName = githubData.name
				} else if (v.validatorName && v.validatorName !== 'unknown') {
					preferredName = v.validatorName
				} else if (v.validatorId && v.validatorId.length > 16) {
					preferredName = `${v.validatorId.slice(0, 8)} ••• ${v.validatorId.slice(-8)}`
				} else {
					preferredName = v.validatorId || 'Unknown'
				}

				const preferredLogo = githubData?.logo || null

				return {
					...v,
					displayName: preferredName,
					logoUrl: preferredLogo
				}
			})

			// Update pagination
			const pagination = rankingsRes.data.value.pagination
			if (pagination) {
				totalPages.value = pagination.total_pages || 1
				totalCount.value = pagination.total_count || 0
			}
		}

		// Process network summary
		if (summaryRes.data.value) {
			networkSummary.value = summaryRes.data.value
		}

		// Process trends
		if (trendsRes.data.value?.trends) {
			trends.value = trendsRes.data.value.trends
		}
	} catch (error) {
		console.error('Error fetching tip revenue data:', error)
	} finally {
		isLoading.value = false
	}
}

const handleNext = () => {
	if (!hasNextPage.value) return
	page.value += 1
}

const handlePrev = () => {
	if (!hasPrevPage.value) return
	page.value -= 1
}

const formatMon = (value) => {
	if (!value) return '0'
	const num = parseFloat(value)
	return comma(num, ",", 2)
}

// Initialize data
await fetchData()

// Update URL and refetch when page or time window changes
watch([page, selectedTimeWindow], async () => {
	router.replace({
		query: {
			page: page.value > 1 ? page.value : undefined,
			window: selectedTimeWindow.value !== "24h" ? selectedTimeWindow.value : undefined
		}
	})
	await fetchData()
})
</script>

<template>
	<Flex direction="column" wide :class="$style.wrapper">
		<Flex align="end" justify="between" :class="$style.breadcrumbs">
			<Breadcrumbs
				:items="[
					{ link: '/', name: 'Dashboard' },
					{ link: '/tip-revenue', name: 'Tip Revenue' },
				]"
			/>
		</Flex>

		<Flex wide direction="column" gap="16">
			<!-- Header -->
			<Flex justify="between" :class="$style.header">
				<Flex align="center" gap="8">
					<Icon name="coins" size="16" color="secondary" />
					<Text as="h1" size="14" weight="600" color="primary">Tip Revenue</Text>
				</Flex>

				<Flex align="center" gap="6" :class="$style.controls">
					<!-- Time Window Selector -->
					<Dropdown>
						<template #trigger="{ isOpen }">
							<Button type="secondary" size="mini">
								{{ currentWindowLabel }}
								<Icon
									name="chevron"
									size="16"
									color="secondary"
									:style="{
										transform: `rotate(${!isOpen ? '0' : '180deg'})`,
										transition: 'all 200ms ease',
									}"
								/>
							</Button>
						</template>

						<template #popup>
							<DropdownItem
								v-for="window in timeWindows"
								:key="window.value"
								@click="selectedTimeWindow = window.value; page = 1"
							>
								{{ window.label }}
							</DropdownItem>
						</template>
					</Dropdown>

					<!-- Pagination -->
					<Flex align="center" gap="6" :class="$style.pagination">
						<Button @click="page = 1" type="secondary" size="mini" :disabled="!hasPrevPage">
							<Icon name="arrow-left-stop" size="12" color="primary" />
						</Button>
						<Button type="secondary" @click="handlePrev" size="mini" :disabled="!hasPrevPage">
							<Icon name="arrow-left" size="12" color="primary" />
						</Button>

						<Button type="secondary" size="mini" disabled>
							<Text size="12" weight="600" color="primary"> {{ page }} of {{ totalPages }} </Text>
						</Button>

						<Button @click="handleNext" type="secondary" size="mini" :disabled="!hasNextPage">
							<Icon name="arrow-right" size="12" color="primary" />
						</Button>
						<Button @click="page = totalPages" type="secondary" size="mini" :disabled="!hasNextPage">
							<Icon name="arrow-right-stop" size="12" color="primary" />
						</Button>
					</Flex>
				</Flex>
			</Flex>

			<!-- Network Summary (always 24h from API) -->
			<Flex v-if="networkSummary" gap="12" :class="$style.summary_bar">
				<Flex direction="column" gap="4" :class="$style.summary_item">
					<Text size="11" color="tertiary">Total Tips (24h)</Text>
					<Text size="16" weight="600" color="primary">{{ formatMon(networkSummary.totalTips24hMon) }} MON</Text>
				</Flex>
				<div :class="$style.divider" />
				<Flex direction="column" gap="4" :class="$style.summary_item">
					<Text size="11" color="tertiary">Avg Tip/Block</Text>
					<Text size="16" weight="600" color="primary">{{ formatMon(networkSummary.avgTipPerBlockMon) }} MON</Text>
				</Flex>
				<div :class="$style.divider" />
				<Flex direction="column" gap="4" :class="$style.summary_item">
					<Text size="11" color="tertiary">Total Blocks (24h)</Text>
					<Text size="16" weight="600" color="primary">{{ comma(networkSummary.totalBlocks24h) }}</Text>
				</Flex>
				<div :class="$style.divider" />
				<Flex direction="column" gap="4" :class="$style.summary_item">
					<Text size="11" color="tertiary">Total Transactions (24h)</Text>
					<Text size="16" weight="600" color="primary">{{ comma(networkSummary.totalTransactions24h) }}</Text>
				</Flex>
				<div :class="$style.divider" />
				<Flex v-if="networkSummary.topValidator" direction="column" gap="4" :class="$style.summary_item">
					<Text size="11" color="tertiary">Top Earner (24h)</Text>
					<NuxtLink :to="`/validator/${networkSummary.topValidator.validatorId}`">
						<Text size="14" weight="600" color="green">{{ networkSummary.topValidator.validatorName }}</Text>
					</NuxtLink>
				</Flex>
			</Flex>

			<!-- Skeleton for summary -->
			<Flex v-else-if="isLoading" gap="12" :class="$style.summary_bar">
				<div v-for="i in 5" :key="i" :class="$style.skeleton_item" />
			</Flex>

			<!-- Trends Chart -->
			<TipRevenueTrendsChart :data="trends" :loading="isLoading" :time-label="currentWindowLabel" />

			<!-- Rankings Table -->
			<Flex direction="column" gap="16" wide :class="[$style.table, isLoading && $style.disabled]">
				<div v-if="rankings.length" :class="$style.table_scroller">
					<table>
						<thead>
							<tr>
								<th :class="$style.col_rank"><Text size="12" weight="600" color="tertiary" noWrap>Rank</Text></th>
								<th :class="$style.col_validator"><Text size="12" weight="600" color="tertiary" noWrap>Validator</Text></th>
								<th :class="$style.col_tips"><Text size="12" weight="600" color="tertiary" noWrap>Total Tips ({{ currentWindowLabel }})</Text></th>
								<th :class="$style.col_blocks"><Text size="12" weight="600" color="tertiary" noWrap>Blocks</Text></th>
								<th :class="$style.col_avg"><Text size="12" weight="600" color="tertiary" noWrap>Avg Tip/Block</Text></th>
								<th :class="$style.col_txs"><Text size="12" weight="600" color="tertiary" noWrap>Transactions</Text></th>
								<th :class="$style.col_location"><Text size="12" weight="600" color="tertiary" noWrap>Location</Text></th>
							</tr>
						</thead>

						<tbody>
							<tr v-for="validator in rankings" :key="validator.validatorId">
								<td :class="$style.col_rank">
									<div :class="$style.cell_content">
										<Text size="13" weight="600" color="tertiary">#{{ validator.rank }}</Text>
									</div>
								</td>
								<td :class="$style.col_validator">
									<NuxtLink :to="`/validator/${validator.validatorId}`" :class="$style.cell_link">
										<Flex align="center" gap="8">
											<ValidatorLogo
												:logo-url="validator.logoUrl"
												:validator-name="validator.displayName"
												size="small"
											/>
											<Flex direction="column" gap="2">
												<Text size="13" weight="600" color="primary" mono>
													{{ validator.displayName }}
												</Text>
												<Text size="11" color="tertiary">
													{{ shortHex(validator.validatorId) }}
												</Text>
											</Flex>
										</Flex>
									</NuxtLink>
								</td>
								<td :class="$style.col_tips">
									<NuxtLink :to="`/validator/${validator.validatorId}`" :class="$style.cell_link">
										<Text size="13" weight="600" color="green">
											{{ formatMon(validator.totalTipMon) }} MON
										</Text>
									</NuxtLink>
								</td>
								<td :class="$style.col_blocks">
									<NuxtLink :to="`/validator/${validator.validatorId}`" :class="$style.cell_link">
										<Text size="13" weight="600" color="primary">
											{{ comma(validator.blocksProposed) }}
										</Text>
									</NuxtLink>
								</td>
								<td :class="$style.col_avg">
									<NuxtLink :to="`/validator/${validator.validatorId}`" :class="$style.cell_link">
										<Text size="13" weight="600" color="secondary">
											{{ formatMon(validator.avgTipPerBlockMon) }} MON
										</Text>
									</NuxtLink>
								</td>
								<td :class="$style.col_txs">
									<NuxtLink :to="`/validator/${validator.validatorId}`" :class="$style.cell_link">
										<Text size="13" color="tertiary">
											{{ comma(validator.totalTransactions) }}
										</Text>
									</NuxtLink>
								</td>
								<td :class="$style.col_location">
									<NuxtLink :to="`/validator/${validator.validatorId}`" :class="$style.cell_link">
										<Text size="12" color="tertiary">
											{{ validator.infrastructure?.location || 'Unknown' }}
										</Text>
									</NuxtLink>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<Flex v-else-if="!isLoading" direction="column" gap="20" align="center" :class="$style.empty">
					<Flex direction="column" gap="8" align="center">
						<Text size="13" weight="600" color="secondary"> No tip revenue data available </Text>
						<Text size="12" weight="400" color="tertiary"> Check back later for updated data </Text>
					</Flex>
				</Flex>
				<Flex v-else direction="column" gap="20" align="center" :class="$style.empty">
					<Text size="13" weight="600" color="secondary"> Loading tip revenue data... </Text>
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	padding: 20px 24px 60px 24px;
}

.breadcrumbs {
	margin-bottom: 16px;
}

.header {
	height: 46px;
	border-radius: 8px 8px 4px 4px;
	background: var(--card-background);
	padding: 0 16px;
}

.summary_bar {
	background: var(--card-background);
	border-radius: 8px;
	padding: 16px 20px;
	flex-wrap: wrap;
}

.summary_item {
	min-width: 120px;
}

.divider {
	width: 1px;
	height: 40px;
	background: var(--op-10);
}

.skeleton_item {
	width: 120px;
	height: 50px;
	background: var(--op-5);
	border-radius: 8px;
	animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
	0%, 100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}

.table_scroller {
	overflow-x: auto;
}

.table {
	border-radius: 4px 4px 8px 8px;
	background: var(--card-background);
	transition: all 0.2s ease;

	& table {
		width: calc(100% - 12px);
		height: fit-content;
		table-layout: fixed;
		border-spacing: 0px;
		padding-bottom: 12px;

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
			padding: 16px 16px 8px 16px;
			white-space: nowrap;
			vertical-align: middle;

			& span {
				display: flex;
			}
		}

		& tr td {
			padding: 0;
			white-space: nowrap;
			vertical-align: middle;
		}

		/* Column specific styles */
		& .col_rank {
			width: 60px;
		}

		& .col_validator {
			width: 220px;

			& .cell_link {
				overflow: hidden;
			}
		}

		& .col_tips {
			width: 150px;
		}

		& .col_blocks {
			width: 100px;
		}

		& .col_avg {
			width: 150px;
		}

		& .col_txs {
			width: 120px;
		}

		& .col_location {
			width: 150px;
		}
	}
}

.cell_content {
	display: flex;
	align-items: center;
	min-height: 44px;
	padding: 0 16px;
}

.cell_link {
	display: flex;
	align-items: center;
	min-height: 44px;
	padding: 0 16px;
}

.table.disabled {
	opacity: 0.5;
	pointer-events: none;
}

.empty {
	padding: 16px 0;
}

.pagination {
	gap: 6px;
}

@media (max-width: 768px) {
	.wrapper {
		padding: 20px 16px;
	}

	.header {
		flex-direction: column;
		gap: 12px;
		height: initial;
		padding: 12px;
	}

	.summary_bar {
		gap: 16px;
	}

	.divider {
		display: none;
	}

	.summary_item {
		min-width: 45%;
	}

	.table {
		& table {
			& .col_location {
				display: none;
			}

			& .col_txs {
				display: none;
			}
		}
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 32px 12px;
	}

	.header {
		gap: 8px;
		padding: 8px;
	}

	.pagination {
		gap: 3px;
	}

	.table {
		& table {
			& .col_rank {
				display: none;
			}

			& .col_avg {
				display: none;
			}

			& tr th {
				padding: 12px 8px 6px 12px;
			}
		}
	}

	.cell_content {
		min-height: 40px !important;
		padding: 0 8px 0 12px !important;
	}

	.cell_link {
		min-height: 40px !important;
		padding: 0 8px 0 12px !important;
	}
}
</style>
