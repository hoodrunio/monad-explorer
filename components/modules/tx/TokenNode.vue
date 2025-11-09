<script setup>
/** Services */
import { truncateAddress } from "@/services/utils/tokenFlow"
import { computed } from "vue"

const props = defineProps({
	node: {
		type: Object,
		required: true,
	},
	isHovered: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits(['hover', 'unhover'])

const handleMouseEnter = () => {
	emit('hover', props.node)
}

const handleMouseLeave = () => {
	emit('unhover')
}

// Calculate node stats
const inCount = props.node.transfers.filter(t => t.direction === 'in').length
const outCount = props.node.transfers.filter(t => t.direction === 'out').length

// Helper function to truncate long names
const truncateName = (name, maxLength = 18) => {
	if (!name || name.length <= maxLength) return name
	return name.slice(0, maxLength - 3) + '...'
}

// Helper to get nodeType value (handles both string and object formats)
const getNodeTypeValue = (key) => {
	const nodeType = props.node.nodeType
	if (typeof nodeType === 'string') {
		return key === 'type' ? nodeType : nodeType
	}
	return nodeType?.[key]
}

// Node type display - prioritize name field, then fallback to role-based labels
const nodeTypeLabel = computed(() => {
	const nodeType = props.node.nodeType

	// Handle legacy string format (backward compatibility)
	if (typeof nodeType === 'string') {
		if (nodeType === 'burn') return 'Burn'
		if (nodeType === 'mint') return 'Mint'
		if (props.node.name) return truncateName(props.node.name)
		return nodeType.charAt(0).toUpperCase() + nodeType.slice(1)
	}

	// New object format
	// 1. First priority: Special addresses (burn destination)
	if (nodeType.type === 'burn') {
		return 'Burn'
	}

	// 2. Second priority: Verified name from API
	if (props.node.name) {
		return truncateName(props.node.name)
	}

	// 3. Role-based labels
	const roleLabels = {
		'burn-initiator': 'Burn Initiator',
		'burn-destination': 'Burn',
		'mint-recipient': 'Mint Recipient',
		'swap-participant': 'Swap/Trade',
		'intermediary': 'Intermediary',
		'sender': 'Sender',
		'receiver': 'Receiver'
	}

	return roleLabels[nodeType.role] || roleLabels[nodeType.type] || 'Address'
})

const nodeTypeColor = computed(() => {
	const type = getNodeTypeValue('type')
	const role = getNodeTypeValue('role')

	// Burn always red
	if (type === 'burn') return 'red'

	// Swap participant - purple/blue for exchange
	if (role === 'swap-participant' || type === 'swap') return 'brand'

	// Burn initiator - orange (user burning tokens)
	if (role === 'burn-initiator') return 'orange'

	// Mint recipient - green (user receiving minted tokens)
	if (role === 'mint-recipient') return 'green'

	// Legacy mint handling
	if (type === 'mint') return 'green'

	// If has verified name, use brand color to highlight it
	if (props.node.name) {
		return props.isHovered ? 'brand' : 'primary'
	}

	// Intermediary without name - orange to show it's in the middle
	if (type === 'intermediary') return 'orange'

	// Default
	return props.isHovered ? 'brand' : 'secondary'
})

const nodeIcon = computed(() => {
	const type = getNodeTypeValue('type')
	const role = getNodeTypeValue('role')

	if (type === 'burn') return 'burn'
	if (role === 'swap-participant' || type === 'swap') return 'arrows-exchange'
	if (role === 'burn-initiator') return 'arrow-up'
	if (role === 'mint-recipient') return 'arrow-down'
	if (type === 'mint') return 'plus'
	if (type === 'intermediary') return 'hash'

	return 'zap'
})
</script>

<template>
	<div
		:class="[$style.node, isHovered && $style.hovered]"
		@mouseenter="handleMouseEnter"
		@mouseleave="handleMouseLeave"
	>
		<Flex direction="column" gap="8" wide>
			<!-- Address Header -->
			<Flex align="center" justify="between" wide>
				<Flex align="center" gap="6">
					<div :class="[
						$style.node_icon,
						getNodeTypeValue('type') === 'burn' && $style.burn_icon,
						getNodeTypeValue('role') === 'burn-initiator' && $style.burn_initiator_icon,
						getNodeTypeValue('role') === 'mint-recipient' && $style.mint_icon
					]">
						<Icon :name="nodeIcon" size="12" :color="nodeTypeColor" />
					</div>
					<Text size="11" weight="600" :color="nodeTypeColor">
						{{ nodeTypeLabel }}
					</Text>
				</Flex>
				<CopyButton v-if="getNodeTypeValue('type') !== 'burn'" :text="node.address" size="10" />
			</Flex>

			<!-- Address Display -->
			<Flex direction="column" gap="4">
				<NuxtLink :to="`/address/${node.address}`">
					<Text
						size="12"
						weight="600"
						:color="isHovered ? 'primary' : 'secondary'"
						mono
						:class="$style.address"
					>
						{{ truncateAddress(node.address, 8, 6) }}
					</Text>
				</NuxtLink>
			</Flex>

			<!-- Transfer Stats -->
			<Flex align="center" justify="between" wide>
				<Flex v-if="outCount > 0" align="center" gap="4">
					<Icon name="arrow-narrow-up" size="10" color="tertiary" />
					<Text size="10" weight="600" color="tertiary">{{ outCount }} out</Text>
				</Flex>
				<Flex v-if="inCount > 0" align="center" gap="4">
					<Icon name="arrow-narrow-down" size="10" color="tertiary" />
					<Text size="10" weight="600" color="tertiary">{{ inCount }} in</Text>
				</Flex>
			</Flex>
		</Flex>
	</div>
</template>

<style module>
.node {
	width: 200px;
	min-height: 60px;

	border-radius: 8px;
	background: var(--card-background);
	border: 2px solid var(--op-10);

	padding: 10px 12px;

	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

	&:hover {
		border-color: var(--brand);
		box-shadow: 0 0 12px rgba(24, 210, 165, 0.2);
		transform: translateY(-1px);
	}
}

.node.hovered {
	border-color: var(--brand);
	box-shadow: 0 0 16px rgba(24, 210, 165, 0.3);
	background: linear-gradient(135deg, var(--card-background), rgba(24, 210, 165, 0.05));
	transform: translateY(-2px);
	position: relative;
	z-index: 1000;
}

.node_icon {
	display: flex;
	align-items: center;
	justify-content: center;

	width: 20px;
	height: 20px;

	border-radius: 4px;
	background: var(--op-5);
	border: 1px solid var(--op-10);

	transition: all 0.2s ease;
}

.node:hover .node_icon,
.node.hovered .node_icon {
	background: rgba(24, 210, 165, 0.1);
	border-color: var(--brand);
}

.burn_icon {
	background: rgba(239, 68, 68, 0.1) !important;
	border-color: rgba(239, 68, 68, 0.3) !important;
}

.node:hover .burn_icon,
.node.hovered .burn_icon {
	background: rgba(239, 68, 68, 0.2) !important;
	border-color: rgba(239, 68, 68, 0.6) !important;
}

.burn_initiator_icon {
	background: rgba(251, 146, 60, 0.1) !important;
	border-color: rgba(251, 146, 60, 0.3) !important;
}

.node:hover .burn_initiator_icon,
.node.hovered .burn_initiator_icon {
	background: rgba(251, 146, 60, 0.2) !important;
	border-color: rgba(251, 146, 60, 0.6) !important;
}

.mint_icon {
	background: rgba(16, 185, 129, 0.1) !important;
	border-color: rgba(16, 185, 129, 0.3) !important;
}

.node:hover .mint_icon,
.node.hovered .mint_icon {
	background: rgba(16, 185, 129, 0.2) !important;
	border-color: rgba(16, 185, 129, 0.6) !important;
}

.address {
	transition: all 0.2s ease;

	&:hover {
		color: var(--brand) !important;
	}
}
</style>
