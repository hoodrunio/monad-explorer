<script setup>
/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

const props = defineProps({
	performanceHistory: {
		type: Array,
		required: true,
	},
})

const formatPercentage = (value) => {
	if (value === null || value === undefined) return 'N/A'
	return `${value.toFixed(1)}%`
}

const getEffectiveScore = (entry) => {
	// If no block opportunities, use QC participation rate as uptime score
	if (entry.blockOpportunities === 0) {
		return entry.qcParticipationRate || 0
	}
	// Otherwise use regular uptime score
	return entry.uptimeScore || 0
}

const getPerformanceColor = (entry) => {
	const score = getEffectiveScore(entry)
	
	if (score >= 99) return 'var(--green)'
	if (score >= 95) return 'var(--brand)'
	if (score >= 90) return 'var(--yellow)'
	if (score >= 70) return 'var(--orange)'
	return 'var(--red)'
}

const getPerformanceOpacity = (entry) => {
	const score = getEffectiveScore(entry)
	
	if (score >= 99) return 1
	if (score >= 95) return 0.9
	if (score >= 90) return 0.8
	if (score >= 70) return 0.7
	return 0.6
}

const formatHour = (hour) => {
	if (typeof hour === 'string' && hour !== 'Unknown') {
		try {
			// Parse the timestamp and format as local date and time
			const date = new Date(hour)
			const today = new Date()
			const yesterday = new Date(today)
			yesterday.setDate(yesterday.getDate() - 1)
			
			// Format time
			const localHour = date.getHours()
			const localMinute = date.getMinutes()
			const timeStr = `${localHour.toString().padStart(2, '0')}:${localMinute.toString().padStart(2, '0')}`
			
			// Format date
			if (date.toDateString() === today.toDateString()) {
				return `Today, ${timeStr}`
			} else if (date.toDateString() === yesterday.toDateString()) {
				return `Yesterday, ${timeStr}`
			} else {
				const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
					'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
				const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
				
				return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${timeStr}`
			}
		} catch (error) {
			// Fallback to original behavior
			return hour.includes(':') ? hour : `${hour}:00`
		}
	}
	return `${hour}:00`
}

const getGridData = () => {
	// Ensure we have exactly 100 hours of data, filling with empty entries if needed
	const data = []
	// Get last 100 hours first, then reverse since API returns oldest to newest
	const historyData = props.performanceHistory.slice(-100).reverse()
	
	// Fill the grid with the last 100 hours
	for (let i = 0; i < 100; i++) {
		if (historyData[i]) {
			data.push(historyData[i])
		} else {
			// Create empty entry for missing hours
			data.push({
				hour: i,
				uptimeScore: 0,
				qcParticipationRate: 0,
				blockProposalRatio: null,
				blockOpportunities: 0,
				blocksProposed: 0,
				qcOpportunities: 0,
				qcParticipations: 0,
				isEmpty: true
			})
		}
	}
	
	return data
}

const gridData = computed(() => getGridData())
</script>

<template>
	<Flex direction="column" gap="12">
		
		<Flex v-if="gridData.length" direction="column" gap="16">
			<!-- Performance Grid -->
			<Flex direction="column" gap="12">
				<div :class="$style.grid_container">
					<div v-for="(entry, index) in gridData" :key="index" :class="$style.grid_item">
						<Tooltip v-if="!entry.isEmpty" side="top">
							<div 
								:class="$style.performance_square"
								:style="{ 
									backgroundColor: getPerformanceColor(entry),
									opacity: getPerformanceOpacity(entry)
								}"
							/>
							
							<template #content>
								<Flex direction="column" gap="8">
									<Text size="12" weight="600" color="primary">{{ formatHour(entry.hour) }}</Text>
									
									<Flex direction="column" gap="4">
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" :color="entry.blockOpportunities === 0 ? 'primary' : 'tertiary'">
												{{ entry.blockOpportunities === 0 ? 'Effective Score (QC)' : 'Uptime Score' }}
											</Text>
											<Text size="11" weight="600" :color="entry.blockOpportunities === 0 ? 'primary' : 'secondary'">
												{{ formatPercentage(getEffectiveScore(entry)) }}
											</Text>
										</Flex>
										
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="tertiary">QC Participation</Text>
											<Text size="11" weight="600" color="secondary">{{ formatPercentage(entry.qcParticipationRate) }}</Text>
										</Flex>
										
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="tertiary">Block Proposal</Text>
											<Text size="11" weight="600" color="secondary">{{ formatPercentage(entry.blockProposalRatio) }}</Text>
										</Flex>
									</Flex>
									
									<div :class="$style.tooltip_divider" />
									
									<Flex direction="column" gap="4">
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="tertiary">Blocks Proposed</Text>
											<Text size="11" weight="600" color="secondary">{{ entry.blocksProposed }}</Text>
										</Flex>
										
										<Flex align="center" justify="between" gap="16">
											<Text size="11" weight="500" color="tertiary">QC Participations</Text>
											<Text size="11" weight="600" color="secondary">{{ entry.qcParticipations }}</Text>
										</Flex>
									</Flex>
								</Flex>
							</template>
						</Tooltip>
						
						<div v-else :class="[$style.performance_square, $style.empty_square]" />
					</div>
				</div>
			</Flex>
			

		</Flex>
		
		<Flex v-else align="center" justify="center" :class="$style.no_data">
			<Text size="12" weight="500" color="tertiary">No performance data available</Text>
		</Flex>
	</Flex>
</template>

<style module>
.grid_container {
	display: grid;
	grid-template-columns: repeat(20, 1fr);
	gap: 2px;
	padding: 8px;
	background: var(--op-3);
	border: 1px solid var(--op-8);
	border-radius: 6px;
}

.grid_item {
	display: flex;
	justify-content: center;
	align-items: center;
}

.performance_square {
	width: 12px;
	height: 12px;
	border-radius: 2px;
	cursor: pointer;
	transition: all 0.2s ease;
	border: 1px solid var(--op-8);
}

.performance_square:hover {
	transform: scale(1.1);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.empty_square {
	background: var(--op-5);
	opacity: 0.3;
	cursor: not-allowed;
}

.empty_square:hover {
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
	.grid_container {
		grid-template-columns: repeat(20, 1fr);
		gap: 1px;
		padding: 6px;
	}
	
	.performance_square {
		width: 10px;
		height: 10px;
	}
}

@media (max-width: 480px) {
	.grid_container {
		grid-template-columns: repeat(15, 1fr);
		gap: 1px;
		padding: 4px;
	}
	
	.performance_square {
		width: 8px;
		height: 8px;
	}
}
</style> 