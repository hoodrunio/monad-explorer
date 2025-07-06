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
})

// Function to get color for message type
const getMessageColor = (type) => {
	const cleanType = type.replace("Msg", "").toLowerCase()
	return MessageColorMap[cleanType] || MessageColorMap.default
}
</script>

<template>
	<Badge :class="$style.wrapper" :style="{ '--tx-type-color': getMessageColor(types[0]) }">
		<Icon
			:name="
				MessageIconMap[types[0].replace('Msg', '').toLowerCase()]
					? MessageIconMap[types[0].replace('Msg', '').toLowerCase()]
					: 'zap'
			"
			size="14"
			:class="$style.icon"
		/>

		<Text size="13" height="160" weight="600" :class="[$style.text, $style.colored_text]">
			{{ types[0].replace("Msg", "") }}
		</Text>

		<Text v-if="types.length > 1" size="12" weight="600" :class="[$style.badge, $style.colored_text]"> +{{ types.length - 1 }} </Text>
	</Badge>
</template>

<style module>
.wrapper {
	width: fit-content;
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
