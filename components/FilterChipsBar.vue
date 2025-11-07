<template>
	<div :class="$style.wrapper">
		<div :class="$style.chips">
			<button
				v-for="filter in filters"
				:key="filter.id"
				:class="[$style.chip, { [$style.active]: isActive(filter.id) }]"
				@click="toggleFilter(filter.id)"
			>
				<Icon :name="filter.icon" size="10" :class="$style.icon" />
				<span :class="$style.label">{{ filter.label }}</span>
			</button>
		</div>

		<button v-if="activeFilters.length > 0" :class="$style.clear" @click="clearFilters">
			<Icon name="close" size="12" :class="$style.clearIcon" />
			<span>Clear</span>
		</button>
	</div>
</template>

<script setup>
const emit = defineEmits(["update:filters"])

const filters = [
	{ id: "transfers", label: "Transfers", icon: "coins" },
	{ id: "contract-calls", label: "Contract Calls", icon: "zap" },
	{ id: "high-value", label: ">1 MON", icon: "coin" },
	{ id: "failed", label: "Failed", icon: "danger" },
]

const activeFilters = ref([])

const isActive = (filterId) => {
	return activeFilters.value.includes(filterId)
}

const toggleFilter = (filterId) => {
	const index = activeFilters.value.indexOf(filterId)

	if (index > -1) {
		// Remove filter
		activeFilters.value.splice(index, 1)
	} else {
		// Add filter
		activeFilters.value.push(filterId)
	}

	emit("update:filters", activeFilters.value)
}

const clearFilters = () => {
	activeFilters.value = []
	emit("update:filters", [])
}
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

.chips {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.chip {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 14px;
	border-radius: 50px;
	background: var(--filter-chip-bg);
	border: 1px solid var(--filter-chip-border);
	color: var(--txt-secondary);
	font-size: 12px;
	font-weight: 600;
	transition: all 0.2s ease;
	cursor: pointer;
	white-space: nowrap;
}

.chip:hover {
	background: var(--op-08);
	border-color: var(--op-15);
	color: var(--txt-primary);
}

.chip.active {
	background: var(--filter-chip-bg-active);
	border-color: var(--filter-chip-border-active);
	color: var(--txt-primary);
}

.chip.active:hover {
	background: var(--filter-chip-bg-active);
	border-color: var(--brand);
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
