<script setup>
import { useConsensusVotes, useConsensusMissing } from "@/composables/useConsensusPolling"
import { formatValidatorName, formatStakeCompact, formatStakeFull, exportToCSV } from "@/services/utils/consensus"
import Input from "@/components/ui/Input.vue"
import Button from "@/components/ui/Button.vue"
import ValidatorLogo from "@/components/ValidatorLogo.vue"
import Tooltip from "@/components/ui/Tooltip.vue"
import ConsensusValidatorsTableSkeleton from "@/components/modules/consensus/skeletons/ConsensusValidatorsTableSkeleton.vue"

const { data: votesData, isLoading: isVotesLoading, isError: isVotesError } = useConsensusVotes()
const { data: missingData, isLoading: isMissingLoading, isError: isMissingError } = useConsensusMissing()

const activeTab = ref("signed")
const searchTerm = ref("")
const currentPage = ref(1)
const pageSize = 25
const sortDirection = ref("desc")
const showTopOnly = ref(false)

const isLoading = computed(() => {
	return activeTab.value === "signed" ? isVotesLoading.value : isMissingLoading.value
})

const isError = computed(() => {
	return activeTab.value === "signed" ? isVotesError.value : isMissingError.value
})

// Get active data based on selected tab
const activeData = computed(() => {
	return activeTab.value === "signed" ? votesData.value : missingData.value
})

// Filtered and sorted data
const processedData = computed(() => {
	if (!activeData.value || activeData.value.length === 0) return []

	let processed = [...activeData.value]

	// Apply search filter
	if (searchTerm.value.trim()) {
		const search = searchTerm.value.toLowerCase().trim()
		processed = processed.filter((item) => {
			const name = formatValidatorName(item.validator_name, item.author || item.validator_id).toLowerCase()
			const provider = (item.provider || "").toLowerCase()
			const location = (item.location || "").toLowerCase()
			const author = (item.author || item.validator_id || "").toLowerCase()

			return (
				name.includes(search) ||
				provider.includes(search) ||
				location.includes(search) ||
				author.includes(search)
			)
		})
	}

	// Sort data
	if (activeTab.value === "missing") {
		// Sort by stake for missing validators
		processed.sort((a, b) => {
			const stakeA = parseFloat(a.real_time_stake_wei || 0)
			const stakeB = parseFloat(b.real_time_stake_wei || 0)
			return sortDirection.value === "desc" ? stakeB - stakeA : stakeA - stakeB
		})

		// Filter top 25 if enabled (only for missing)
		if (showTopOnly.value) {
			processed = processed.slice(0, 25)
		}
	} else {
		// Sort by timestamp for signed validators
		processed.sort((a, b) => {
			const timeA = new Date(a.ts).getTime()
			const timeB = new Date(b.ts).getTime()
			return sortDirection.value === "desc" ? timeB - timeA : timeA - timeB
		})
	}

	return processed
})

const paginatedData = computed(() => {
	const start = (currentPage.value - 1) * pageSize
	const end = start + pageSize
	return processedData.value.slice(start, end)
})

const totalPages = computed(() => {
	return Math.ceil(processedData.value.length / pageSize)
})

const toggleSort = () => {
	sortDirection.value = sortDirection.value === "desc" ? "asc" : "desc"
}

const toggleTopFilter = () => {
	showTopOnly.value = !showTopOnly.value
	currentPage.value = 1
}

const isHighStake = (stakeWei) => {
	if (activeTab.value !== "missing") return false

	const stake = parseFloat(stakeWei || 0)
	if (!processedData.value.length) return false

	const allStakes = processedData.value.map((m) => parseFloat(m.real_time_stake_wei || 0))
	const threshold = allStakes.sort((a, b) => b - a)[Math.floor(allStakes.length * 0.2)]

	return stake >= threshold
}

const handleExportCSV = () => {
	const columns = activeTab.value === "signed"
		? [
			{ key: "validator_name", label: "Validator" },
			{ key: "provider", label: "Provider" },
			{ key: "location", label: "Location" },
			{ key: "author", label: "Author" },
		]
		: [
			{ key: "validator_name", label: "Validator" },
			{ key: "provider", label: "Provider" },
			{ key: "location", label: "Location" },
			{ key: "real_time_stake_wei", label: "Stake (wei)" },
		]

	const filename = `consensus-validators-${activeTab.value}-${new Date().toISOString().split("T")[0]}.csv`
	exportToCSV(processedData.value, columns, filename)
}

// Reset page when tab or filters change
watch([activeTab, searchTerm, showTopOnly], () => {
	currentPage.value = 1
})
</script>

