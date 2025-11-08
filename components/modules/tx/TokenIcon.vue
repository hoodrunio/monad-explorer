<script setup>
/** Vue */
import { ref, computed } from "vue"

/** Services */
import { getTokenIcon } from "@/services/utils/tokenFlow"

const props = defineProps({
	token: {
		type: Object,
		default: null,
	},
	size: {
		type: Number,
		default: 24,
	},
})

const imageLoaded = ref(false)
const imageError = ref(false)

const iconUrl = computed(() => getTokenIcon(props.token))

const handleImageLoad = () => {
	imageLoaded.value = true
	imageError.value = false
}

const handleImageError = () => {
	imageError.value = true
	imageLoaded.value = false
}

// Fallback icon based on token type
const fallbackIcon = computed(() => {
	if (!props.token) return 'coins'

	const tokenType = props.token.type || 'ERC-20'

	switch (tokenType) {
		case 'ERC-721':
			return 'box'
		case 'ERC-1155':
			return 'stack'
		case 'ERC-20':
		default:
			return 'coins'
	}
})

// Fallback color based on token type
const fallbackColor = computed(() => {
	if (!props.token) return 'brand'

	const tokenType = props.token.type || 'ERC-20'

	switch (tokenType) {
		case 'ERC-721':
			return 'purple'
		case 'ERC-1155':
			return 'orange'
		case 'ERC-20':
		default:
			return 'brand'
	}
})

const showFallback = computed(() => !iconUrl.value || imageError.value)
</script>

<template>
	<div
		:class="$style.icon_wrapper"
		:style="{ width: `${size}px`, height: `${size}px` }"
	>
		<!-- Token image if available -->
		<img
			v-if="iconUrl && !imageError"
			:src="iconUrl"
			:alt="token?.symbol || 'Token'"
			:class="[$style.token_image, imageLoaded && $style.loaded]"
			@load="handleImageLoad"
			@error="handleImageError"
		/>

		<!-- Fallback icon -->
		<div v-if="showFallback" :class="$style.fallback_icon">
			<Icon
				:name="fallbackIcon"
				:size="size * 0.6"
				:color="fallbackColor"
			/>
		</div>
	</div>
</template>

<style module>
.icon_wrapper {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: var(--op-5);
	border: 1px solid var(--op-10);
	overflow: hidden;
	flex-shrink: 0;
}

.token_image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	opacity: 0;
	transition: opacity 0.3s ease;
}

.token_image.loaded {
	opacity: 1;
}

.fallback_icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}
</style>
