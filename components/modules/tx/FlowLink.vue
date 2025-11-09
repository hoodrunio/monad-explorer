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

// Format amount for display
const formattedAmount = computed(() => {
	// Priority: total.decimals > token.decimals > default 18
	const decimals = parseInt(props.link.transfer.total?.decimals || props.link.transfer.token?.decimals || 18)
	const value = props.link.transfer.total?.value || props.link.transfer.value
	return formatTokenAmount(value, decimals, 4)
})

const handleMouseEnter = () => {
	isHovered.value = true
	// Emit link data with tooltip info
	const sourceNode = props.nodeMap.get(props.link.source)
	const targetNode = props.nodeMap.get(props.link.target)

	// Calculate connection points (where the path actually connects)
	const sourceX = sourceNode.x + 200 // Right edge of source node
	const sourceY = sourceNode.y + sourceNode.height / 2 // Middle of source node
	const targetX = targetNode.x // Left edge of target node
	const targetY = targetNode.y + targetNode.height / 2 // Middle of target node

	// Tooltip at the midpoint of the actual path
	emit('hover', {
		...props.link,
		tooltipX: (sourceX + targetX) / 2,
		tooltipY: (sourceY + targetY) / 2,
		formattedAmount: formattedAmount.value
	})
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
</style>
