<template>
	<div :class="$style.wrapper">
		<div :class="$style.tags_container">
			<!-- Display tags -->
			<div v-for="(tag, index) in modelValue" :key="index" :class="$style.tag">
				<Text size="12" weight="600" color="primary">{{ formatTag(tag) }}</Text>
				<button :class="$style.remove_button" @click="removeTag(index)" type="button">
					<Icon name="close" size="10" color="secondary" />
				</button>
			</div>

			<!-- Input field -->
			<input
				ref="inputRef"
				v-model="inputValue"
				:placeholder="modelValue.length === 0 ? placeholder : ''"
				:class="$style.input"
				@keydown.enter.prevent="addTag"
				@keydown.comma.prevent="addTag"
				@paste="handlePaste"
				type="text"
			/>
		</div>

		<!-- Clear all button -->
		<button
			v-if="modelValue.length > 0"
			:class="$style.clear_button"
			@click="clearAll"
			type="button"
		>
			<Text size="11" weight="600" color="tertiary">Clear</Text>
		</button>

		<!-- Error message -->
		<Text v-if="error" size="11" weight="600" color="red" :class="$style.error">
			{{ error }}
		</Text>

		<!-- Helper text -->
		<Text v-if="helperText && !error" size="11" weight="500" color="tertiary" :class="$style.helper">
			{{ helperText }}
		</Text>
	</div>
</template>

<script setup>
const props = defineProps({
	modelValue: {
		type: Array,
		default: () => [],
	},
	placeholder: {
		type: String,
		default: 'Type and press Enter...',
	},
	validateAddress: {
		type: Boolean,
		default: false,
	},
	helperText: {
		type: String,
		default: '',
	},
})

const emit = defineEmits(['update:modelValue'])

const inputRef = ref(null)
const inputValue = ref('')
const error = ref('')

// Ethereum address regex
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/

const validateEthAddress = (address) => {
	return ETH_ADDRESS_REGEX.test(address.trim())
}

const formatTag = (tag) => {
	if (tag.length > 20) {
		return `${tag.substring(0, 10)}...${tag.substring(tag.length - 8)}`
	}
	return tag
}

const addTag = () => {
	const value = inputValue.value.trim()

	if (!value) {
		return
	}

	// Validate if needed
	if (props.validateAddress && !validateEthAddress(value)) {
		error.value = 'Invalid Ethereum address format'
		return
	}

	// Check for duplicates
	if (props.modelValue.includes(value.toLowerCase())) {
		error.value = 'This address is already added'
		return
	}

	// Add tag
	emit('update:modelValue', [...props.modelValue, value.toLowerCase()])
	inputValue.value = ''
	error.value = ''
}

const removeTag = (index) => {
	const newValue = [...props.modelValue]
	newValue.splice(index, 1)
	emit('update:modelValue', newValue)
	error.value = ''
}

const clearAll = () => {
	emit('update:modelValue', [])
	inputValue.value = ''
	error.value = ''
	inputRef.value?.focus()
}

const handlePaste = (event) => {
	event.preventDefault()
	const pastedText = event.clipboardData.getData('text')

	// Split by common delimiters (comma, semicolon, newline, space)
	const values = pastedText
		.split(/[,;\n\s]+/)
		.map(v => v.trim())
		.filter(v => v.length > 0)

	const validValues = []
	let hasErrors = false

	values.forEach(value => {
		// Validate if needed
		if (props.validateAddress && !validateEthAddress(value)) {
			hasErrors = true
			return
		}

		// Check for duplicates
		const lowercaseValue = value.toLowerCase()
		if (!props.modelValue.includes(lowercaseValue) && !validValues.includes(lowercaseValue)) {
			validValues.push(lowercaseValue)
		}
	})

	if (validValues.length > 0) {
		emit('update:modelValue', [...props.modelValue, ...validValues])
		error.value = ''
	}

	if (hasErrors) {
		error.value = 'Some addresses were invalid and skipped'
	}

	inputValue.value = ''
}
</script>

<style module>
.wrapper {
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;
}

.tags_container {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	padding: 8px 12px;
	min-height: 42px;
	border: 1px solid var(--op-10);
	border-radius: 8px;
	background: var(--card-background);
	transition: all 0.2s ease;
}

.tags_container:focus-within {
	border-color: var(--brand);
	background: var(--op-05);
}

.tag {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	border-radius: 4px;
	background: var(--op-10);
	border: 1px solid var(--op-15);
	transition: all 0.2s ease;
}

.tag:hover {
	background: var(--op-15);
	border-color: var(--op-20);
}

.remove_button {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2px;
	border-radius: 2px;
	background: transparent;
	border: none;
	cursor: pointer;
	transition: all 0.2s ease;
	opacity: 0.6;
}

.remove_button:hover {
	opacity: 1;
	background: var(--op-10);
}

.input {
	flex: 1;
	min-width: 120px;
	border: none;
	outline: none;
	background: transparent;
	color: var(--txt-primary);
	font-size: 13px;
	font-weight: 600;
	font-family: inherit;
}

.input::placeholder {
	color: var(--txt-tertiary);
	font-weight: 500;
}

.clear_button {
	align-self: flex-end;
	padding: 4px 8px;
	border-radius: 4px;
	background: var(--op-05);
	border: 1px solid var(--op-10);
	cursor: pointer;
	transition: all 0.2s ease;
}

.clear_button:hover {
	background: var(--op-10);
	border-color: var(--op-15);
}

.error {
	margin-top: -4px;
}

.helper {
	margin-top: -4px;
}
</style>
