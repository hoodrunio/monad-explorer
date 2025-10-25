<script setup>
import { useConsensusQuorum } from "@/composables/useConsensusPolling"
import {
	formatStakeCompact,
	formatStakeFull,
	formatPercentage,
	getQuorumColor,
	getQuorumStatusText,
	getRelativeTime,
	getAbsoluteTime,
} from "@/services/utils/consensus"
import Tooltip from "@/components/ui/Tooltip.vue"

const { data: quorumData, isLoading, isError } = useConsensusQuorum()

const progressPercentage = computed(() => quorumData.value?.progress_percentage || 0)
const currentStake = computed(() => quorumData.value?.current_stake || "0")
const totalStake = computed(() => quorumData.value?.total_stake || "0")
const isQuorumReached = computed(() => quorumData.value?.is_quorum_reached || false)
const quorumThreshold = computed(() => quorumData.value?.quorum_threshold || 66.67)
const remainingPercentage = computed(() => quorumData.value?.remaining_percentage || 0)
const peakRound = computed(() => quorumData.value?.peak_round || null)
const peakTimestamp = computed(() => quorumData.value?.peak_timestamp || null)
const recentPeakHistory = computed(() => quorumData.value?.recent_peak_history || [])
const totalRoundsTracked = computed(() => quorumData.value?.total_rounds_tracked || 0)

const statusColor = computed(() => getQuorumColor(progressPercentage.value, quorumThreshold.value))
const statusText = computed(() => getQuorumStatusText(isQuorumReached.value, remainingPercentage.value))
const isWarmingUp = computed(() => totalRoundsTracked.value < 5)

const currentStakeCompact = computed(() => formatStakeCompact(currentStake.value))
const totalStakeCompact = computed(() => formatStakeCompact(totalStake.value))
const currentStakeFull = computed(() => formatStakeFull(currentStake.value))
const totalStakeFull = computed(() => formatStakeFull(totalStake.value))
const peakRelativeTime = computed(() => getRelativeTime(peakTimestamp.value))
const peakAbsoluteTime = computed(() => getAbsoluteTime(peakTimestamp.value))
</script>

<template>
	<Flex direction="column" gap="16" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between">
			<Flex align="center" gap="8">
				<Icon name="bar-chart" size="16" color="secondary" />
				<Text size="14" weight="600" color="primary">
					Quorum Progress
				</Text>
			</Flex>

			<!-- Warming up badge -->
			<Flex v-if="isWarmingUp && !isLoading" :class="$style.badge_warming">
				<Text size="11" weight="600" color="tertiary">
					Warming Up
				</Text>
			</Flex>
		</Flex>

		<!-- Loading state -->
		<Flex v-if="isLoading" justify="center" :class="$style.loading">
			<Text size="12" weight="500" color="tertiary">
				Loading quorum data...
			</Text>
		</Flex>

		<!-- Error state -->
		<Flex v-else-if="isError" align="center" gap="8" :class="$style.error">
			<Icon name="close" size="14" color="red" />
			<Text size="12" weight="500" color="red">
				Failed to load quorum data
			</Text>
		</Flex>

		<!-- Main content -->
		<Flex v-else direction="column" gap="16">
			<!-- Progress bar -->
			<Flex direction="column" gap="8">
				<div :class="$style.progress_bar">
					<div
						:class="[$style.progress_fill, $style[`progress_${statusColor}`]]"
						:style="{ width: `${Math.min(progressPercentage, 100)}%` }"
					/>
				</div>

				<Flex align="center" justify="between">
					<Text size="20" weight="700" :color="statusColor">
						{{ formatPercentage(progressPercentage) }}
					</Text>

					<!-- Status badge -->
					<Flex :class="[$style.badge, $style[`badge_${statusColor}`]]">
						<Text size="12" weight="600" :color="statusColor">
							{{ statusText }}
						</Text>
					</Flex>
				</Flex>
			</Flex>

			<!-- Stake display -->
			<Flex direction="column" gap="4">
				<Text size="11" weight="500" color="tertiary">
					Current VP / Total VP
				</Text>
				<Tooltip :side="'bottom'">
					<Text size="13" weight="600" color="secondary" mono :class="$style.stake_text">
						{{ currentStakeCompact }} / {{ totalStakeCompact }}
					</Text>

					<template #content>
						<Flex direction="column" gap="4">
							<Text size="12" weight="500" color="primary">
								Current: {{ currentStakeFull }}
							</Text>
							<Text size="12" weight="500" color="primary">
								Total: {{ totalStakeFull }}
							</Text>
						</Flex>
					</template>
				</Tooltip>
			</Flex>

			<!-- Peak info -->
			<Flex v-if="peakRound" direction="column" gap="4" :class="$style.peak_info">
				<Text size="11" weight="500" color="tertiary">
					Peak Performance
				</Text>
				<Tooltip :side="'bottom'">
					<Text size="12" weight="500" color="secondary" :class="$style.peak_text">
						Round {{ peakRound }} • {{ peakRelativeTime }}
					</Text>

					<template #content>
						<Flex direction="column" gap="6">
							<Text size="12" weight="600" color="primary">
								{{ peakAbsoluteTime }}
							</Text>
							<Flex v-if="recentPeakHistory.length > 0" direction="column" gap="2">
								<Text size="11" weight="500" color="tertiary">
									Recent Peaks (Last 20 rounds):
								</Text>
								<Flex direction="column" gap="1">
									<Text
										v-for="(peak, idx) in recentPeakHistory.slice(0, 5)"
										:key="idx"
										size="11"
										weight="400"
										color="secondary"
									>
										Round {{ peak.round }}: {{ formatPercentage(peak.percentage) }}
									</Text>
								</Flex>
							</Flex>
						</Flex>
					</template>
				</Tooltip>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	border-radius: 8px;
	background: var(--card-background);
	padding: 20px 24px;
}

.loading {
	padding: 32px 16px;
	opacity: 0.6;
}

.error {
	padding: 16px;
	border-radius: 6px;
	background: rgba(239, 68, 68, 0.1);
	border: 1px solid rgba(239, 68, 68, 0.3);
}

.progress_bar {
	position: relative;
	width: 100%;
	height: 12px;
	border-radius: 6px;
	background: var(--op-5);
	overflow: hidden;
}

.progress_fill {
	position: absolute;
	top: 0;
	left: 0;
	height: 100%;
	border-radius: 6px;
	transition: width 0.5s ease, background-color 0.3s ease;
}

.progress_red {
	background: linear-gradient(90deg, rgba(239, 68, 68, 0.8), rgba(239, 68, 68, 1));
}

.progress_yellow {
	background: linear-gradient(90deg, rgba(255, 193, 7, 0.8), rgba(255, 193, 7, 1));
}

.progress_green {
	background: linear-gradient(90deg, rgba(34, 197, 94, 0.8), rgba(34, 197, 94, 1));
}

.badge {
	padding: 4px 12px;
	border-radius: 12px;
}

.badge_red {
	background: rgba(239, 68, 68, 0.1);
}

.badge_yellow {
	background: rgba(255, 193, 7, 0.1);
}

.badge_green {
	background: rgba(34, 197, 94, 0.1);
}

.badge_warming {
	padding: 4px 12px;
	border-radius: 12px;
	background: var(--op-5);
}

.stake_text {
	cursor: help;
}

.peak_info {
	padding-top: 12px;
	border-top: 1px solid var(--op-5);
}

.peak_text {
	cursor: help;
}

@media (max-width: 768px) {
	.wrapper {
		padding: 16px;
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 12px;
	}
}
</style>
