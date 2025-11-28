<script setup>
/**
 * Protocol Badge Component
 * Displays protocol name and category for a given contract address
 */
import { computed, onMounted } from 'vue'
import { getProtocolInfoSync, preloadProtocolList } from '@/services/api/protocolList'

const props = defineProps({
	address: {
		type: String,
		required: true
	},
	showCategory: {
		type: Boolean,
		default: false
	},
	showSubcategory: {
		type: Boolean,
		default: false
	},
	size: {
		type: String,
		default: 'small', // small, medium
		validator: (v) => ['small', 'medium'].includes(v)
	},
	linkable: {
		type: Boolean,
		default: false
	}
})

// Preload protocol registry on mount
onMounted(() => {
	preloadProtocolList()
})

const protocol = computed(() => getProtocolInfoSync(props.address))

const categoryClass = computed(() => {
	const ctype = protocol.value?.ctype?.toLowerCase()
	if (!ctype) return ''
	return `category_${ctype.replace(/\s+/g, '_')}`
})
</script>

<template>
	<component
		:is="linkable ? 'NuxtLink' : 'div'"
		v-if="protocol"
		:to="linkable ? `/protocols?search=${encodeURIComponent(protocol.name)}` : undefined"
		:class="[$style.badge, $style[size], linkable && $style.linkable]"
	>
		<div :class="[$style.category_dot, $style[categoryClass]]" />
		<Text :size="size === 'small' ? 11 : 12" weight="600" color="secondary">
			{{ protocol.name }}
		</Text>
		<Text v-if="showCategory && protocol.ctype" :size="size === 'small' ? 10 : 11" color="tertiary">
			{{ protocol.ctype }}
		</Text>
		<Text v-if="showSubcategory && protocol.csubtype" :size="size === 'small' ? 10 : 11" color="support">
			{{ protocol.csubtype }}
		</Text>
	</component>
</template>

<style module>
.badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 2px 8px;
	background: var(--op-5);
	border-radius: 4px;
	white-space: nowrap;
}

.small {
	height: 20px;
}

.medium {
	height: 24px;
	padding: 3px 10px;
}

.linkable {
	cursor: pointer;
	transition: background 0.15s ease;
}

.linkable:hover {
	background: var(--op-8);
}

.category_dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	flex-shrink: 0;
}

/* Category colors */
.category_defi {
	background: #3b82f6;
}

.category_ai {
	background: #8b5cf6;
}

.category_consumer {
	background: #10b981;
}

.category_gaming {
	background: #f59e0b;
}

.category_depin {
	background: #06b6d4;
}

.category_infra {
	background: #6b7280;
}

.category_nft {
	background: #ec4899;
}

.category_cefi {
	background: #eab308;
}

.category_other {
	background: #9ca3af;
}
</style>
