<script setup>
import DonutChart from "../charts/DonutChart.vue"

const props = defineProps({
	nativeBalance: {
		type: String,
		default: "0",
	},
	nativeUsdValue: {
		type: Number,
		default: 0,
	},
	tokenBalances: {
		type: Array,
		default: () => [],
	},
	isLoading: {
		type: Boolean,
		default: false,
	},
})

// Calculate total USD value
const totalUsdValue = computed(() => {
	let total = props.nativeUsdValue || 0

	props.tokenBalances.forEach((balance) => {
		if (balance.token?.exchange_rate && balance.value) {
			const decimals = parseInt(balance.token?.decimals) || 18
			const tokenAmount = Number(BigInt(balance.value)) / Math.pow(10, decimals)
			total += tokenAmount * parseFloat(balance.token.exchange_rate)
		}
	})

	return total
})

// Format USD value
const formattedUsdValue = computed(() => {
	const value = totalUsdValue.value
	if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
	if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`
	return `$${value.toFixed(2)}`
})

// Calculate token total for chart
const tokenTotalUsd = computed(() => {
	let total = 0
	props.tokenBalances.forEach((balance) => {
		if (balance.token?.exchange_rate && balance.value) {
			const decimals = parseInt(balance.token?.decimals) || 18
			const tokenAmount = Number(BigInt(balance.value)) / Math.pow(10, decimals)
			total += tokenAmount * parseFloat(balance.token.exchange_rate)
		}
	})
	return total
})

// Data for donut chart
const chartData = computed(() => {
	const data = []
	const nativeValue = props.nativeUsdValue || 0
	const tokensValue = tokenTotalUsd.value

	if (nativeValue > 0) {
		data.push({
			label: "MON",
			value: nativeValue,
			color: "var(--brand)",
		})
	}

	if (tokensValue > 0) {
		data.push({
			label: "Tokens",
			value: tokensValue,
			color: "var(--blue)",
		})
	}

	// If no value, show placeholder
	if (data.length === 0) {
		data.push({
			label: "Empty",
			value: 1,
			color: "var(--op-10)",
		})
	}

	return data
})

// Calculate percentages
const nativePercentage = computed(() => {
	if (totalUsdValue.value === 0) return 0
	return ((props.nativeUsdValue || 0) / totalUsdValue.value) * 100
})

const tokenPercentage = computed(() => {
	if (totalUsdValue.value === 0) return 0
	return (tokenTotalUsd.value / totalUsdValue.value) * 100
})
</script>

<template>
	<Flex direction="column" gap="16" :class="$style.widget">
		<Text size="12" weight="600" color="tertiary">Portfolio Value</Text>

		<Flex align="center" gap="16">
			<!-- Donut Chart -->
			<Flex align="center" justify="center" :class="$style.chart_container">
				<Skeleton v-if="isLoading" w="80" h="80" />
				<DonutChart v-else :data="chartData" :size="80" :thickness="12" />
			</Flex>

			<!-- Value and breakdown -->
			<Flex direction="column" gap="8" wide>
				<Skeleton v-if="isLoading" w="100" h="24" />
				<Text v-else size="20" weight="700" color="primary">
					{{ formattedUsdValue }}
				</Text>

				<Flex direction="column" gap="4">
					<Flex align="center" gap="8">
						<div :class="$style.legend_dot" style="background: var(--brand)" />
						<Text size="11" weight="500" color="tertiary">
							MON
							<Text v-if="!isLoading" size="11" weight="600" color="secondary">
								{{ nativePercentage.toFixed(1) }}%
							</Text>
						</Text>
					</Flex>

					<Flex v-if="tokenBalances.length > 0" align="center" gap="8">
						<div :class="$style.legend_dot" style="background: var(--blue)" />
						<Text size="11" weight="500" color="tertiary">
							Tokens
							<Text v-if="!isLoading" size="11" weight="600" color="secondary">
								{{ tokenPercentage.toFixed(1) }}%
							</Text>
						</Text>
					</Flex>
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.widget {
	padding: 16px;
	border-bottom: 1px solid var(--op-5);
}

.chart_container {
	flex-shrink: 0;
}

.legend_dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}
</style>
