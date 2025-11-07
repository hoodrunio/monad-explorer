<template>
	<div :class="$style.wrapper">
		<!-- Advanced Filters Button -->
		<button :class="$style.advanced_button" @click="$emit('openModal')">
			<Icon name="grid" size="12" :class="$style.icon" />
			<span :class="$style.label">Advanced Filters</span>
			<span v-if="activeFilterCount > 0" :class="$style.badge">
				{{ activeFilterCount }}
			</span>
		</button>

		<!-- Clear All Button -->
		<button v-if="hasActiveFilters" :class="$style.clear" @click="$emit('clearAll')">
			<Icon name="close" size="12" :class="$style.clearIcon" />
			<span>Clear All</span>
		</button>
	</div>
</template>

<script setup>
defineProps({
	activeFilterCount: {
		type: Number,
		default: 0,
	},
	hasActiveFilters: {
		type: Boolean,
		default: false,
	},
})

defineEmits(['openModal', 'clearAll'])
</script>

<style module>
.wrapper {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 0;
	overflow-x: auto;
	scrollbar-width: none;
}

.wrapper::-webkit-scrollbar {
	display: none;
}

.advanced_button {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 16px;
	border-radius: 8px;
	background: var(--brand);
	border: 1px solid var(--brand);
	color: var(--txt-white);
	font-size: 13px;
	font-weight: 600;
	transition: all 0.2s ease;
	cursor: pointer;
	white-space: nowrap;
	position: relative;
}

.advanced_button:hover {
	opacity: 0.9;
	transform: translateY(-1px);
}

.badge {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 20px;
	height: 20px;
	padding: 0 6px;
	border-radius: 50px;
	background: var(--txt-white);
	color: var(--brand);
	font-size: 11px;
	font-weight: 700;
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0.8;
}

.label {
	letter-spacing: 0.01em;
}

.clear {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 6px 12px;
	border-radius: 50px;
	background: var(--op-05);
	border: 1px solid var(--op-10);
	color: var(--txt-tertiary);
	font-size: 11px;
	font-weight: 600;
	transition: all 0.2s ease;
	cursor: pointer;
	white-space: nowrap;
	margin-left: auto;
}

.clear:hover {
	background: var(--op-08);
	border-color: var(--op-15);
	color: var(--txt-secondary);
}

.clearIcon {
	opacity: 0.5;
}
</style>
