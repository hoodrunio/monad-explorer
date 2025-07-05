<script setup>
/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

/** Utilities */
import { 
	calculateDailyPerformance, 
	getPerformanceColor, 
	getPerformanceOpacity, 
	formatPercentage, 
	formatDayName 
} from "@/services/utils/validator"

const props = defineProps({
	performanceHistory: {
		type: Array,
		required: true,
	},
})

const dailyData = computed(() => {
	return calculateDailyPerformance(props.performanceHistory)
})
</script>

<template>
	<Flex direction="column" gap="16">
		<Flex align="center" justify="between">
			<Text size="13" weight="600" color="primary">7-Day Performance History</Text>
			<Text size="11" weight="500" color="tertiary">(last 168 hours)</Text>
		</Flex>
		
		<Flex v-if="dailyData.length" direction="column" gap="16">
			<!-- Daily Performance Cards -->
			<Flex direction="column" gap="8">
				<Text size="11" weight="600" color="secondary">Daily performance averages (7 days)</Text>
				<div :class="$style.daily_grid">
					<div v-for="(day, index) in dailyData" :key="index" :class="$style.daily_item">
						<Tooltip v-if="!day.isEmpty" side="top">
							<div 
								:class="$style.daily_card"
								:style="{ 
									backgroundColor: getPerformanceColor(day.effectiveScore),
									opacity: getPerformanceOpacity(day.effectiveScore)
								}"
							>
								<Flex direction="column" align="center" gap="4">
									<Text size="10" weight="600" color="white">{{ formatDayName(day.date) }}</Text>
									<Text size="12" weight="700" color="white">{{ formatPercentage(day.effectiveScore) }}</Text>
									<Text size="8" weight="500" color="white" style="opacity: 0.8">{{ day.hoursWithData }}h data</Text>
								</Flex>
							</div>
							
							<template #content>
								<Flex direction="column" gap="8">
									<Text size="12" weight="600" color="primary">{{ formatDayName(day.date) }} - Day {{ day.day }}</Text>
									
									<Flex direction="column" gap="4">
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="primary">Effective Score</Text>
											<Text size="11" weight="600" color="primary">{{ formatPercentage(day.effectiveScore) }}</Text>
										</Flex>
										
										<div :class="$style.tooltip_divider" />
										
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="tertiary">Avg Uptime Score</Text>
											<Text size="11" weight="600" color="secondary">{{ formatPercentage(day.avgUptimeScore) }}</Text>
										</Flex>
										
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="tertiary">Avg QC Participation</Text>
											<Text size="11" weight="600" color="secondary">{{ formatPercentage(day.avgQcParticipationRate) }}</Text>
										</Flex>
										
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="tertiary">Avg Block Proposal</Text>
											<Text size="11" weight="600" color="secondary">{{ formatPercentage(day.avgBlockProposalRatio) }}</Text>
										</Flex>
									</Flex>
									
									<Flex direction="column" gap="4">
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="tertiary">Total Blocks Proposed</Text>
											<Text size="11" weight="600" color="secondary">{{ day.totalBlocksProposed }}</Text>
										</Flex>
										
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="tertiary">Total QC Participations</Text>
											<Text size="11" weight="600" color="secondary">{{ day.totalQcParticipations }}</Text>
										</Flex>
										
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="tertiary">Block Opportunities</Text>
											<Text size="11" weight="600" color="secondary">{{ day.totalBlockOpportunities }}</Text>
										</Flex>
										
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="tertiary">Hours with Data</Text>
											<Text size="11" weight="600" color="secondary">{{ day.hoursWithData }}/24</Text>
										</Flex>
									</Flex>
								</Flex>
							</template>
						</Tooltip>
						
						<div v-else :class="[$style.daily_card, $style.empty_card]">
							<Flex direction="column" align="center" gap="4">
								<Text size="10" weight="600" color="tertiary">{{ formatDayName(day.date) }}</Text>
								<Text size="12" weight="700" color="tertiary">No Data</Text>
							</Flex>
						</div>
					</div>
				</div>
			</Flex>
			
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
		
		<Flex v-else align="center" justify="center" :class="$style.no_data">
			<Text size="12" weight="500" color="tertiary">No performance data available</Text>
		</Flex>
	</Flex>
</template>

<style module>
.daily_grid {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 12px;
	padding: 16px;
	background: var(--op-3);
	border: 1px solid var(--op-8);
	border-radius: 8px;
}

.daily_item {
	display: flex;
	justify-content: center;
	align-items: center;
}

.daily_card {
	width: 100%;
	min-height: 80px;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s ease;
	border: 1px solid var(--op-8);
	padding: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.daily_card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.empty_card {
	background: var(--op-5);
	opacity: 0.5;
	cursor: not-allowed;
}

.empty_card:hover {
	transform: none;
	box-shadow: none;
}

.legend_square {
	width: 12px;
	height: 12px;
	border-radius: 2px;
	border: 1px solid var(--op-8);
}

.tooltip_divider {
	width: 100%;
	height: 1px;
	background: var(--op-8);
}

.no_data {
	padding: 40px 20px;
	border: 1px dashed var(--op-8);
	border-radius: 6px;
}

@media (max-width: 768px) {
	.daily_grid {
		grid-template-columns: repeat(7, 1fr);
		gap: 8px;
		padding: 12px;
	}
	
	.daily_card {
		min-height: 60px;
		padding: 8px;
	}
}

@media (max-width: 480px) {
	.daily_grid {
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		padding: 8px;
	}
	
	.daily_card {
		min-height: 50px;
		padding: 6px;
	}
}
</style> 