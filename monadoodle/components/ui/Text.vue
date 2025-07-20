<script setup>
defineProps({
	size: {
		type: [String, Number],
		default: "14"
	},
	weight: {
		type: [String, Number],
		default: "400",
		validator: (value) => ["400", "500", "600", "700", 400, 500, 600, 700].includes(value)
	},
	color: {
		type: String,
		default: "primary",
		validator: (value) => [
			"primary", "body", "secondary", "tertiary", "support",
			"brand", "blue", "red", "orange", "yellow", "green", "purple", "mint"
		].includes(value)
	},
	align: {
		type: String,
		default: "left",
		validator: (value) => ["left", "center", "right", "justify"].includes(value)
	},
	transform: {
		type: String,
		validator: (value) => ["uppercase", "lowercase", "capitalize"].includes(value)
	},
	lineHeight: {
		type: String,
		validator: (value) => ["1", "1_2", "1_4", "1_6"].includes(value)
	},
	letterSpacing: {
		type: String,
		validator: (value) => ["tight", "normal", "wide"].includes(value)
	},
	decoration: {
		type: String,
		validator: (value) => ["underline", "no-underline"].includes(value)
	},
	tabular: {
		type: Boolean,
		default: false
	},
	truncate: {
		type: Boolean,
		default: false
	},
	breakAll: {
		type: Boolean,
		default: false
	}
})
</script>

<template>
	<span 
		:class="[
			`fz--${size}`,
			`fw--${weight}`,
			`color--${color}`,
			`text--${align}`,
			transform && `text--${transform}`,
			lineHeight && `lh--${lineHeight}`,
			letterSpacing && `ls--${letterSpacing}`,
			decoration && `text--${decoration}`,
			tabular && 'tabular',
			truncate && 'truncate',
			breakAll && 'break-all'
		]"
	>
		<slot />
	</span>
</template> 