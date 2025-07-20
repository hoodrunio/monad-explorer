<script setup>
import { useCssModule } from "vue"
import { NuxtLink } from "#components"

const emit = defineEmits(["click"])
const props = defineProps({
	size: {
		type: String,
		default: "medium",
		validator: (value) => ["large", "medium", "small", "mini", "dynamic"].includes(value)
	},
	type: {
		type: String,
		default: "primary",
		validator: (value) => ["primary", "secondary", "tertiary", "white", "red"].includes(value)
	},
	wide: {
		type: Boolean,
		default: false,
	},
	disabled: {
		type: Boolean,
		default: false
	},
	loading: {
		type: Boolean,
		default: false
	},
	link: {
		type: String,
		required: false,
	},
	target: {
		type: String,
		required: false,
	},
})

const style = useCssModule()

const getStyles = () => {
	const hasCorrectSize = ["large", "medium", "small", "mini", "dynamic"].includes(props.size)

	return [
		style.wrapper,
		style[props.type],
		props.wide && style.wide,
		hasCorrectSize && style[props.size],
		props.disabled && style.disabled,
	]
}

const handleClick = (event) => {
	if (!props.disabled && !props.loading) {
		emit("click", event)
	}
}
</script>

<template>
	<component
		:is="link ? NuxtLink : 'button'"
		v-bind="{ to: link ? link : null }"
		:target="target"
		:class="[...getStyles(), loading && $style.loading]"
		:disabled="disabled || loading"
		@click="handleClick"
	>
		<slot />
	</component>
</template>

<style module>
.wrapper {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	cursor: pointer;
	box-sizing: border-box;
	user-select: none;
	background-clip: padding-box !important;
	color: var(--txt-primary);
	font-weight: 600;
	white-space: nowrap;
	transition: all 0.2s ease;
	border: none;
	outline: none;
}

/* Sizes */
.large {
	height: 48px;
	padding: 0 24px;
	border-radius: 12px;
	font-size: 16px;
}

.medium {
	height: 40px;
	padding: 0 20px;
	border-radius: 10px;
	font-size: 14px;
}

.small {
	height: 32px;
	padding: 0 16px;
	border-radius: 8px;
	font-size: 13px;
}

.mini {
	height: 24px;
	padding: 0 12px;
	border-radius: 6px;
	font-size: 12px;
}

.dynamic {
	padding: 8px 16px;
	border-radius: 8px;
	font-size: 14px;
}

/* Types */
.primary {
	background: var(--brand);
	color: var(--txt-black);
}

.primary:hover:not(.disabled) {
	background: var(--neutral-mint);
}

.primary:active:not(.disabled) {
	background: var(--brand);
}

.secondary {
	background: var(--btn-secondary-bg);
	color: var(--txt-primary);
}

.secondary:hover:not(.disabled) {
	background: var(--btn-secondary-bg-hover);
}

.secondary:active:not(.disabled) {
	background: var(--btn-secondary-bg-active);
}

.tertiary {
	background: transparent;
	color: var(--txt-primary);
	border: 1px solid var(--op-10);
}

.tertiary:hover:not(.disabled) {
	border-color: var(--op-15);
	background: var(--op-5);
}

.tertiary:active:not(.disabled) {
	border-color: var(--op-10);
	background: transparent;
}

.white {
	background: var(--btn-white-bg);
	color: var(--txt-black);
}

.white:hover:not(.disabled) {
	background: var(--btn-white-bg-hover);
}

.white:active:not(.disabled) {
	background: var(--btn-white-bg-active);
}

.red {
	background: var(--btn-red-bg);
	color: var(--txt-white);
}

.red:hover:not(.disabled) {
	background: var(--btn-red-bg-hover);
}

.red:active:not(.disabled) {
	background: var(--btn-red-bg-active);
}

/* States */
.wide {
	width: 100%;
}

.disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.loading {
	pointer-events: none;
}

/* Focus */
.wrapper.primary:focus-visible {
	box-shadow: 0 0 0 3px rgba(24, 210, 165, 0.4);
}

.wrapper.secondary:focus-visible,
.wrapper.tertiary:focus-visible {
	box-shadow: 0 0 0 2px var(--op-10);
}

.wrapper.white:focus-visible {
	box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.4);
}

.wrapper.red:focus-visible {
	box-shadow: 0 0 0 3px rgba(235, 87, 87, 0.4);
}
</style> 