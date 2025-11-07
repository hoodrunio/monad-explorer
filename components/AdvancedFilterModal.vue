<template>
	<Teleport to="#modal">
		<transition name="fade">
			<div v-if="show" :class="$style.overlay" @click="handleCancel">
				<div :class="$style.modal" @click.stop>
					<!-- Header -->
					<Flex align="center" justify="between" :class="$style.header">
						<Flex align="center" gap="12">
							<Icon name="grid" size="20" color="primary" />
							<Text size="18" weight="600" color="primary">Advanced Filters</Text>
						</Flex>
						<button :class="$style.close_button" @click="handleCancel">
							<Icon name="close" size="16" color="secondary" />
						</button>
					</Flex>

					<!-- Content -->
					<div :class="$style.content">
						<!-- Transaction Types -->
						<div :class="$style.section">
							<Text size="14" weight="600" color="primary" :class="$style.section_title">
								Transaction Types
							</Text>
							<div :class="$style.checkbox_group">
								<label
									v-for="type in transactionTypes"
									:key="type.id"
									:class="$style.checkbox_label"
								>
									<input
										v-model="localFilters.transaction_types"
										:value="type.id"
										type="checkbox"
										:class="$style.checkbox"
									/>
									<Text size="13" weight="600" color="primary">{{ type.label }}</Text>
								</label>
							</div>
						</div>

						<!-- Methods -->
						<div :class="$style.section">
							<Text size="14" weight="600" color="primary" :class="$style.section_title">
								Methods
							</Text>
							<MethodSelector v-model="localFilters.methods" />
						</div>

						<!-- Date Range -->
						<div :class="$style.section">
							<Text size="14" weight="600" color="primary" :class="$style.section_title">
								Date Range
							</Text>
							<Flex direction="column" gap="12">
								<div>
									<Text size="12" weight="600" color="secondary" :class="$style.label">From</Text>
									<input
										v-model="dateFrom"
										type="datetime-local"
										:class="$style.datetime_input"
									/>
								</div>
								<div>
									<Text size="12" weight="600" color="secondary" :class="$style.label">To</Text>
									<input
										v-model="dateTo"
										type="datetime-local"
										:class="$style.datetime_input"
									/>
								</div>
							</Flex>
						</div>

						<!-- Amount Range -->
						<div :class="$style.section">
							<Text size="14" weight="600" color="primary" :class="$style.section_title">
								Amount Range (MON)
							</Text>
							<Flex gap="12">
								<div style="flex: 1">
									<Text size="12" weight="600" color="secondary" :class="$style.label">Min</Text>
									<input
										v-model.number="localFilters.amount_from"
										type="number"
										step="0.000001"
										placeholder="0.0"
										:class="$style.number_input"
									/>
								</div>
								<div style="flex: 1">
									<Text size="12" weight="600" color="secondary" :class="$style.label">Max</Text>
									<input
										v-model.number="localFilters.amount_to"
										type="number"
										step="0.000001"
										placeholder="0.0"
										:class="$style.number_input"
									/>
								</div>
							</Flex>
						</div>

						<!-- From Addresses -->
						<div :class="$style.section">
							<Flex align="center" justify="between" :class="$style.section_title">
								<Text size="14" weight="600" color="primary">From Addresses</Text>
								<Flex align="center" gap="8">
									<button
										:class="[$style.toggle_button, fromAddressMode === 'include' && $style.active]"
										@click="fromAddressMode = 'include'"
										type="button"
									>
										<Text size="11" weight="600">Include</Text>
									</button>
									<button
										:class="[$style.toggle_button, fromAddressMode === 'exclude' && $style.active]"
										@click="fromAddressMode = 'exclude'"
										type="button"
									>
										<Text size="11" weight="600">Exclude</Text>
									</button>
								</Flex>
							</Flex>
							<TagInput
								v-if="fromAddressMode === 'include'"
								v-model="localFilters.from_addresses_include"
								:validate-address="true"
								placeholder="0x... (press Enter or comma to add)"
								helper-text="Paste comma-separated addresses or add one by one"
							/>
							<TagInput
								v-else
								v-model="localFilters.from_addresses_exclude"
								:validate-address="true"
								placeholder="0x... (press Enter or comma to add)"
								helper-text="Paste comma-separated addresses or add one by one"
							/>
						</div>

						<!-- To Addresses -->
						<div :class="$style.section">
							<Flex align="center" justify="between" :class="$style.section_title">
								<Text size="14" weight="600" color="primary">To Addresses</Text>
								<Flex align="center" gap="8">
									<button
										:class="[$style.toggle_button, toAddressMode === 'include' && $style.active]"
										@click="toAddressMode = 'include'"
										type="button"
									>
										<Text size="11" weight="600">Include</Text>
									</button>
									<button
										:class="[$style.toggle_button, toAddressMode === 'exclude' && $style.active]"
										@click="toAddressMode = 'exclude'"
										type="button"
									>
										<Text size="11" weight="600">Exclude</Text>
									</button>
								</Flex>
							</Flex>
							<TagInput
								v-if="toAddressMode === 'include'"
								v-model="localFilters.to_addresses_include"
								:validate-address="true"
								placeholder="0x... (press Enter or comma to add)"
								helper-text="Paste comma-separated addresses or add one by one"
							/>
							<TagInput
								v-else
								v-model="localFilters.to_addresses_exclude"
								:validate-address="true"
								placeholder="0x... (press Enter or comma to add)"
								helper-text="Paste comma-separated addresses or add one by one"
							/>
						</div>

						<!-- Address Relation -->
						<div v-if="hasMultipleAddressFilters" :class="$style.section">
							<Text size="14" weight="600" color="primary" :class="$style.section_title">
								Address Relation
							</Text>
							<Flex gap="12">
								<label :class="$style.radio_label">
									<input
										v-model="localFilters.address_relation"
										value="or"
										type="radio"
										:class="$style.radio"
									/>
									<Text size="13" weight="600" color="primary">OR (match any)</Text>
								</label>
								<label :class="$style.radio_label">
									<input
										v-model="localFilters.address_relation"
										value="and"
										type="radio"
										:class="$style.radio"
									/>
									<Text size="13" weight="600" color="primary">AND (match all)</Text>
								</label>
							</Flex>
						</div>

						<!-- Token Contracts -->
						<div :class="$style.section">
							<Flex align="center" justify="between" :class="$style.section_title">
								<Text size="14" weight="600" color="primary">Token Contract Addresses</Text>
								<Flex align="center" gap="8">
									<button
										:class="[$style.toggle_button, tokenContractMode === 'include' && $style.active]"
										@click="tokenContractMode = 'include'"
										type="button"
									>
										<Text size="11" weight="600">Include</Text>
									</button>
									<button
										:class="[$style.toggle_button, tokenContractMode === 'exclude' && $style.active]"
										@click="tokenContractMode = 'exclude'"
										type="button"
									>
										<Text size="11" weight="600">Exclude</Text>
									</button>
								</Flex>
							</Flex>
							<TagInput
								v-if="tokenContractMode === 'include'"
								v-model="localFilters.token_contracts_include"
								:validate-address="true"
								placeholder="0x... (press Enter or comma to add)"
								helper-text="Paste comma-separated token addresses or add one by one"
							/>
							<TagInput
								v-else
								v-model="localFilters.token_contracts_exclude"
								:validate-address="true"
								placeholder="0x... (press Enter or comma to add)"
								helper-text="Paste comma-separated token addresses or add one by one"
							/>
						</div>
					</div>

					<!-- Footer -->
					<Flex align="center" justify="between" :class="$style.footer">
						<button :class="$style.reset_button" @click="handleReset">
							<Text size="13" weight="600" color="secondary">Reset All</Text>
						</button>
						<Flex align="center" gap="12">
							<button :class="$style.cancel_button" @click="handleCancel">
								<Text size="13" weight="600" color="primary">Cancel</Text>
							</button>
							<button :class="$style.apply_button" @click="handleApply">
								<Text size="13" weight="600" color="white">Apply Filters</Text>
							</button>
						</Flex>
					</Flex>
				</div>
			</div>
		</transition>
	</Teleport>
