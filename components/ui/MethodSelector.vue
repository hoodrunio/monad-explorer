<template>
	<div :class="$style.wrapper">
		<!-- Search input -->
		<div :class="$style.search_wrapper">
			<Icon name="search" size="14" color="tertiary" :class="$style.search_icon" />
			<input
				v-model="searchQuery"
				:class="$style.search_input"
				placeholder="Search methods..."
				type="text"
			/>
			<button
				v-if="searchQuery"
				:class="$style.clear_search"
				@click="searchQuery = ''"
				type="button"
			>
				<Icon name="close" size="12" color="secondary" />
			</button>
		</div>

		<!-- Select all / None -->
		<Flex align="center" justify="between" :class="$style.actions">
			<Flex align="center" gap="8">
				<Text size="11" weight="600" color="tertiary">
					{{ selectedCount }} selected
				</Text>
			</Flex>
			<Flex align="center" gap="8">
				<button :class="$style.action_button" @click="selectAll" type="button">
					<Text size="11" weight="600" color="secondary">Select All</Text>
				</button>
				<button :class="$style.action_button" @click="selectNone" type="button">
					<Text size="11" weight="600" color="secondary">Clear</Text>
				</button>
			</Flex>
		</Flex>

		<!-- Methods list -->
		<div :class="$style.methods_list">
			<div v-if="isLoading" :class="$style.loading">
				<Text size="13" weight="600" color="tertiary">Loading methods...</Text>
			</div>

			<div v-else-if="filteredMethods.length === 0" :class="$style.empty">
				<Text size="13" weight="600" color="tertiary">
					{{ searchQuery ? 'No methods found' : 'No methods available' }}
				</Text>
			</div>

			<label
				v-else
				v-for="method in filteredMethods"
				:key="method.method_id"
				:class="$style.method_item"
			>
				<Flex align="center" gap="12" wide>
					<input
						:checked="isSelected(method.method_id)"
						@change="toggleMethod(method.method_id)"
						:class="$style.checkbox"
						type="checkbox"
					/>
					<Flex direction="column" gap="2" wide>
						<Text size="13" weight="600" color="primary">{{ method.name }}</Text>
						<Text size="11" weight="500" color="tertiary" mono>{{ method.method_id }}</Text>
					</Flex>
					<MethodChip :method="method.name" />
				</Flex>
			</label>
		</div>
	</div>
</template>

<script setup>
import { fetchFilterMethods } from "@/services/api/tx"
import MethodChip from "@/components/ui/MethodChip.vue"

const props = defineProps({
	modelValue: {
		type: Array,
		default: () => [],
	},
})

const emit = defineEmits(['update:modelValue'])

const searchQuery = ref('')
const methods = ref([])
const isLoading = ref(true)

// Load methods on mount
onMounted(async () => {
	try {
		const { data } = await fetchFilterMethods()
		methods.value = data.value || []
	} catch (error) {
		console.error('Failed to load methods:', error)
	} finally {
		isLoading.value = false
	}
})

// Filtered methods based on search
const filteredMethods = computed(() => {
	if (!searchQuery.value) {
		return methods.value
	}

	const query = searchQuery.value.toLowerCase()
	return methods.value.filter(method =>
		method.name.toLowerCase().includes(query) ||
		method.method_id.toLowerCase().includes(query)
	)
})

// Selected count
const selectedCount = computed(() => props.modelValue.length)

// Check if method is selected
const isSelected = (methodId) => {
	return props.modelValue.includes(methodId)
}

// Toggle method selection
const toggleMethod = (methodId) => {
	const newValue = [...props.modelValue]
	const index = newValue.indexOf(methodId)

	if (index > -1) {
		newValue.splice(index, 1)
	} else {
		newValue.push(methodId)
	}

	emit('update:modelValue', newValue)
}

// Select all (filtered)
const selectAll = () => {
	const allMethodIds = filteredMethods.value.map(m => m.method_id)
	const newValue = [...new Set([...props.modelValue, ...allMethodIds])]
	emit('update:modelValue', newValue)
}

// Clear selection
const selectNone = () => {
	emit('update:modelValue', [])
}
</script>

<style module>
.wrapper {
	display: flex;
	flex-direction: column;
	gap: 12px;
	width: 100%;
}

.search_wrapper {
	position: relative;
	display: flex;
	align-items: center;
}

.search_icon {
	position: absolute;
	left: 12px;
	pointer-events: none;
}

.search_input {
	width: 100%;
	padding: 10px 12px 10px 36px;
	border: 1px solid var(--op-10);
	border-radius: 8px;
	background: var(--card-background);
	color: var(--txt-primary);
	font-size: 13px;
	font-weight: 600;
	font-family: inherit;
	transition: all 0.2s ease;
}

.search_input::placeholder {
	color: var(--txt-tertiary);
	font-weight: 500;
}

.search_input:focus {
	outline: none;
	border-color: var(--brand);
	background: var(--op-05);
}

.clear_search {
	position: absolute;
	right: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 4px;
	border-radius: 4px;
	background: transparent;
	border: none;
	cursor: pointer;
	transition: all 0.2s ease;
	opacity: 0.6;
}

.clear_search:hover {
	opacity: 1;
	background: var(--op-10);
}

.actions {
	padding: 0 4px;
}

.action_button {
	padding: 4px 8px;
	border-radius: 4px;
	background: transparent;
	border: 1px solid var(--op-10);
	cursor: pointer;
	transition: all 0.2s ease;
}

.action_button:hover {
	background: var(--op-05);
	border-color: var(--op-15);
}

.methods_list {
	max-height: 300px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.loading,
.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
}

.method_item {
	padding: 12px;
	border-radius: 8px;
	background: transparent;
	border: 1px solid var(--op-10);
	cursor: pointer;
	transition: all 0.2s ease;
}

.method_item:hover {
	background: var(--op-05);
	border-color: var(--op-15);
	transform: translateY(-1px);
}

.method_item:has(input:checked) {
	background: var(--filter-chip-bg-active);
	border-color: var(--filter-chip-border-active);
}

.checkbox {
	/* Hide default checkbox */
	appearance: none;
	-webkit-appearance: none;
	width: 18px;
	height: 18px;
	border: 2px solid var(--op-20);
	border-radius: 4px;
	cursor: pointer;
	transition: all 0.2s ease;
	position: relative;
	flex-shrink: 0;
	background: var(--card-background);
}

.checkbox:hover {
	border-color: var(--brand);
}

.checkbox:checked {
	background: var(--brand);
	border-color: var(--brand);
}

.checkbox:checked::after {
	content: '';
	position: absolute;
	left: 5px;
	top: 2px;
	width: 4px;
	height: 8px;
	border: solid white;
	border-width: 0 2px 2px 0;
	transform: rotate(45deg);
}
</style>
