<script setup>
/** Vue */
import { ref, computed } from "vue"

/** Components */
import TokenNode from "./TokenNode.vue"
import FlowLink from "./FlowLink.vue"

/** Services */
import { calculateSankeyLayout } from "@/services/utils/tokenFlow"

const props = defineProps({
	transfers: {
		type: Array,
		required: true,
		default: () => [],
	},
})

// Calculate layout
const layout = computed(() => calculateSankeyLayout(props.transfers))

// Create node map for easy lookup
const nodeMap = computed(() => {
	const map = new Map()
	layout.value.nodes.forEach(node => {
		map.set(node.id, node)
	})
	return map
})

// Hover state management
const hoveredNode = ref(null)
const hoveredLink = ref(null)

const handleNodeHover = (node) => {
	hoveredNode.value = node
}

const handleNodeUnhover = () => {
	hoveredNode.value = null
}

const handleLinkHover = (link) => {
	hoveredLink.value = link
}

const handleLinkUnhover = () => {
	hoveredLink.value = null
}

// Check if a node is highlighted (related to hovered link)
const isNodeHighlighted = (node) => {
	if (!hoveredLink.value) return false
	return hoveredLink.value.source === node.id || hoveredLink.value.target === node.id
}

// Check if a link is highlighted (related to hovered node)
const isLinkHighlighted = (link) => {
	if (!hoveredNode.value) return false
	return link.source === hoveredNode.value.id || link.target === hoveredNode.value.id
}

// SVG viewBox
const viewBox = computed(() => {
	if (!layout.value.width || !layout.value.height) {
		return "0 0 600 300"
	}
	const padding = 40
	return `${-padding} ${-padding} ${layout.value.width + padding * 2} ${layout.value.height + padding * 2}`
})
</script>

<template>
	<div :class="$style.container">
		<svg
			:viewBox="viewBox"
			:class="$style.svg"
			preserveAspectRatio="xMidYMid meet"
		>
			<!-- Define layers -->
			<defs>
				<!-- Optional: Add gradient definitions here if needed -->
			</defs>

			<!-- Layer 1: Render links (bottom layer) -->
			<g :class="$style.links">
				<FlowLink
					v-for="link in layout.links"
					:key="link.id"
					:link="link"
					:node-map="nodeMap"
					:is-highlighted="isLinkHighlighted(link)"
					@hover="handleLinkHover"
					@unhover="handleLinkUnhover"
				/>
			</g>

			<!-- Layer 2: Render non-hovered nodes -->
			<g :class="$style.nodes">
				<foreignObject
					v-for="node in layout.nodes"
					:key="`node-${node.id}`"
					:x="node.x"
					:y="node.y"
					width="200"
					:height="node.height"
					:style="{ zIndex: (hoveredNode?.id === node.id || isNodeHighlighted(node)) ? 1000 : 1 }"
				>
					<TokenNode
						:node="node"
						:is-hovered="hoveredNode?.id === node.id || isNodeHighlighted(node)"
						@hover="handleNodeHover"
						@unhover="handleNodeUnhover"
					/>
				</foreignObject>
			</g>

			<!-- Layer 3: Render tooltip on top (if any link is hovered) -->
			<g v-if="hoveredLink" :class="$style.tooltip_layer">
				<!-- Tooltip arrow pointer -->
				<path
					:d="`M ${hoveredLink.tooltipX} ${hoveredLink.tooltipY - 20} L ${hoveredLink.tooltipX - 6} ${hoveredLink.tooltipY - 28} L ${hoveredLink.tooltipX + 6} ${hoveredLink.tooltipY - 28} Z`"
					fill="var(--brand)"
					opacity="0.9"
				/>

				<foreignObject
					:x="hoveredLink.tooltipX - 80"
					:y="hoveredLink.tooltipY - 100"
					width="160"
					height="72"
					style="pointer-events: none; overflow: visible;"
				>
					<div :class="$style.tooltip_content">
						<Flex direction="column" gap="6" align="center">
							<Flex align="center" gap="4">
								<div
									:class="$style.token_indicator"
									:style="{ background: hoveredLink.color.gradient }"
								/>
								<Text size="11" weight="600" color="primary">
									{{ hoveredLink.transfer.token?.name || hoveredLink.transfer.token?.symbol || hoveredLink.token.symbol || 'Token' }}
								</Text>
							</Flex>
							<Text size="13" weight="700" color="brand">
								{{ hoveredLink.formattedAmount }}
							</Text>
							<Text size="10" weight="600" color="tertiary">
								{{ hoveredLink.transfer.token?.type || hoveredLink.token.type || 'Token' }}
							</Text>
						</Flex>
					</div>
				</foreignObject>
			</g>
		</svg>

		<!-- Legend -->
		<Flex :class="$style.legend" align="center" justify="center" gap="16">
			<Flex align="center" gap="6">
				<div :class="[$style.legend_line, $style.erc20]" />
				<Text size="11" weight="600" color="tertiary">ERC-20</Text>
			</Flex>
			<Flex align="center" gap="6">
				<div :class="[$style.legend_line, $style.erc721]" />
				<Text size="11" weight="600" color="tertiary">ERC-721</Text>
			</Flex>
			<Flex align="center" gap="6">
				<div :class="[$style.legend_line, $style.erc1155]" />
				<Text size="11" weight="600" color="tertiary">ERC-1155</Text>
			</Flex>
			<div :class="$style.legend_divider" />
			<Flex align="center" gap="6">
				<div :class="[$style.legend_line, $style.mint]" />
				<Text size="11" weight="600" color="green">Mint</Text>
			</Flex>
			<Flex align="center" gap="6">
				<div :class="[$style.legend_line, $style.burn]" />
				<Text size="11" weight="600" color="red">Burn</Text>
			</Flex>
		</Flex>

		<!-- Info banner -->
		<Flex :class="$style.info_banner" align="center" justify="center" gap="6">
			<Icon name="zap" size="12" color="tertiary" />
			<Text size="11" weight="600" color="tertiary">
				Hover over nodes and paths to see details • Flow width represents amount
			</Text>
		</Flex>
	</div>
