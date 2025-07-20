<script setup>
defineProps({
	direction: {
		type: String,
		default: "row",
		validator: (value) => ["row", "col", "rowReverse", "colReverse"].includes(value)
	},
	align: {
		type: String,
		default: "start",
		validator: (value) => ["start", "center", "end", "between", "around", "evenly"].includes(value)
	},
	justify: {
		type: String,
		default: "start",
		validator: (value) => ["start", "center", "end", "between", "around", "evenly"].includes(value)
	},
	gap: {
		type: [String, Number],
		default: "0"
	},
	wrap: {
		type: String,
		default: "nowrap",
		validator: (value) => ["nowrap", "wrap", "wrapReverse"].includes(value)
	},
	wide: {
		type: Boolean,
		default: false
	}
})
</script>

<template>
	<div 
		:class="[
			'flex',
			`flex-${direction}`,
			`items-${align}`,
			`justify-${justify}`,
			`flex-${wrap}`,
			`gap--${gap}`,
			wide && 'flex-wide'
		]"
	>
		<slot />
	</div>
</template> 