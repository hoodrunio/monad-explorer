<script setup>
/** Components */
import Skeleton from "@/components/Skeleton.vue"
</script>

<template>
	<Flex direction="column" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Skeleton w="180" h="13" r="6" />
			<Skeleton w="80" h="11" r="6" />
		</Flex>

		<!-- Chart Area -->
		<Flex direction="column" gap="16" :class="$style.chart_container">
			<!-- Legend -->
			<Flex align="center" gap="24" justify="center">
				<Flex align="center" gap="8">
					<Skeleton w="20" h="2" r="1" />
					<Skeleton w="100" h="11" r="6" />
				</Flex>
				<Flex align="center" gap="8">
					<Skeleton w="20" h="2" r="1" />
					<Skeleton w="90" h="11" r="6" />
				</Flex>
			</Flex>

			<!-- Chart Placeholder -->
			<Flex direction="column" :class="$style.chart_area">
				<!-- Y-axis labels -->
				<Flex align="center" justify="between" :class="$style.y_axis">
					<Flex direction="column" gap="20">
						<Skeleton w="30" h="10" r="5" />
						<Skeleton w="25" h="10" r="5" />
						<Skeleton w="20" h="10" r="5" />
						<Skeleton w="15" h="10" r="5" />
						<Skeleton w="10" h="10" r="5" />
					</Flex>
					
					<!-- Chart visualization placeholder -->
					<Flex :class="$style.chart_visualization">
						<!-- Simulated chart lines -->
						<svg :class="$style.chart_svg" viewBox="0 0 400 200">
							<!-- Grid lines -->
							<defs>
								<pattern id="grid" width="40" height="25" patternUnits="userSpaceOnUse">
									<path d="M 40 0 L 0 0 0 25" fill="none" stroke="var(--op-5)" stroke-width="0.5"/>
								</pattern>
							</defs>
							<rect width="100%" height="100%" fill="url(#grid)" />
							
							<!-- Animated skeleton lines -->
							<path 
								d="M 0 150 Q 100 120 200 100 T 400 80" 
								fill="none" 
								stroke="var(--op-10)" 
								stroke-width="2"
								:class="$style.skeleton_line"
							/>
							<path 
								d="M 0 180 Q 100 160 200 140 T 400 120" 
								fill="none" 
								stroke="var(--op-8)" 
								stroke-width="2"
								stroke-dasharray="5,5"
								:class="$style.skeleton_line"
							/>
						</svg>
					</Flex>

					<Flex direction="column" gap="20">
						<Skeleton w="30" h="10" r="5" />
						<Skeleton w="25" h="10" r="5" />
						<Skeleton w="20" h="10" r="5" />
						<Skeleton w="15" h="10" r="5" />
						<Skeleton w="10" h="10" r="5" />
					</Flex>
				</Flex>

				<!-- X-axis labels -->
				<Flex align="center" justify="between" :class="$style.x_axis">
					<Skeleton w="35" h="10" r="5" />
					<Skeleton w="35" h="10" r="5" />
					<Skeleton w="35" h="10" r="5" />
					<Skeleton w="35" h="10" r="5" />
					<Skeleton w="35" h="10" r="5" />
					<Skeleton w="35" h="10" r="5" />
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	background: var(--card-background);
	border-radius: 12px;
	padding: 16px;
	box-shadow: inset 0 0 0 1px var(--op-3);
}

.header {
	margin-bottom: 16px;
}

.chart_container {
	width: 100%;
	min-height: 400px;
}

.chart_area {
	width: 100%;
	height: 320px;
}

.y_axis {
	height: 200px;
	margin-bottom: 16px;
}

.chart_visualization {
	flex: 1;
	height: 200px;
	margin: 0 16px;
	background: var(--op-3);
	border-radius: 8px;
	position: relative;
}

.chart_svg {
	width: 100%;
	height: 100%;
}

.skeleton_line {
	animation: skeleton-pulse 2s ease-in-out infinite;
}

.x_axis {
	margin-top: 8px;
}

@keyframes skeleton-pulse {
	0% {
		opacity: 0.6;
	}
	50% {
		opacity: 0.3;
	}
	100% {
		opacity: 0.6;
	}
}

@media (max-width: 768px) {
	.chart_container {
		min-height: 300px;
	}
	
	.chart_area {
		height: 220px;
	}
	
	.y_axis {
		height: 150px;
	}
	
	.chart_visualization {
		height: 150px;
	}
}
</style> 