</template>

<style module>
.container {
	width: 100%;
	min-height: 400px;
	position: relative;
	background: linear-gradient(135deg, var(--card-background), rgba(24, 210, 165, 0.02));
	border-radius: 8px;
	border: 1px solid var(--op-8);
	padding: 24px 16px 16px 16px;
	overflow: hidden;
}

.svg {
	width: 100%;
	height: auto;
	min-height: 350px;
	display: block;
}

.links {
	/* Links render below nodes */
}

.nodes {
	/* Nodes render above links */
}

.hovered_node_layer {
	/* Reserved for future use */
}

.tooltip_layer {
	/* Tooltip renders on top of everything */
	pointer-events: none;
}

.tooltip_content {
	background: var(--card-background);
	border: 2px solid var(--brand);
	border-radius: 8px;
	padding: 10px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(24, 210, 165, 0.4);
	animation: tooltipFadeIn 0.2s ease;
}

.token_indicator {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	box-shadow: 0 0 6px rgba(24, 210, 165, 0.4);
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

.legend {
	margin-top: 16px;
	padding: 10px;
	background: var(--op-5);
	border-radius: 6px;
	border: 1px solid var(--op-8);
}

.legend_line {
	width: 32px;
	height: 3px;
	border-radius: 2px;
}

.legend_line.erc20 {
	background: linear-gradient(90deg, #18d2a5, #4de0b8);
}

.legend_line.erc721 {
	background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

.legend_line.erc1155 {
	background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.legend_line.mint {
	background: linear-gradient(90deg, #10b981, #34d399);
}

.legend_line.burn {
	background: linear-gradient(90deg, #ef4444, #dc2626);
}

.legend_divider {
	width: 1px;
	height: 16px;
	background: var(--op-10);
}

.info_banner {
	margin-top: 12px;
	padding: 8px;
	background: var(--op-3);
	border-radius: 6px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.container {
		min-height: 300px;
		padding: 16px 12px 12px 12px;
	}

	.svg {
		min-height: 250px;
	}

	.legend {
		flex-direction: column;
		gap: 8px;
	}

	.info_banner {
		& span {
			text-align: center;
			font-size: 10px;
		}
	}
}
</style>