</template>

<script setup>
import { DateTime } from "luxon"
import MethodSelector from "@/components/ui/MethodSelector.vue"
import TagInput from "@/components/ui/TagInput.vue"

const props = defineProps({
	show: {
		type: Boolean,
		default: false,
	},
	filters: {
		type: Object,
		required: true,
	},
	transactionTypes: {
		type: Array,
		required: true,
	},
})

const emit = defineEmits(['close', 'apply'])

// Local filter state (deep copy)
const localFilters = ref({})
const fromAddressMode = ref('include')
const toAddressMode = ref('include')
const tokenContractMode = ref('include')

// Date inputs (for datetime-local input)
const dateFrom = ref('')
const dateTo = ref('')

// Initialize local state from props
watch(() => props.show, (isShowing) => {
	if (isShowing) {
		localFilters.value = JSON.parse(JSON.stringify(props.filters))

		// Convert dates to datetime-local format
		if (localFilters.value.age_from) {
			dateFrom.value = DateTime.fromJSDate(localFilters.value.age_from).toFormat("yyyy-MM-dd'T'HH:mm")
		}
		if (localFilters.value.age_to) {
			dateTo.value = DateTime.fromJSDate(localFilters.value.age_to).toFormat("yyyy-MM-dd'T'HH:mm")
		}

		// Set address modes based on which arrays have values
		if (localFilters.value.from_addresses_exclude.length > 0) {
			fromAddressMode.value = 'exclude'
		}
		if (localFilters.value.to_addresses_exclude.length > 0) {
			toAddressMode.value = 'exclude'
		}
		if (localFilters.value.token_contracts_exclude.length > 0) {
			tokenContractMode.value = 'exclude'
		}
	}
}, { immediate: true })

