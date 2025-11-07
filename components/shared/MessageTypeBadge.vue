<script setup>
/** UI */
import Badge from "@/components/ui/Badge.vue"

/** Services */
import { MessageIconMap, MessageColorMap } from "@/services/constants/mapping"

defineProps({
	types: {
		type: Array,
		required: true,
	},
	compact: {
		type: Boolean,
		default: false,
	},
})

// Function to get color for transaction type
const getMessageColor = (type) => {
	// Support both underscore and space separated formats
	const cleanType = type.toLowerCase()
	return MessageColorMap[cleanType] || MessageColorMap.default
}

// Function to format transaction type for display
const formatType = (type) => {
	return type.replace(/_/g, " ")
}
</script>

<template>
	<Badge :class="[$style.wrapper, { [$style.compact]: compact }]" :style="{ '--tx-type-color': getMessageColor(types[0]) }">
		<Icon
			:name="MessageIconMap[types[0]] || 'zap'"
			:size="compact ? '10' : '14'"
			:class="$style.icon"
		/>

		<Text :size="compact ? '10' : '13'" height="160" weight="600" :class="[$style.text, $style.colored_text]">
			{{ formatType(types[0]) }}
		</Text>

		<Text v-if="types.length > 1" :size="compact ? '9' : '12'" weight="600" :class="[$style.badge, $style.colored_text]"> +{{ types.length - 1 }} </Text>
	</Badge>
</template>

<style module>
.wrapper {
	width: fit-content;
}

.compact {
	padding: 2px 6px !important;
	gap: 3px !important;
}

.text {
	text-overflow: ellipsis;
	overflow: hidden;
}

.colored_text {
	color: var(--tx-type-color) !important;
}

.icon {
	color: var(--tx-type-color) !important;
}
</style>
