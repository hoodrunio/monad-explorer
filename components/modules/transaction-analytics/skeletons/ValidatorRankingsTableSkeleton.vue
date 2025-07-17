<script setup>
/** Components */
import Skeleton from "@/components/Skeleton.vue"

const props = defineProps({
	rowCount: {
		type: Number,
		default: 5,
	},
	compact: {
		type: Boolean,
		default: false,
	},
})
</script>

<template>
	<Flex direction="column" gap="0" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Skeleton w="40" h="12" r="6" />
			<Skeleton w="60" h="12" r="6" />
			<Skeleton w="50" h="12" r="6" />
			<Skeleton w="60" h="12" r="6" />
			<Skeleton w="65" h="12" r="6" />
			<Skeleton w="70" h="12" r="6" />
		</Flex>

		<!-- Rows -->
		<Flex direction="column" gap="0">
			<Flex
				v-for="i in rowCount"
				:key="i"
				align="center"
				justify="between"
				:class="$style.row"
			>
				<!-- Rank Badge -->
				<Flex align="center" :class="$style.rank_cell">
					<Skeleton w="35" h="20" r="12" />
				</Flex>

				<!-- Validator Info -->
				<Flex align="center" gap="8" :class="$style.validator_cell">
					<Skeleton w="32" h="32" r="16" />
					<Flex direction="column" gap="4">
						<Skeleton w="120" h="13" r="6" />
						<Skeleton w="80" h="11" r="6" />
					</Flex>
				</Flex>

				<!-- Metrics -->
				<Flex align="center" :class="$style.metric_cell">
					<Skeleton w="50" h="13" r="6" />
				</Flex>

				<Flex align="center" :class="$style.metric_cell">
					<Skeleton w="40" h="13" r="6" />
				</Flex>

				<Flex align="center" :class="$style.metric_cell">
					<Skeleton w="45" h="13" r="6" />
				</Flex>

				<Flex align="center" :class="$style.metric_cell">
					<Skeleton w="60" h="13" r="6" />
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	background: var(--card-background);
	border-radius: 12px;
	box-shadow: inset 0 0 0 1px var(--op-3);
	overflow: hidden;
}

.header {
	background: var(--op-3);
	padding: 12px 16px;
	border-bottom: 1px solid var(--op-5);
}

.header > * {
	flex: 1;
	text-align: left;
}

.header > *:first-child {
	flex: 0 0 80px;
	text-align: center;
}

.header > *:nth-child(2) {
	flex: 2;
}

.row {
	padding: 12px 16px;
	border-bottom: 1px solid var(--op-3);
}

.row:last-child {
	border-bottom: none;
}

.row > * {
	flex: 1;
}

.rank_cell {
	flex: 0 0 80px;
	justify-content: center;
}

.validator_cell {
	flex: 2;
}

.metric_cell {
	justify-content: flex-start;
}

@media (max-width: 768px) {
	.header,
	.row {
		padding: 8px 12px;
	}
	
	.header > *:nth-child(4),
	.header > *:nth-child(5),
	.row > *:nth-child(4),
	.row > *:nth-child(5) {
		display: none;
	}
}

@media (max-width: 480px) {
	.header > *:nth-child(6),
	.row > *:nth-child(6) {
		display: none;
	}
	
	.validator_cell {
		flex: 1.5;
	}
}
</style> 