<template>
	<!-- Loading Skeleton (show if BOTH are loading initially) -->
	<ConsensusValidatorsTableSkeleton v-if="isVotesLoading && isMissingLoading" />

	<!-- Main Content -->
	<Flex v-else direction="column" gap="16" :class="$style.wrapper">
		<!-- Header with Tabs -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="12">
				<!-- Tab Buttons -->
				<Button
					:type="activeTab === 'signed' ? 'primary' : 'secondary'"
					size="small"
					@click="activeTab = 'signed'"
				>
					<Icon name="check" size="14" :color="activeTab === 'signed' ? 'black' : 'primary'" />
					Signed
					<Flex v-if="!isVotesLoading && votesData.length > 0" :class="$style.count_chip">
						<Text size="11" weight="600" :color="activeTab === 'signed' ? 'black' : 'primary'">
							{{ votesData.length }}
						</Text>
					</Flex>
				</Button>

				<Button
					:type="activeTab === 'missing' ? 'primary' : 'secondary'"
					size="small"
					@click="activeTab = 'missing'"
				>
					<Icon name="close" size="14" :color="activeTab === 'missing' ? 'black' : 'red'" />
					Missing
					<Flex v-if="!isMissingLoading && missingData.length > 0" :class="$style.count_chip_red">
						<Text size="11" weight="600" :color="activeTab === 'missing' ? 'black' : 'red'">
							{{ missingData.length }}
						</Text>
					</Flex>
				</Button>
			</Flex>

			<Flex align="center" gap="8">
				<!-- Top 25 Filter (only for missing) -->
				<Button
					v-if="activeTab === 'missing' && !isMissingLoading && missingData.length > 25"
					type="secondary"
					size="mini"
					@click="toggleTopFilter"
				>
					<Icon
						:name="showTopOnly ? 'check' : 'filter'"
						size="12"
						:color="showTopOnly ? 'green' : 'secondary'"
					/>
					Top 25 Stake
				</Button>

				<!-- Sort Toggle -->
				<Button v-if="!isLoading && processedData.length > 0" type="secondary" size="mini" @click="toggleSort">
					<Icon name="chevron" size="12" color="secondary" :style="{ transform: sortDirection === 'desc' ? 'rotate(0deg)' : 'rotate(180deg)' }" />
					{{ activeTab === 'missing' ? 'Stake' : 'Time' }} {{ sortDirection === "desc" ? "High → Low" : "Low → High" }}
				</Button>

				<!-- Export CSV -->
				<Button
					v-if="!isLoading && processedData.length > 0"
					type="secondary"
					size="mini"
					@click="handleExportCSV"
				>
					<Icon name="download" size="12" color="secondary" />
					Export CSV
				</Button>
			</Flex>
		</Flex>

		<!-- Search -->
		<Flex v-if="!isLoading && processedData.length > 0" :class="$style.search">
			<Input
				v-model="searchTerm"
				placeholder="Search validators, provider, location..."
				size="small"
			>
				<template #icon>
					<Icon name="search" size="16" color="secondary" />
				</template>
			</Input>
		</Flex>

		<!-- Loading state -->
		<Flex v-if="isLoading" justify="center" :class="$style.loading">
			<Text size="12" weight="500" color="tertiary">
				Loading validators...
			</Text>
		</Flex>

		<!-- Error state -->
		<Flex v-else-if="isError" align="center" gap="8" :class="$style.error">
			<Icon name="close" size="14" color="red" />
			<Text size="12" weight="500" color="red">
				Failed to load validators data
			</Text>
		</Flex>

		<!-- Empty state for signed (all signed) -->
		<Flex v-else-if="activeTab === 'signed' && processedData.length === 0 && !searchTerm" direction="column" gap="8" align="center" :class="$style.empty">
			<Icon name="close" size="32" color="red" />
			<Text size="13" weight="600" color="red">
				No validators signed
			</Text>
			<Text size="12" weight="400" color="tertiary">
				Waiting for validator signatures
			</Text>
		</Flex>

		<!-- Empty state for missing (all signed) -->
		<Flex v-else-if="activeTab === 'missing' && processedData.length === 0 && !searchTerm" direction="column" gap="8" align="center" :class="$style.empty">
			<Icon name="check" size="32" color="green" />
			<Text size="13" weight="600" color="green">
				All validators signed!
			</Text>
			<Text size="12" weight="400" color="tertiary">
				Perfect participation for this round
			</Text>
		</Flex>

		<!-- Empty search results -->
		<Flex v-else-if="processedData.length === 0 && searchTerm" direction="column" gap="8" align="center" :class="$style.empty">
			<Icon name="search" size="32" color="tertiary" />
			<Text size="13" weight="600" color="tertiary">
				No results found
			</Text>
			<Text size="12" weight="400" color="tertiary">
				Try a different search term
			</Text>
		</Flex>

		<!-- Table -->
		<div v-else :class="$style.table_wrapper">
			<table :class="$style.table">
				<thead>
					<tr>
						<th>
							<Text size="12" weight="600" color="tertiary" noWrap>Validator</Text>
						</th>
						<th>
							<Text size="12" weight="600" color="tertiary" noWrap>Provider</Text>
						</th>
						<th>
							<Text size="12" weight="600" color="tertiary" noWrap>Location</Text>
						</th>
						<th v-if="activeTab === 'missing'">
							<Text size="12" weight="600" color="tertiary" noWrap>Stake</Text>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="validator in paginatedData" :key="validator.validator_id || validator.author">
						<td>
							<Flex align="center" gap="8">
								<!-- Attention dot for high stake in missing tab -->
								<div v-if="activeTab === 'missing' && isHighStake(validator.real_time_stake_wei)" :class="$style.attention_dot" />
								<ValidatorLogo
									:logo-url="validator.logoUrl"
									:validator-name="validator.validator_name"
									size="small"
								/>
								<Text
									size="13"
									weight="600"
									:color="validator.validator_name === 'unknown' ? 'tertiary' : 'primary'"
									:class="validator.validator_name === 'unknown' && $style.unknown"
								>
									{{
										formatValidatorName(
											validator.validator_name,
											validator.validator_id || validator.author
										)
									}}
								</Text>
							</Flex>
						</td>
						<td>
							<Text size="12" color="secondary">
								{{ validator.provider || "Unknown" }}
							</Text>
						</td>
						<td>
							<Text size="12" color="secondary">
								{{ validator.location || "Unknown" }}
							</Text>
						</td>
						<td v-if="activeTab === 'missing'">
							<Tooltip :side="'bottom'">
								<Text size="13" weight="600" color="primary" mono :class="$style.stake_text">
									{{ formatStakeCompact(validator.real_time_stake_wei) }}
								</Text>

								<template #content>
									<Flex direction="column" gap="2">
										<Text size="11" weight="500" color="tertiary">
											Full Stake (wei):
										</Text>
										<Text size="12" weight="600" color="primary" mono>
											{{ formatStakeFull(validator.real_time_stake_wei) }}
										</Text>
									</Flex>
								</template>
							</Tooltip>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		<Flex v-if="totalPages > 1" align="center" justify="center" gap="8" :class="$style.pagination">
			<Button @click="currentPage = 1" type="secondary" size="mini" :disabled="currentPage === 1">
				<Icon name="arrow-left-stop" size="12" color="primary" />
			</Button>
			<Button @click="currentPage--" type="secondary" size="mini" :disabled="currentPage === 1">
				<Icon name="arrow-left" size="12" color="primary" />
			</Button>

			<Button type="secondary" size="mini" disabled>
				<Text size="12" weight="600" color="primary">{{ currentPage }} of {{ totalPages }}</Text>
			</Button>

			<Button @click="currentPage++" type="secondary" size="mini" :disabled="currentPage === totalPages">
				<Icon name="arrow-right" size="12" color="primary" />
			</Button>
			<Button
				@click="currentPage = totalPages"
				type="secondary"
				size="mini"
				:disabled="currentPage === totalPages"
			>
				<Icon name="arrow-right-stop" size="12" color="primary" />
			</Button>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	border-radius: 8px;
	background: var(--card-background);
	padding: 20px 24px;
}

