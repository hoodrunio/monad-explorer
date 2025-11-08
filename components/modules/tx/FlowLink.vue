<script setup>
/** Services */
import { formatTokenAmount, calculateLinkPath } from "@/services/utils/tokenFlow"
import { ref, computed } from "vue"

const props = defineProps({
	link: {
		type: Object,
		required: true,
	},
	nodeMap: {
		type: Map,
		required: true,
	},
	isHighlighted: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits(['hover', 'unhover'])

const isHovered = ref(false)

const handleMouseEnter = () => {
	isHovered.value = true
	emit('hover', props.link)
}

const handleMouseLeave = () => {
	isHovered.value = false
	emit('unhover')
}

// Calculate path
const pathD = computed(() => calculateLinkPath(props.link, props.nodeMap))

// Calculate stroke width based on value (Sankey style)
const strokeWidth = computed(() => {
	const baseWidth = 3
	const maxWidth = 20
	// Logarithmic scale for better visualization
	const logValue = Math.log10(parseFloat(props.link.value) + 1)
	return Math.min(baseWidth + logValue * 2, maxWidth)
})

// Format amount for display
const formattedAmount = computed(() => {
	const decimals = props.link.transfer.token?.decimals || 18
	return formatTokenAmount(props.link.transfer.total?.value || props.link.transfer.value, decimals, 4)
})
</script>

<template>
	<g
		:class="$style.link_group"
		@mouseenter="handleMouseEnter"
		@mouseleave="handleMouseLeave"
	>
		<!-- Background glow (visible on hover) -->
		<path
			v-if="isHovered || isHighlighted"
			:d="pathD"
			:class="$style.link_glow"
			:stroke="link.color.base"
			:stroke-width="strokeWidth + 8"
			fill="none"
			opacity="0.2"
		/>

		<!-- Main path -->
		<path
			:d="pathD"
			:class="[$style.link_path, (isHovered || isHighlighted) && $style.active]"
			:stroke="link.color.base"
			:stroke-width="strokeWidth"
			fill="none"
		/>

		<!-- Animated particles along the path -->
		<path
			v-if="isHovered || isHighlighted"
			:d="pathD"
			:class="$style.link_particle"
			:stroke="link.color.light"
			:stroke-width="strokeWidth * 0.6"
			fill="none"
		/>

		<!-- Hover tooltip area (invisible but catches mouse events) -->
		<path
			:d="pathD"
			:class="$style.link_hitbox"
			:stroke-width="Math.max(strokeWidth + 10, 20)"
			fill="none"
			stroke="transparent"
		/>

		<!-- Tooltip on hover -->
		<foreignObject
			v-if="isHovered"
			:x="(nodeMap.get(link.source).x + nodeMap.get(link.target).x) / 2 - 80"
			:y="(nodeMap.get(link.source).y + nodeMap.get(link.target).y) / 2 - 40"
			width="160"
			height="80"
			:class="$style.tooltip"
		>
			<div :class="$style.tooltip_content">
				<Flex direction="column" gap="6" align="center">
					<Flex align="center" gap="4">
						<div
							:class="$style.token_indicator"
							:style="{ background: link.color.gradient }"
						/>
						<Text size="11" weight="600" color="primary">
							{{ link.token.symbol }}
						</Text>
					</Flex>
					<Text size="12" weight="700" color="brand">
						{{ formattedAmount }}
					</Text>
					<Text size="10" weight="600" color="tertiary">
						{{ link.token.type || 'Token' }}
					</Text>
				</Flex>
			</div>
		</foreignObject>
	</g>
</template>

<style module>
.link_group {
	cursor: pointer;
}

.link_path {
	stroke-linecap: round;
	stroke-linejoin: round;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	opacity: 0.6;
}

.link_path.active {
	opacity: 1;
	filter: drop-shadow(0 0 4px currentColor);
}

.link_glow {
	stroke-linecap: round;
	stroke-linejoin: round;
	filter: blur(8px);
	animation: pulse 2s ease-in-out infinite;
}

.link_particle {
	stroke-linecap: round;
	stroke-linejoin: round;
	stroke-dasharray: 10 30;
	animation: flow 2s linear infinite;
	opacity: 0.8;
}

.link_hitbox {
	cursor: pointer;
}

.tooltip {
	pointer-events: none;
	z-index: 100;
}

.tooltip_content {
	background: var(--card-background);
	border: 2px solid var(--brand);
	border-radius: 8px;
	padding: 10px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 16px rgba(24, 210, 165, 0.2);
	animation: tooltipFadeIn 0.2s ease;
}

.token_indicator {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	box-shadow: 0 0 6px rgba(24, 210, 165, 0.4);
}

@keyframes flow {
	from {
		stroke-dashoffset: 40;
	}
	to {
		stroke-dashoffset: 0;
	}
}

@keyframes pulse {
	0%, 100% {
		opacity: 0.2;
	}
	50% {
		opacity: 0.4;
	}
}

@keyframes tooltipFadeIn {
	from {
		opacity: 0;
		transform: scale(0.9);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>