// Watch date inputs and update filter state
watch(dateFrom, (val) => {
	if (val) {
		localFilters.value.age_from = DateTime.fromISO(val).toJSDate()
	} else {
		localFilters.value.age_from = null
	}
})

watch(dateTo, (val) => {
	if (val) {
		localFilters.value.age_to = DateTime.fromISO(val).toJSDate()
	} else {
		localFilters.value.age_to = null
	}
})

// Check if multiple address filters are active
const hasMultipleAddressFilters = computed(() => {
	const fromCount = localFilters.value.from_addresses_include.length + localFilters.value.from_addresses_exclude.length
	const toCount = localFilters.value.to_addresses_include.length + localFilters.value.to_addresses_exclude.length
	return (fromCount > 0 && toCount > 0)
})

const handleApply = () => {
	emit('apply', localFilters.value)
	emit('close')
}

const handleCancel = () => {
	emit('close')
}

const handleReset = () => {
	// Reset all filters
	localFilters.value = {
		transaction_types: [],
		status: [],
		methods: [],
		age_from: null,
		age_to: null,
		from_addresses_include: [],
		from_addresses_exclude: [],
		to_addresses_include: [],
		to_addresses_exclude: [],
		address_relation: 'or',
		amount_from: null,
		amount_to: null,
		token_contracts_include: [],
		token_contracts_exclude: [],
	}
	dateFrom.value = ''
	dateTo.value = ''
	fromAddressMode.value = 'include'
	toAddressMode.value = 'include'
	tokenContractMode.value = 'include'
}

// Close on ESC key
onMounted(() => {
	const handleEsc = (e) => {
		if (e.key === 'Escape' && props.show) {
			handleCancel()
		}
	}
	window.addEventListener('keydown', handleEsc)
	onUnmounted(() => {
		window.removeEventListener('keydown', handleEsc)
	})
})
</script>

<style module>
.overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.7);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	padding: 20px;
}

.modal {
	width: 100%;
	max-width: 700px;
	max-height: 90vh;
	background: var(--card-background);
	border-radius: var(--card-border-radius);
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	display: flex;
	flex-direction: column;
}

