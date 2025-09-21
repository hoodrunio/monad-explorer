<script setup>
/** UI */
import Modal from "@/components/ui/Modal.vue"
import Button from "@/components/ui/Button.vue"

/** Services */
import { shortHex } from "@/services/utils"

/** Store */
import { useCacheStore } from "@/store/cache.store"
const cacheStore = useCacheStore()

const emit = defineEmits(["onClose"])
const props = defineProps({
	show: Boolean,
})

// Get transaction data from cache
const transaction = computed(() => cacheStore.current.transaction)
const methodSignature = computed(() => cacheStore.current.methodSignature)

// Parse input data for display
const parsedInput = computed(() => {
	if (!transaction.value?.input || transaction.value.input === '0x') {
		return null
	}

	const input = transaction.value.input
	const methodId = input.slice(0, 10) // First 4 bytes (0x + 8 hex chars)
	const parameters = input.slice(10) // Remaining data

	return {
		methodId,
		parameters,
		fullInput: input
	}
})

// Format parameters for display (basic hex formatting)
const formatParameters = (params) => {
	if (!params || params.length === 0) return []
	
	// Split into 64-character chunks (32 bytes each)
	const chunks = []
	for (let i = 0; i < params.length; i += 64) {
		chunks.push(params.slice(i, i + 64))
	}
	
	return chunks.map((chunk, index) => ({
		index,
		hex: `0x${chunk}`,
		// Try to interpret as different types
		decimal: chunk ? parseInt(chunk, 16).toString() : '0',
		ascii: tryHexToAscii(chunk)
	}))
}

// Try to convert hex to ASCII (for string parameters)
const tryHexToAscii = (hex) => {
	if (!hex) return ''
	
	try {
		let ascii = ''
		for (let i = 0; i < hex.length; i += 2) {
			const byte = parseInt(hex.substr(i, 2), 16)
			if (byte >= 32 && byte <= 126) { // Printable ASCII range
				ascii += String.fromCharCode(byte)
			} else if (byte === 0) {
				break // Null terminator
			} else {
				return '' // Non-printable character, not likely a string
			}
		}
		return ascii.length > 0 ? ascii : ''
	} catch {
		return ''
	}
}

const formattedParameters = computed(() => {
	if (!parsedInput.value?.parameters) return []
	return formatParameters(parsedInput.value.parameters)
})

const handleClose = () => {
	emit("onClose")
}

const copyToClipboard = (text) => {
	navigator.clipboard.writeText(text)
}
</script>

