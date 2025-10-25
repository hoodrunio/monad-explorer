<script setup>
import { useConsensusMissing } from "@/composables/useConsensusPolling"
import { formatValidatorName, formatStakeCompact, formatStakeFull } from "@/services/utils/consensus"
import Button from "@/components/ui/Button.vue"
import ValidatorLogo from "@/components/ValidatorLogo.vue"
import Tooltip from "@/components/ui/Tooltip.vue"

const { data: missingData, isLoading, isError } = useConsensusMissing()

const currentPage = ref(1)
const pageSize = 25
const sortDirection = ref("desc")
const showTopOnly = ref(false)

const sortedMissing = computed(() => {
	if (!missingData.value || missingData.value.length === 0) return []

	let sorted = [...missingData.value]

	// Sort by stake (descending by default)
	sorted.sort((a, b) => {
		const stakeA = parseFloat(a.realtime_stake_wei || 0)
		const stakeB = parseFloat(b.realtime_stake_wei || 0)

		return sortDirection.value === "desc" ? stakeB - stakeA : stakeA - stakeB
	})

	// Filter top 25 if enabled
	if (showTopOnly.value) {
		sorted = sorted.slice(0, 25)
	}

	return sorted
})

const paginatedMissing = computed(() => {
	const start = (currentPage.value - 1) * pageSize
	const end = start + pageSize
	return sortedMissing.value.slice(start, end)
})

const totalPages = computed(() => {
	return Math.ceil(sortedMissing.value.length / pageSize)
})

const toggleSort = () => {
	sortDirection.value = sortDirection.value === "desc" ? "asc" : "desc"
}

const toggleTopFilter = () => {
	showTopOnly.value = !showTopOnly.value
	currentPage.value = 1
}

const isHighStake = (stakeWei) => {
	const stake = parseFloat(stakeWei || 0)
	// Consider high stake if in top 20% (arbitrary threshold)
	if (!sortedMissing.value.length) return false

	const allStakes = sortedMissing.value.map((m) => parseFloat(m.realtime_stake_wei || 0))
	const threshold = allStakes.sort((a, b) => b - a)[Math.floor(allStakes.length * 0.2)]

	return stake >= threshold
}

watch(showTopOnly, () => {
	currentPage.value = 1
})
</script>

<template>
	<Flex direction="column" gap="16" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="close" size="16" color="red" />
				<Text size="14" weight="600" color="primary">
					Who is Missing?
				</Text>
				<Flex v-if="!isLoading && sortedMissing.length > 0" :class="$style.count_chip">
					<Text size="11" weight="600" color="primary">
						{{ sortedMissing.length }}
					</Text>
				</Flex>
			</Flex>

			<Flex align="center" gap="8">
				<!-- Top 25 Filter -->
				<Button
					v-if="!isLoading && missingData.length > 25"
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
				<Button v-if="!isLoading && sortedMissing.length > 0" type="secondary" size="mini" @click="toggleSort">
					<Icon name="chevron" size="12" color="secondary" :style="{ transform: sortDirection === 'desc' ? 'rotate(0deg)' : 'rotate(180deg)' }" />
					Stake {{ sortDirection === "desc" ? "High → Low" : "Low → High" }}
				</Button>
			</Flex>
		</Flex>

		<!-- Loading state -->
		<Flex v-if="isLoading" justify="center" :class="$style.loading">
			<Text size="12" weight="500" color="tertiary">
				Loading missing validators...
			</Text>
		</Flex>

		<!-- Error state -->
		<Flex v-else-if="isError" align="center" gap="8" :class="$style.error">
			<Icon name="close" size="14" color="red" />
			<Text size="12" weight="500" color="red">
				Failed to load missing validators data
			</Text>
		</Flex>

		<!-- Empty state -->
		<Flex v-else-if="sortedMissing.length === 0" direction="column" gap="8" align="center" :class="$style.empty">
			<Icon name="check" size="32" color="green" />
			<Text size="13" weight="600" color="green">
				All validators signed!
			</Text>
			<Text size="12" weight="400" color="tertiary">
				Perfect participation for this round
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
						<th>
							<Text size="12" weight="600" color="tertiary" noWrap>Stake</Text>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="validator in paginatedMissing" :key="validator.validator_id || validator.author">
						<td>
							<Flex align="center" gap="8">
								<!-- Attention dot for high stake -->
								<div v-if="isHighStake(validator.realtime_stake_wei)" :class="$style.attention_dot" />
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
						<td>
							<Tooltip :side="'bottom'">
								<Text size="13" weight="600" color="primary" mono :class="$style.stake_text">
									{{ formatStakeCompact(validator.realtime_stake_wei) }}
								</Text>

								<template #content>
									<Flex direction="column" gap="2">
										<Text size="11" weight="500" color="tertiary">
											Full Stake (wei):
										</Text>
										<Text size="12" weight="600" color="primary" mono>
											{{ formatStakeFull(validator.realtime_stake_wei) }}
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
	background: rgba(239, 68, 68, 0.1);
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
