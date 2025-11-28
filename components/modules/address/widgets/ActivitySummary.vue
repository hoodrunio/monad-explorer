<script setup>
import { DateTime } from "luxon"
import MiniSparkline from "../charts/MiniSparkline.vue"

const props = defineProps({
	totalTransactions: {
		type: Number,
		default: 0,
	},
	totalTokenTransfers: {
		type: Number,
		default: 0,
	},
	activityData: {
		type: Array,
		default: () => [],
		// Expected format: [{ date: Date, value: Number }, ...]
	},
	isLoading: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits(["viewTransactions", "viewTransfers"])

// Format large numbers
const formatNumber = (num) => {
	if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
	if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
	return num.toString()
}

// Generate mock activity data if none provided (last 7 days)
const sparklineData = computed(() => {
	if (props.activityData.length > 0) {
		return props.activityData
	}

	// Generate placeholder data for last 7 days
	const data = []
	for (let i = 6; i >= 0; i--) {
		data.push({
			date: DateTime.now().minus({ days: i }).toJSDate(),
			value: Math.floor(Math.random() * 10),
		})
	}
	return data
})

// Determine activity trend
const activityTrend = computed(() => {
	if (sparklineData.value.length < 2) return "neutral"

	const recent = sparklineData.value.slice(-3).reduce((a, b) => a + b.value, 0)
	const earlier = sparklineData.value.slice(0, 3).reduce((a, b) => a + b.value, 0)

	if (recent > earlier) return "up"
	if (recent < earlier) return "down"
	return "neutral"
})

const trendColor = computed(() => {
	if (activityTrend.value === "up") return "var(--green)"
	if (activityTrend.value === "down") return "var(--red)"
	return "var(--brand)"
})
</script>

<template>
	<Flex direction="column" gap="12" :class="$style.widget">
		<Text size="12" weight="600" color="tertiary">Activity</Text>

		<!-- Stats Row -->
		<Flex align="center" gap="16">
			<Flex @click="emit('viewTransactions')" direction="column" gap="4" :class="$style.stat_item">
				<Text size="11" weight="500" color="tertiary">Transactions</Text>
				<Skeleton v-if="isLoading" w="40" h="16" />
				<Text v-else size="14" weight="600" color="primary">{{ formatNumber(totalTransactions) }}</Text>
			</Flex>

			<div :class="$style.divider" />

			<Flex @click="emit('viewTransfers')" direction="column" gap="4" :class="$style.stat_item">
				<Text size="11" weight="500" color="tertiary">Transfers</Text>
				<Skeleton v-if="isLoading" w="40" h="16" />
				<Text v-else size="14" weight="600" color="primary">{{ formatNumber(totalTokenTransfers) }}</Text>
			</Flex>
		</Flex>

		<!-- Sparkline -->
		<Flex direction="column" gap="8">
			<Flex align="center" justify="between">
				<Text size="11" weight="500" color="tertiary">Last 7 days</Text>
				<Flex align="center" gap="4">
					<Icon
						v-if="activityTrend !== 'neutral'"
						:name="activityTrend === 'up' ? 'arrow-narrow-up' : 'arrow-narrow-down'"
						size="10"
						:color="activityTrend === 'up' ? 'green' : 'red'"
					/>
					<Text size="11" weight="500" :style="{ color: trendColor }">
						{{ activityTrend === "up" ? "Active" : activityTrend === "down" ? "Declining" : "Stable" }}
					</Text>
				</Flex>
			</Flex>

			<Skeleton v-if="isLoading" w="100" h="32" style="width: 100%" />
			<MiniSparkline
				v-else
				:data="sparklineData"
				:width="288"
				:height="40"
				:color="trendColor"
				:showArea="true"
			/>
		</Flex>
	</Flex>
</template>

<style module>
.widget {
	padding: 16px;
}

.stat_item {
	cursor: pointer;
	flex: 1;

	&:hover {
		opacity: 0.8;
	}
}

.divider {
	width: 1px;
	height: 32px;
	background: var(--op-10);
}
</style>