.header {
	padding: 20px 24px;
	border-bottom: 1px solid var(--op-10);
	flex-shrink: 0;
}

.close_button {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 8px;
	border-radius: 6px;
	background: transparent;
	border: none;
	cursor: pointer;
	transition: all 0.2s ease;
}

.close_button:hover {
	background: var(--op-10);
}

.content {
	flex: 1;
	overflow-y: auto;
	padding: 24px;
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.section {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.section_title {
	margin-bottom: 4px;
}

.checkbox_group {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.checkbox_label {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	border-radius: 8px;
	background: transparent;
	border: 1px solid var(--op-10);
	cursor: pointer;
	transition: all 0.2s ease;
	position: relative;
}

.checkbox_label:hover {
	background: var(--op-05);
	border-color: var(--op-15);
	transform: translateY(-1px);
}

.checkbox_label:has(input:checked) {
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

.radio_label {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	border-radius: 8px;
	background: transparent;
	border: 1px solid var(--op-10);
	cursor: pointer;
	transition: all 0.2s ease;
	position: relative;
}

.radio_label:hover {
	background: var(--op-05);
	border-color: var(--op-15);
	transform: translateY(-1px);
}

.radio_label:has(input:checked) {
	background: var(--filter-chip-bg-active);
	border-color: var(--filter-chip-border-active);
}

.radio {
	/* Hide default radio */
	appearance: none;
	-webkit-appearance: none;
	width: 18px;
	height: 18px;
	border: 2px solid var(--op-20);
	border-radius: 50%;
	cursor: pointer;
	transition: all 0.2s ease;
	position: relative;
	flex-shrink: 0;
	background: var(--card-background);
}

.radio:hover {
	border-color: var(--brand);
}

.radio:checked {
	border-color: var(--brand);
}

.radio:checked::after {
	content: '';
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: var(--brand);
}

.label {
	display: block;
	margin-bottom: 6px;
}

.datetime_input,
.number_input {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid var(--op-10);
	border-radius: 8px;
	background: var(--card-background);
	color: var(--txt-primary);
	font-size: 13px;
	font-weight: 600;
	font-family: inherit;
	transition: all 0.2s ease;
}

.datetime_input:focus,
.number_input:focus {
	outline: none;
	border-color: var(--brand);
	background: var(--op-05);
}

.toggle_button {
	padding: 4px 12px;
	border-radius: 6px;
	background: var(--op-05);
	border: 1px solid var(--op-10);
	cursor: pointer;
	transition: all 0.2s ease;
}

.toggle_button:hover {
	background: var(--op-08);
	border-color: var(--op-15);
}

.toggle_button.active {
	background: var(--filter-chip-bg-active);
	border-color: var(--filter-chip-border-active);
}

.footer {
	padding: 16px 24px;
	border-top: 1px solid var(--op-10);
	flex-shrink: 0;
}

.reset_button {
	padding: 10px 16px;
	border-radius: 8px;
	background: transparent;
	border: 1px solid var(--op-10);
	cursor: pointer;
	transition: all 0.2s ease;
}

.reset_button:hover {
	background: var(--op-05);
	border-color: var(--op-15);
}

.cancel_button {
	padding: 10px 20px;
	border-radius: 8px;
	background: transparent;
	border: 1px solid var(--op-15);
	cursor: pointer;
	transition: all 0.2s ease;
}

.cancel_button:hover {
	background: var(--op-05);
	border-color: var(--op-20);
}

.apply_button {
	padding: 10px 24px;
	border-radius: 8px;
	background: var(--brand);
	border: 1px solid var(--brand);
	cursor: pointer;
	transition: all 0.2s ease;
}

.apply_button:hover {
	opacity: 0.9;
	transform: translateY(-1px);
}

@media (max-width: 768px) {
	.modal {
		max-width: 100%;
		max-height: 100vh;
		border-radius: 0;
	}

	.content {
		padding: 16px;
	}

	.checkbox_group {
		flex-direction: column;
	}
}
</style>
