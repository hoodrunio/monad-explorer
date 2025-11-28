<script setup>
/**
 * Protocol Card Component
 * Displays a protocol with expandable contract list
 */
import { shortHex } from "@/services/utils"

const props = defineProps({
	protocol: {
		type: Object,
		required: true
	},
	expanded: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['click', 'contractClick'])

const categoryClass = computed(() => {
	const ctype = props.protocol.ctype?.toLowerCase()
	return ctype ? `category_${ctype.replace(/\s+/g, '_')}` : ''
})

const handleContractClick = (e, contract) => {
	e.stopPropagation()
	emit('contractClick', contract)
}
</script>

<template>
	<Flex direction="column" :class="$style.card" @click="emit('click')">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="12">
				<div :class="[$style.category_badge, $style[categoryClass]]">
					<Text size="11" weight="600">{{ protocol.ctype }}</Text>
				</div>
				<Flex direction="column" gap="2">
					<Text size="14" weight="600" color="primary">{{ protocol.name }}</Text>
					<Text v-if="protocol.csubtype" size="12" color="tertiary">{{ protocol.csubtype }}</Text>
				</Flex>
			</Flex>
			<Flex align="center" gap="8">
				<Text size="12" color="secondary">{{ protocol.contracts?.length || 0 }} contracts</Text>
				<Icon name="chevron" size="12" color="tertiary" :class="[expanded && $style.rotated]" />
			</Flex>
		</Flex>

		<!-- Contracts List (expanded) -->
		<Flex v-if="expanded && protocol.contracts?.length" direction="column" :class="$style.contracts">
			<NuxtLink
				v-for="contract in protocol.contracts"
				:key="contract.address"
				:to="`/address/${contract.address}`"
				:class="$style.contract_row"
				@click.stop
			>
				<Flex align="center" justify="between" wide>
					<Text size="12" color="secondary">{{ contract.contract || 'Contract' }}</Text>
					<Flex align="center" gap="6">
						<Text size="11" color="tertiary" mono>{{ shortHex(contract.address) }}</Text>
						<CopyButton :text="contract.address" size="10" @click.stop />
					</Flex>
				</Flex>
			</NuxtLink>
		</Flex>
	</Flex>
</template>

<style module>
.card {
	background: var(--card-background);
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.card:hover {
	background: var(--op-5);
}

.header {
	padding: 16px;
}

.category_badge {
	padding: 4px 8px;
	border-radius: 4px;
	background: var(--op-8);
}

/* Category badge colors */
.category_defi {
	background: rgba(59, 130, 246, 0.15);
	& span { color: rgb(96, 165, 250); }
}

.category_ai {
	background: rgba(139, 92, 246, 0.15);
	& span { color: rgb(167, 139, 250); }
}

.category_consumer {
	background: rgba(16, 185, 129, 0.15);
	& span { color: rgb(52, 211, 153); }
}

.category_gaming {
	background: rgba(245, 158, 11, 0.15);
	& span { color: rgb(251, 191, 36); }
}

.category_depin {
	background: rgba(6, 182, 212, 0.15);
	& span { color: rgb(34, 211, 238); }
}

.category_infra {
	background: rgba(107, 114, 128, 0.15);
	& span { color: rgb(156, 163, 175); }
}

.category_nft {
	background: rgba(236, 72, 153, 0.15);
	& span { color: rgb(244, 114, 182); }
}

.category_cefi {
	background: rgba(234, 179, 8, 0.15);
	& span { color: rgb(250, 204, 21); }
}

.contracts {
	border-top: 1px solid var(--op-8);
	max-height: 300px;
	overflow-y: auto;
}

.contract_row {
	display: block;
	padding: 10px 16px;
	transition: background 0.1s ease;
}

.contract_row:hover {
	background: var(--op-5);
}

.rotated {
	transform: rotate(180deg);
}
</style>
