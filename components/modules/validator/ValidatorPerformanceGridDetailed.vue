<script setup>
/** Components */
import ValidatorPerformanceGrid from "./ValidatorPerformanceGrid.vue"

const props = defineProps({
	performanceHistory: {
		type: Array,
		required: true,
	},
})
</script>

<template>
	<Flex direction="column" gap="16">
		<Flex align="center" justify="between">
			<Text size="13" weight="600" color="primary">100-Hour Performance History</Text>
			<Text size="11" weight="500" color="tertiary">(last 100 hours)</Text>
		</Flex>
		
		<ValidatorPerformanceGrid :performance-history="performanceHistory" />
		
		<!-- Legend -->
		<Flex direction="column" gap="8">
			<Text size="11" weight="600" color="secondary">Uptime Score Legend</Text>
			<Flex align="center" gap="16" wrap>
				<Flex align="center" gap="4">
					<div :class="$style.legend_square" :style="{ backgroundColor: 'var(--green)' }" />
					<Text size="10" weight="500" color="tertiary">99-100%</Text>
				</Flex>
				<Flex align="center" gap="4">
					<div :class="$style.legend_square" :style="{ backgroundColor: 'var(--brand)' }" />
					<Text size="10" weight="500" color="tertiary">95-99%</Text>
				</Flex>
				<Flex align="center" gap="4">
					<div :class="$style.legend_square" :style="{ backgroundColor: 'var(--yellow)' }" />
					<Text size="10" weight="500" color="tertiary">90-95%</Text>
				</Flex>
				<Flex align="center" gap="4">
					<div :class="$style.legend_square" :style="{ backgroundColor: 'var(--orange)' }" />
					<Text size="10" weight="500" color="tertiary">70-90%</Text>
				</Flex>
				<Flex align="center" gap="4">
					<div :class="$style.legend_square" :style="{ backgroundColor: 'var(--red)' }" />
					<Text size="10" weight="500" color="tertiary">0-70%</Text>
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.legend_square {
	width: 12px;
	height: 12px;
	border-radius: 2px;
	border: 1px solid var(--op-8);
}
</style> 