<template>
	<Modal :show="show" width="700" @onClose="handleClose">
		<Flex direction="column" gap="20">
			<!-- Header -->
			<Flex direction="column" gap="8">
				<Flex align="center" gap="8">
					<Icon name="code" size="16" color="primary" />
					<Text size="14" weight="600" color="primary">Input Data Decoder</Text>
				</Flex>
				<Text size="12" weight="500" color="tertiary">
					Transaction: {{ transaction?.hash ? shortHex(transaction.hash) : 'Unknown' }}
				</Text>
			</Flex>

			<!-- Method Information -->
			<Flex v-if="transaction?.methodID || methodSignature" direction="column" gap="12" :class="$style.section">
				<Text size="13" weight="600" color="secondary">Method Information</Text>
				
				<Flex v-if="transaction?.methodID" direction="column" gap="4">
					<Text size="12" weight="500" color="tertiary">Method ID</Text>
					<Flex align="center" gap="8" :class="$style.code_block">
						<Text size="12" weight="500" color="primary" mono>{{ transaction.methodID }}</Text>
						<CopyButton :text="transaction.methodID" size="12" />
					</Flex>
				</Flex>

				<Flex v-if="methodSignature" direction="column" gap="4">
					<Text size="12" weight="500" color="tertiary">Function Signature</Text>
					<Flex align="center" gap="8" :class="$style.code_block">
						<Text size="12" weight="500" color="primary" mono>{{ methodSignature }}</Text>
						<CopyButton :text="methodSignature" size="12" />
					</Flex>
				</Flex>
			</Flex>

			<!-- Raw Input Data -->
			<Flex v-if="parsedInput" direction="column" gap="12" :class="$style.section">
				<Text size="13" weight="600" color="secondary">Raw Input Data</Text>
				
				<Flex direction="column" gap="4">
					<Flex align="center" justify="between">
						<Text size="12" weight="500" color="tertiary">Full Input ({{ parsedInput.fullInput.length - 2 }} hex characters)</Text>
						<CopyButton :text="parsedInput.fullInput" size="12" />
					</Flex>
					<div :class="$style.raw_input">
						<Text size="11" weight="400" color="primary" mono>
							{{ parsedInput.fullInput }}
						</Text>
					</div>
				</Flex>
			</Flex>

			<!-- Parameter Breakdown -->
			<Flex v-if="formattedParameters.length" direction="column" gap="12" :class="$style.section">
				<Text size="13" weight="600" color="secondary">Parameter Breakdown</Text>
				<Text size="11" weight="400" color="support">
					Note: This is a basic hex interpretation. For accurate decoding, use the function signature with a proper ABI decoder.
				</Text>
				
				<div :class="$style.parameters">
					<div v-for="param in formattedParameters" :key="param.index" :class="$style.parameter">
						<Flex direction="column" gap="8">
							<Flex align="center" justify="between">
								<Text size="12" weight="600" color="tertiary">Parameter {{ param.index + 1 }}</Text>
								<CopyButton :text="param.hex" size="12" />
							</Flex>
							
							<Flex direction="column" gap="6">
								<Flex direction="column" gap="2">
									<Text size="11" weight="500" color="support">Hex</Text>
									<Text size="11" weight="400" color="primary" mono :class="$style.param_value">
										{{ param.hex }}
									</Text>
								</Flex>
								
								<Flex direction="column" gap="2">
									<Text size="11" weight="500" color="support">Decimal</Text>
									<Text size="11" weight="400" color="primary" mono :class="$style.param_value">
										{{ param.decimal }}
									</Text>
								</Flex>
								
								<Flex v-if="param.ascii" direction="column" gap="2">
									<Text size="11" weight="500" color="support">ASCII (if string)</Text>
									<Text size="11" weight="400" color="primary" mono :class="$style.param_value">
										"{{ param.ascii }}"
									</Text>
								</Flex>
							</Flex>
						</Flex>
					</div>
				</div>
			</Flex>

			<!-- Footer -->
			<Flex direction="column" gap="12" :class="$style.footer">
				<Text size="11" weight="400" color="support" align="center">
					For precise parameter decoding, use tools like Etherscan's input data decoder with the function ABI.
				</Text>
				<Button type="secondary" size="small" @click="handleClose" block>
					Close
				</Button>
			</Flex>
		</Flex>
	</Modal>
</template>

<style module>
.section {
	padding: 16px;
	border-radius: 8px;
	background: var(--op-3);
	border: 1px solid var(--op-8);
}

.code_block {
	padding: 8px 12px;
	border-radius: 6px;
	background: var(--op-5);
	border: 1px solid var(--op-8);
	word-break: break-all;
}

.raw_input {
	padding: 12px;
	border-radius: 6px;
	background: var(--op-5);
	border: 1px solid var(--op-8);
	max-height: 120px;
	overflow-y: auto;
	word-break: break-all;
	line-height: 1.4;
}

.parameters {
	display: flex;
	flex-direction: column;
	gap: 12px;
	max-height: 300px;
	overflow-y: auto;
}

.parameter {
	padding: 12px;
	border-radius: 6px;
	background: var(--card-background);
	border: 1px solid var(--op-8);
}

.param_value {
	word-break: break-all;
	line-height: 1.3;
}

.footer {
	padding-top: 12px;
	border-top: 1px solid var(--op-8);
}

/* Scrollbar styling */
.raw_input::-webkit-scrollbar,
.parameters::-webkit-scrollbar {
	width: 4px;
}

.raw_input::-webkit-scrollbar-track,
.parameters::-webkit-scrollbar-track {
	background: var(--op-5);
	border-radius: 2px;
}

.raw_input::-webkit-scrollbar-thumb,
.parameters::-webkit-scrollbar-thumb {
	background: var(--op-20);
	border-radius: 2px;
}

.raw_input::-webkit-scrollbar-thumb:hover,
.parameters::-webkit-scrollbar-thumb:hover {
	background: var(--op-30);
}
</style>
