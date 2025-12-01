<script setup>
/** API */
import { fetchStatsCounters } from "@/services/api/stats"

/** Services */
import { comma } from "@/services/utils"

const isLoading = ref(true)
const stats = ref({
	totalBlocks: 0,
	averageBlockTime: 0,
	totalTransactions: 0,
	totalAddresses: 0,
})

const loadStats = async () => {
	try {
		isLoading.value = true
		const data = await fetchStatsCounters()

		if (data?.counters) {
			const counters = data.counters
			const getCounter = (id) => counters.find(c => c.id === id)?.value || "0"

			stats.value = {
				totalBlocks: parseInt(getCounter('totalBlocks')),
				averageBlockTime: parseFloat(getCounter('averageBlockTime')), // Already in seconds
				totalTransactions: parseInt(getCounter('completedTxns')),
				totalAddresses: parseInt(getCounter('totalAddresses')),
			}
		}
	} catch (error) {
		// Stats error
	} finally {
		isLoading.value = false
	}
}

let refreshInterval = null

onMounted(() => {
	nextTick(() => {
		loadStats()
	})

	// Refresh every 30 seconds
	refreshInterval = setInterval(loadStats, 30000)
})

onBeforeUnmount(() => {
	if (refreshInterval) {
		clearInterval(refreshInterval)
	}
})
</script>

<template>
	<div :class="$style.wrapper">
		<div :class="$style.grid">
			<!-- Total Blocks -->
			<div :class="$style.stat_card">
				<Flex align="center" gap="10">
					<div :class="$style.icon_wrapper">
						<Icon name="block" size="16" color="secondary" />
					</div>
					<Flex direction="column" gap="2">
						<Text size="11" weight="500" color="tertiary">Total blocks</Text>
						<template v-if="isLoading">
							<Skeleton w="80" h="16" />
						</template>
						<Text v-else size="16" weight="600" color="primary">
							{{ comma(stats.totalBlocks) }}
						</Text>
					</Flex>
				</Flex>
			</div>

			<!-- Average Block Time -->
			<div :class="$style.stat_card">
				<Flex align="center" gap="10">
					<div :class="$style.icon_wrapper">
						<Icon name="time" size="16" color="secondary" />
					</div>
					<Flex direction="column" gap="2">
						<Text size="11" weight="500" color="tertiary">Avg block time</Text>
						<template v-if="isLoading">
							<Skeleton w="50" h="16" />
						</template>
						<Text v-else size="16" weight="600" color="primary">
							{{ stats.averageBlockTime.toFixed(1) }}s
						</Text>
					</Flex>
				</Flex>
			</div>

			<!-- Total Transactions -->
			<div :class="$style.stat_card">
				<Flex align="center" gap="10">
					<div :class="$style.icon_wrapper">
						<Icon name="tx" size="16" color="secondary" />
					</div>
					<Flex direction="column" gap="2">
						<Text size="11" weight="500" color="tertiary">Completed txns</Text>
						<template v-if="isLoading">
							<Skeleton w="90" h="16" />
						</template>
						<Text v-else size="16" weight="600" color="primary">
							{{ comma(stats.totalTransactions) }}
						</Text>
					</Flex>
				</Flex>
			</div>

			<!-- Total Addresses -->
			<div :class="$style.stat_card">
				<Flex align="center" gap="10">
					<div :class="$style.icon_wrapper">
						<Icon name="address" size="16" color="secondary" />
					</div>
					<Flex direction="column" gap="2">
						<Text size="11" weight="500" color="tertiary">Total addresses</Text>
						<template v-if="isLoading">
							<Skeleton w="80" h="16" />
						</template>
						<Text v-else size="16" weight="600" color="primary">
							{{ comma(stats.totalAddresses) }}
						</Text>
					</Flex>
				</Flex>
			</div>
		</div>
	</div>
</template>

<style module>
.wrapper {
	background: var(--card-background);
	border-radius: 12px;
	padding: 12px;
	min-height: 180px;
}

.grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	grid-template-rows: 1fr 1fr;
	gap: 8px;
	height: 100%;
}

.stat_card {
	background: var(--op-3);
	border-radius: 8px;
	padding: 12px;

	display: flex;
	align-items: center;

	transition: all 0.2s ease;
}

.stat_card:hover {
	background: var(--op-5);
}

.icon_wrapper {
	width: 32px;
	height: 32px;
	border-radius: 8px;
	background: var(--op-5);

	display: flex;
	align-items: center;
	justify-content: center;
}

@media (max-width: 500px) {
	.wrapper {
		min-height: 160px;
	}

	.grid {
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.stat_card {
		padding: 10px;
	}

	.icon_wrapper {
		width: 28px;
		height: 28px;
	}
}
</style>
