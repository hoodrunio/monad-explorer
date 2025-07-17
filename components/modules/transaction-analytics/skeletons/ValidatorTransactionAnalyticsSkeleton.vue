<script setup>
/** Components */
import Skeleton from "@/components/Skeleton.vue"
import TransactionTrendsChartSkeleton from "./TransactionTrendsChartSkeleton.vue"
</script>

<template>
	<Flex direction="column" gap="20" wide :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Skeleton w="16" h="16" r="4" />
				<Skeleton w="140" h="16" r="8" />
			</Flex>

			<Flex align="center" gap="4">
				<Skeleton w="30" h="24" r="12" />
				<Skeleton w="35" h="24" r="12" />
				<Skeleton w="30" h="24" r="12" />
				<Skeleton w="35" h="24" r="12" />
			</Flex>
		</Flex>

		<!-- Performance Metrics Section -->
		<Flex direction="column" gap="16">
			<Skeleton w="130" h="14" r="7" />
			
			<Flex gap="16" :class="$style.metrics_grid">
				<Flex
					v-for="i in 5"
					:key="i"
					direction="column"
					justify="between"
					:class="$style.metric_card"
				>
					<Flex align="center" gap="8">
						<Skeleton w="14" h="14" r="4" />
						<Skeleton w="80" h="12" r="6" />
					</Flex>

					<Skeleton w="100" h="16" r="8" />
				</Flex>
			</Flex>
		</Flex>

		<!-- Transaction Trends Chart Section -->
		<Flex direction="column" gap="16">
			<Skeleton w="200" h="14" r="7" />
			<TransactionTrendsChartSkeleton />
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	background: var(--card-background);
	border-radius: 12px;
	padding: 20px;
	box-shadow: inset 0 0 0 1px var(--op-3);
}

.header {
	margin-bottom: 8px;
}

.metrics_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 12px;
}

.metric_card {
	min-height: 70px;
	background: var(--op-3);
	border-radius: 8px;
	padding: 12px;
}

@media (max-width: 768px) {
	.wrapper {
		padding: 16px;
	}
	
	.metrics_grid {
		grid-template-columns: repeat(2, 1fr);
	}
	
	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}
}

@media (max-width: 480px) {
	.metrics_grid {
		grid-template-columns: 1fr;
	}
}
</style> 