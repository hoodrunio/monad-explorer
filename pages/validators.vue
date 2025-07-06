<script setup>
/** UI */
import Button from "@/components/ui/Button.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"
import BookmarkButton from "@/components/BookmarkButton.vue"

/** Services */
import { capitilize, comma, shortHex } from "@/services/utils"

/** API */
import { fetchValidatorRankings } from "@/services/api/validator"

const route = useRoute()
const router = useRouter()

useHead({
	title: "Validators - Monad Explorer",
	link: [
		{
			rel: "canonical",
			href: "/validators",
		},
	],
	meta: [
		{
			name: "description",
			content:
				"View all validators in the Monad network. Monitor validator performance, uptime scores, QC participation rates, and infrastructure details.",
		},
		{
			property: "og:title",
			content: "Validators - Monad Explorer",
		},
		{
			property: "og:description",
			content:
				"View all validators in the Monad network. Monitor validator performance, uptime scores, QC participation rates, and infrastructure details.",
		},
		{
			property: "og:url",
			content: "/validators",
		},
		{
			property: "og:image",
			content: "/img/seo/validators.png",
		},
		{
			name: "twitter:title",
			content: "Validators - Monad Explorer",
		},
		{
			name: "twitter:description",
			content:
				"View all validators in the Monad network. Monitor validator performance, uptime scores, QC participation rates, and infrastructure details.",
		},
		{
			name: "twitter:card",
			content: "summary_large_image",
		},
		{
			name: "twitter:image",
			content: "/img/seo/validators.png",
		},
	],
})

const isLoading = ref(false)
const validators = ref([])

// Time window options
const timeWindows = ref([
	{ label: "7 Days", value: "7d" },
	{ label: "30 Days", value: "30d" },
])
const selectedTimeWindow = ref(route.query.window || "7d")

// Sort options 
const sortOptions = ref([
	{ label: "Uptime Score", value: "uptime_score" },
	{ label: "Stake", value: "stake" },
	{ label: "QC Participation", value: "qc_participation_rate" },
	{ label: "Block Proposals", value: "block_proposal_ratio" },
])
const selectedSort = ref(route.query.sortBy || "uptime_score")

// Pagination
const page = ref(route.query.page ? parseInt(route.query.page) : 1)
const limit = ref(50)
const totalValidators = ref(0)
const totalPages = ref(1)
const hasNextPage = ref(false)
const hasPrevPage = ref(false)
const pages = computed(() => totalPages.value || 1)

