<script setup>
/** Services */
import { truncateAddress } from "@/services/utils/tokenFlow"

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
					<div :class="$style.node_icon">
						<Icon name="zap" size="12" :color="isHovered ? 'brand' : 'secondary'" />
					</div>
					<Text size="11" weight="600" :color="isHovered ? 'brand' : 'secondary'">
						{{ outCount > 0 && inCount === 0 ? 'Sender' : inCount > 0 && outCount === 0 ? 'Receiver' : 'Intermediary' }}
					</Text>
				</Flex>
				<CopyButton :text="node.address" size="10" />
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
	z-index: 10;
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

.address {
	transition: all 0.2s ease;

	&:hover {
		color: var(--brand) !important;
	}
}
</style>
