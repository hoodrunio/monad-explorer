<script setup>
import { useConsensusSummary } from "@/composables/useConsensusPolling"
import { formatPercentage, getQuorumColor } from "@/services/utils/consensus"

const { data: summaryData, isLoading, isError } = useConsensusSummary()

const signedCount = computed(() => summaryData.value?.v?.signed_count || 0)
const totalValidators = computed(() => summaryData.value?.vs?.total_validators || 0)
const participationRate = computed(() => summaryData.value?.participation_rate || 0)
const stakeRatio = computed(() => summaryData.value?.l?.stake_ratio || 0)
const lastUpdate = computed(() => summaryData.value?.last_update || null)

const stakeColor = computed(() => getQuorumColor(stakeRatio.value))
</script>

<template>
	<Flex gap="16" :class="$style.wrapper">
		<!-- Signed / Total Tile -->
		<Flex direction="column" gap="12" :class="$style.tile">
			<Flex align="center" gap="8">
				<Icon name="validator" size="14" color="secondary" />
				<Text size="12" weight="500" color="tertiary">
					Signed / Total
				</Text>
			</Flex>

			<Flex v-if="isLoading" justify="center" :class="$style.loading">
				<Text size="11" weight="500" color="tertiary">
					Loading...
				</Text>
			</Flex>

			<Flex v-else-if="isError" align="center" gap="6" :class="$style.error_mini">
				<Icon name="close" size="12" color="red" />
				<Text size="11" weight="500" color="red">
					Error
				</Text>
			</Flex>

			<Flex v-else gap="6" :class="$style.baseline">
				<Text size="24" weight="700" color="primary" mono>
					{{ signedCount }}
				</Text>
				<Text size="16" weight="600" color="tertiary" mono>
					/ {{ totalValidators }}
				</Text>
			</Flex>
		</Flex>

		<!-- Participation Rate Tile -->
		<Flex direction="column" gap="12" :class="$style.tile">
			<Flex align="center" gap="8">
				<Icon name="check" size="14" color="secondary" />
				<Text size="12" weight="500" color="tertiary">
					Participation
				</Text>
			</Flex>

			<Flex v-if="isLoading" justify="center" :class="$style.loading">
				<Text size="11" weight="500" color="tertiary">
					Loading...
				</Text>
			</Flex>

			<Flex v-else-if="isError" align="center" gap="6" :class="$style.error_mini">
				<Icon name="close" size="12" color="red" />
				<Text size="11" weight="500" color="red">
					Error
				</Text>
			</Flex>

			<Text v-else size="24" weight="700" color="green" mono>
				{{ formatPercentage(participationRate) }}
			</Text>
		</Flex>

		<!-- Stake Ratio Tile -->
		<Flex direction="column" gap="12" :class="$style.tile">
			<Flex align="center" gap="8">
				<Icon name="coin" size="14" color="secondary" />
				<Text size="12" weight="500" color="tertiary">
					Stake Ratio
				</Text>
			</Flex>

			<Flex v-if="isLoading" justify="center" :class="$style.loading">
				<Text size="11" weight="500" color="tertiary">
					Loading...
				</Text>
			</Flex>

			<Flex v-else-if="isError" align="center" gap="6" :class="$style.error_mini">
				<Icon name="close" size="12" color="red" />
				<Text size="11" weight="500" color="red">
					Error
				</Text>
			</Flex>

			<Text v-else size="24" weight="700" :color="stakeColor" mono>
				{{ formatPercentage(stakeRatio) }}
			</Text>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 16px;
}

.tile {
	border-radius: 8px;
	background: var(--card-background);
	padding: 16px 20px;
	min-height: 100px;
}

.loading {
	padding: 16px 0;
	opacity: 0.6;
}

.error_mini {
	padding: 8px 0;
}

.baseline {
	align-items: baseline;
}

@media (max-width: 768px) {
	.wrapper {
		grid-template-columns: 1fr;
		gap: 12px;
	}

	.tile {
		padding: 14px 16px;
		min-height: 80px;
	}
}

@media (max-width: 500px) {
	.tile {
		padding: 12px;
		min-height: 70px;
	}
}
</style>
