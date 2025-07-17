<script setup>
/** Services */
import { abbreviate, comma } from "@/services/utils"

/** Components */
import DiffChip from "@/components/modules/stats/DiffChip.vue"

const props = defineProps({
	data: {
		type: Object,
		required: true,
	},
	timeWindow: {
		type: String,
		default: '24h',
	},
})

const metrics = computed(() => [
	{
		name: 'totalTransactions',
		title: 'Total Transactions',
		value: props.data.totalTransactions,
		icon: 'transaction',
		color: 'mint',
		formatter: 'comma'
	},
	{
		name: 'successfulBlocks',
		title: 'Successful Blocks',
		value: props.data.successfulBlocks,
		icon: 'block',
		color: 'green',
		formatter: 'comma'
	},
	{
		name: 'avgTransactionsPerBlock',
		title: 'Avg Tx per Block',
		value: props.data.avgTransactionsPerBlock,
		icon: 'bar-chart',
		color: 'blue',
		formatter: 'decimal'
	},
	{
		name: 'networkThroughput',
		title: 'Network Throughput',
		value: props.data.networkThroughput,
		icon: 'zap',
		color: 'orange',
		formatter: 'decimal',
		suffix: 'tx/h'
	},
	{
		name: 'activeValidators',
		title: 'Active Validators',
		value: props.data.activeValidators,
		icon: 'validator',
		color: 'purple',
		formatter: 'number'
	},
	{
		name: 'blockSuccessRate',
		title: 'Block Success Rate',
		value: props.data.blockSuccessRate,
		icon: 'check-circle',
		color: 'green',
		formatter: 'percentage'
	}
])

const formatValue = (value, formatter, suffix = '') => {
	let formatted = value

	switch (formatter) {
		case 'comma':
			formatted = comma(value)
			break
		case 'decimal':
			formatted = comma(value, ",", 1)
			break
		case 'percentage':
			formatted = `${comma(value, ",", 1)}%`
			break
		case 'number':
			formatted = value.toString()
			break
		default:
			formatted = abbreviate(value)
	}

	return suffix ? `${formatted} ${suffix}` : formatted
}

const getTimeWindowLabel = (window) => {
	const labels = {
		'1h': 'last hour',
		'24h': 'last 24 hours',
		'7d': 'last 7 days',
		'30d': 'last 30 days'
	}
	return labels[window] || window
}
</script>

<template>
	<Flex gap="16" :class="$style.grid">
		<Flex
			v-for="metric in metrics"
			:key="metric.name"
			direction="column"
			justify="between"
			:class="$style.metric_card"
		>
			<Flex align="center" justify="between" wide>
				<Flex align="center" gap="8">
					<Icon 
						:name="metric.icon" 
						size="16" 
						:color="metric.color" 
					/>
					<Text size="12" weight="600" color="tertiary">
						{{ metric.title }}
					</Text>
				</Flex>
			</Flex>

			<Flex direction="column" gap="4">
				<Text size="18" weight="600" color="primary">
					{{ formatValue(metric.value, metric.formatter, metric.suffix) }}
				</Text>
				<Text size="11" color="tertiary">
					{{ getTimeWindowLabel(timeWindow) }}
				</Text>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 16px;
	width: 100%;
}

.metric_card {
	min-height: 100px;
	background: var(--card-background);
	border-radius: 12px;
	padding: 16px;
	box-shadow: inset 0 0 0 1px var(--op-3);
	transition: all 0.2s ease;
}

.metric_card:hover {
	box-shadow: inset 0 0 0 1px var(--op-8);
}

@media (max-width: 1200px) {
	.grid {
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	}
}

@media (max-width: 768px) {
	.grid {
		grid-template-columns: repeat(2, 1fr);
	}
	
	.metric_card {
		min-height: 90px;
		padding: 12px;
	}
}

@media (max-width: 480px) {
	.grid {
		grid-template-columns: 1fr;
	}
}
</style> 