const getValidators = async () => {
	isLoading.value = true

	try {
		const { data } = await fetchValidatorRankings({
			limit: limit.value,
			sortBy: selectedSort.value,
			window: selectedTimeWindow.value,
			page: page.value
		})

		if (data.value?.data) {
			validators.value = data.value.data.map(validator => ({
				rank: validator.rank || 0,
				validatorId: validator.validator_id || '',
				name: validator.infrastructure?.validator_name || shortHex(validator.validator_id || ''),
				stake: validator.stake || 0,
				uptimeScore: validator.metrics?.uptime_score || 0,
				qcParticipationRate: validator.metrics?.qc_participation_rate || 0,
				blockProposalRatio: validator.metrics?.block_proposal_ratio || 0,
				provider: validator.infrastructure?.provider || 'Unknown',
				location: validator.infrastructure?.location || 'Unknown',
				blocksProposed: validator.details?.blocks_proposed || 0,
				totalBlockOpportunities: validator.details?.total_block_opportunities || 0,
				qcParticipations: validator.details?.qc_participations || 0,
				totalQcOpportunities: validator.details?.total_qc_opportunities || 0
			}))

			// Handle pagination metadata
			if (data.value?.pagination) {
				const pagination = data.value.pagination
				totalValidators.value = parseInt(pagination.total_count || 0)
				totalPages.value = pagination.total_pages || 1
				hasNextPage.value = pagination.has_next_page || false
				hasPrevPage.value = pagination.has_prev_page || false
			}
		}
	} catch (error) {
		console.error('Error fetching validators:', error)
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

const formatPercentage = (value) => {
	return `${value.toFixed(1)}%`
}

const getPerformanceColor = (score) => {
	if (score >= 99) return 'green'
	if (score >= 95) return 'yellow'
	return 'red'
}

// Initialize data
await getValidators()

// Update URL and refetch when parameters change
watch([page, selectedSort, selectedTimeWindow], async () => {
	await getValidators()
	
	router.replace({ 
		query: { 
			page: page.value,
			sortBy: selectedSort.value,
			window: selectedTimeWindow.value
		} 
	})
})

// Handle URL query changes
watch(
	() => route.query,
	() => {
		if (route.query.page) page.value = parseInt(route.query.page)
		if (route.query.sortBy) selectedSort.value = route.query.sortBy
		if (route.query.window) selectedTimeWindow.value = route.query.window
	},
)

onMounted(() => {
	router.replace({ 
		query: { 
			page: page.value,
			sortBy: selectedSort.value,
			window: selectedTimeWindow.value
		} 
	})
})
</script>

<template>
	<Flex direction="column" wide :class="$style.wrapper">
		<Flex align="end" justify="between" :class="$style.breadcrumbs">
			<Breadcrumbs
				:items="[
					{ link: '/', name: 'Dashboard' },
					{ link: '/validators', name: `Validators` },
				]"
			/>
		</Flex>

		<Flex wide direction="column" gap="4">
			<Flex justify="between" :class="$style.header">
				<Flex align="center" gap="8">
					<Icon name="validator" size="16" color="secondary" />
					<Text as="h1" size="14" weight="600" color="primary">Validators</Text>
				</Flex>

				<Flex align="center" gap="6" :class="$style.controls">
					<!-- Time Window Selector -->
					<Dropdown>
						<template #trigger="{ isOpen }">
							<Button type="secondary" size="mini">
								{{ timeWindows.find(tw => tw.value === selectedTimeWindow)?.label }}
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
								@click="selectedTimeWindow = window.value"
							> 
								{{ window.label }} 
							</DropdownItem>
						</template>
					</Dropdown>

					<!-- Sort Selector -->
					<Dropdown>
						<template #trigger="{ isOpen }">
							<Button type="secondary" size="mini">
								<span :class="$style.sort_label">Sort: </span>{{ sortOptions.find(so => so.value === selectedSort)?.label }}
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
								v-for="option in sortOptions" 
								:key="option.value"
								@click="selectedSort = option.value"
							> 
								{{ option.label }} 
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
							<Text size="12" weight="600" color="primary"> {{ page }} of {{ pages }} </Text>
						</Button>

						<Button @click="handleNext" type="secondary" size="mini" :disabled="!hasNextPage">
							<Icon name="arrow-right" size="12" color="primary" />
						</Button>
						<Button @click="page = pages" type="secondary" size="mini" :disabled="!hasNextPage">
							<Icon name="arrow-right-stop" size="12" color="primary" />
						</Button>
					</Flex>
				</Flex>
			</Flex>

			<Flex direction="column" gap="16" wide :class="[$style.table, isLoading && $style.disabled]">
				<div v-if="validators.length" :class="$style.table_scroller">
					<table>
						<thead>
							<tr>
								<th><Text size="12" weight="600" color="tertiary" noWrap>Rank</Text></th>
								<th><Text size="12" weight="600" color="tertiary" noWrap>Validator</Text></th>
								<th><Text size="12" weight="600" color="tertiary" noWrap>Stake</Text></th>
								<th><Text size="12" weight="600" color="tertiary" noWrap>Uptime Score</Text></th>
								<th><Text size="12" weight="600" color="tertiary" noWrap>QC Participation</Text></th>
								<th><Text size="12" weight="600" color="tertiary" noWrap>Block Proposals</Text></th>
								<th><Text size="12" weight="600" color="tertiary" noWrap>Location</Text></th>
								<th style="width: 1px;"><Text size="12" weight="600" color="tertiary" noWrap>Bookmark</Text></th>
							</tr>
						</thead>

						<tbody>
							<tr v-for="validator in validators" :key="validator.validatorId">
								<td style="width: 1px">
									<Text size="13" weight="600" color="tertiary">#{{ validator.rank }}</Text>
								</td>
								<td style="width: 1px">
									<NuxtLink :to="`/validator/${validator.validatorId}`">
										<Flex direction="column" gap="2">
											<Text size="13" weight="600" color="primary" mono>
												{{ validator.name }}
											</Text>
											<Text size="11" color="tertiary">
												{{ shortHex(validator.validatorId) }}
											</Text>
										</Flex>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/validator/${validator.validatorId}`">
										<Text size="13" weight="600" color="primary">
											{{ comma(validator.stake) }}
										</Text>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/validator/${validator.validatorId}`">
										<Text size="13" weight="600" :color="getPerformanceColor(validator.uptimeScore)">
											{{ formatPercentage(validator.uptimeScore) }}
										</Text>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/validator/${validator.validatorId}`">
										<Text size="13" weight="600" color="primary">
											{{ formatPercentage(validator.qcParticipationRate) }}
										</Text>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/validator/${validator.validatorId}`">
										<Text size="13" weight="600" color="primary">
											{{ formatPercentage(validator.blockProposalRatio) }}
										</Text>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/validator/${validator.validatorId}`">
										<Text size="12" color="tertiary">
											{{ validator.location }}
										</Text>
									</NuxtLink>
								</td>
								<td>
									<BookmarkButton type="validator" :id="validator.validatorId" />
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<Flex v-else-if="!isLoading" direction="column" gap="20" align="center" :class="$style.empty">
					<Flex direction="column" gap="8" align="center">
						<Text size="13" weight="600" color="secondary"> No validators found </Text>
						<Text size="12" weight="400" color="tertiary"> Try adjusting the time window or sort options </Text>
					</Flex>
				</Flex>
				<Flex v-else direction="column" gap="20" align="center" :class="$style.empty">
					<Text size="13" weight="600" color="secondary"> Loading validators... </Text>
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

.table_scroller {
	overflow-x: auto;
}

.table {
	border-radius: 4px 4px 8px 8px;
	background: var(--card-background);

	transition: all 0.2s ease;

	& table {
		width: 100%;
		height: fit-content;

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

			padding: 0;
			padding-right: 16px;
			padding-top: 16px;
			padding-bottom: 8px;

			& span {
				display: flex;
			}

			&:first-child {
				padding-left: 16px;
				width: 16px;
			}

			&.sortable {
				cursor: pointer;
			}

			&.sortable:hover {
				& span {
					color: var(--txt-secondary);
				}
			}
		}

		& tr td {
			padding: 0;

			white-space: nowrap;

			&:first-child {
				padding-left: 16px;
			}

			& > a {
				display: flex;

				min-height: 44px;

				padding-right: 24px;
			}
		}
	}
}

.table.disabled {
	opacity: 0.5;
	pointer-events: none;
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
	
	.controls {
		flex-wrap: wrap;
		gap: 8px;
	}
	
	.sort_label {
		display: none;
	}
	
	.pagination {
		gap: 4px;
	}
	
	.table {
		& table {
			& tr th:nth-child(6), /* Block Proposals */
			& tr td:nth-child(6) {
				display: none;
			}
			
			& tr th:nth-child(7), /* Location */
			& tr td:nth-child(7) {
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
	
	.controls {
		flex-direction: column;
		gap: 12px;
		width: 100%;
	}
	
	.pagination {
		justify-content: center;
		gap: 3px;
	}
	
	.table {
		& table {
			& tr th:nth-child(1), /* Rank */
			& tr td:nth-child(1) {
				display: none;
			}
			
			& tr th:nth-child(5), /* QC Participation */
			& tr td:nth-child(5) {
				display: none;
			}
			
			& tr th {
				padding-right: 8px;
				padding-top: 12px;
				padding-bottom: 6px;
				
				&:first-child {
					padding-left: 12px;
				}
			}
			
			& tr td {
				&:first-child {
					padding-left: 12px;
				}
				
				& > a {
					min-height: 36px;
					padding-right: 12px;
				}
			}
		}
	}
}

.empty {
	padding: 16px 0;
}
</style>