.header {
	padding-bottom: 12px;
	border-bottom: 1px solid var(--op-5);
}

.count_chip {
	padding: 2px 8px;
	border-radius: 10px;
	background: rgba(34, 197, 94, 0.1);
}

.count_chip_red {
	padding: 2px 8px;
	border-radius: 10px;
	background: rgba(239, 68, 68, 0.1);
}

.search {
	width: 100%;
}

.loading,
.empty {
	padding: 32px 16px;
}

.error {
	padding: 16px;
	border-radius: 6px;
	background: rgba(239, 68, 68, 0.1);
	border: 1px solid rgba(239, 68, 68, 0.3);
}

.table_wrapper {
	overflow-x: auto;
}

.table {
	width: 100%;
	border-spacing: 0;
}

.table thead tr th {
	text-align: left;
	padding: 12px 16px;
	white-space: nowrap;
	vertical-align: middle;
}

.table tbody tr td {
	padding: 12px 16px;
	white-space: nowrap;
	vertical-align: middle;
	border-top: 1px solid var(--op-5);
}

.table tbody tr:hover {
	background: var(--op-5);
}

.unknown {
	font-style: italic;
}

.attention_dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: rgba(239, 68, 68, 1);
	flex-shrink: 0;
	animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}

.stake_text {
	cursor: help;
}

.pagination {
	padding-top: 16px;
	border-top: 1px solid var(--op-5);
}

@media (max-width: 768px) {
	.wrapper {
		padding: 16px;
	}

	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}

	.table tbody tr td {
		padding: 10px 12px;
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 12px;
	}
}
</style>
