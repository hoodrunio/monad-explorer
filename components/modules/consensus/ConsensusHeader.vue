<script setup>
import { useConsensusLatest } from "@/composables/useConsensusPolling"
import { getRelativeTime, getAbsoluteTime, isDataStale } from "@/services/utils/consensus"
import Tooltip from "@/components/ui/Tooltip.vue"

const { data: latestData, isLoading, isError } = useConsensusLatest()

const epoch = computed(() => latestData.value?.epoch || "-")
const round = computed(() => latestData.value?.round || "-")
const timestamp = computed(() => latestData.value?.ts || null)
const relativeTime = computed(() => getRelativeTime(timestamp.value))
const absoluteTime = computed(() => getAbsoluteTime(timestamp.value))
const isStale = computed(() => isDataStale(timestamp.value))
</script>

<template>
	<Flex direction="column" gap="12" :class="$style.wrapper">
		<!-- Stale data warning -->
		<Flex v-if="!isLoading && isStale" align="center" gap="8" :class="$style.warning">
			<Icon name="time" size="14" color="yellow" />
			<Text size="12" weight="500" color="yellow">
				Data lagging - last update {{ relativeTime }}
			</Text>
		</Flex>

		<!-- Error state -->
		<Flex v-if="isError" align="center" gap="8" :class="$style.error">
			<Icon name="close" size="14" color="red" />
			<Text size="12" weight="500" color="red">
				Failed to load consensus data
			</Text>
		</Flex>

		<!-- Main header -->
		<Flex align="center" justify="between" :class="$style.header">
			<!-- Epoch & Round -->
			<Flex align="center" gap="12">
				<Flex direction="column" gap="4">
					<Text size="11" weight="500" color="tertiary" noWrap>
						Current Round
					</Text>
					<Flex gap="8" :class="$style.epoch_round">
						<Text size="24" weight="700" color="primary" mono>
							Epoch {{ epoch }}
						</Text>
						<Text size="18" weight="600" color="secondary" mono>
							• Round {{ round }}
						</Text>
					</Flex>
				</Flex>
			</Flex>

			<!-- Last update -->
			<Flex direction="column" gap="4" :class="$style.last_update">
				<Text size="11" weight="500" color="tertiary" noWrap>
					Last Update
				</Text>
				<Tooltip :side="'bottom'">
					<Text size="13" weight="600" color="secondary" :class="$style.relative_time">
						{{ relativeTime }}
					</Text>

					<template #content>
						<Text size="12" weight="500" color="primary">
							{{ absoluteTime }}
						</Text>
					</template>
				</Tooltip>
			</Flex>
		</Flex>

		<!-- Loading state -->
		<Flex v-if="isLoading" justify="center" :class="$style.loading">
			<Text size="12" weight="500" color="tertiary">
				Loading consensus data...
			</Text>
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
	min-height: 60px;
}

.last_update {
	align-items: flex-end;
}

.epoch_round {
	align-items: baseline;
}

.relative_time {
	cursor: help;
}

.warning {
	padding: 10px 16px;
	border-radius: 6px;
	background: rgba(255, 193, 7, 0.1);
	border: 1px solid rgba(255, 193, 7, 0.3);
}

.error {
	padding: 10px 16px;
	border-radius: 6px;
	background: rgba(239, 68, 68, 0.1);
	border: 1px solid rgba(239, 68, 68, 0.3);
}

.loading {
	padding: 16px;
	opacity: 0.6;
}

@media (max-width: 768px) {
	.wrapper {
		padding: 16px;
	}

	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: 16px;
	}

	.header > *:last-child {
		align-self: flex-start;
		align-items: flex-start;
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 12px;
	}
}
</style>
