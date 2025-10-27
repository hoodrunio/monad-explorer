<script setup>
/** Components */
import Input from "@/components/ui/Input.vue"
import Badge from "@/components/ui/Badge.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

/** Store */
import { useVerificationStore } from "@/store/verification.store"

/** API */
import { fetchContractBytecode } from "@/services/api/verifier"

const verificationStore = useVerificationStore()

const isLoadingMetadata = ref(false)
const contractMetadata = ref(null)
const autoFillError = ref(null)

const methods = [
	{
		value: 'solidity-flattened',
		label: 'Solidity (Flattened)',
		description: 'Single flattened source file',
		icon: 'code'
	},
	{
		value: 'solidity-multi-part',
		label: 'Solidity (Multi-Part)',
		description: 'Multiple source files',
		icon: 'code'
	},
	{
		value: 'solidity-standard-json',
		label: 'Solidity (Standard JSON)',
		description: 'Hardhat/Foundry compiler output',
		icon: 'code'
	},
	{
		value: 'vyper-flattened',
		label: 'Vyper (Flattened)',
		description: 'Single flattened Vyper file',
		icon: 'code'
	},
	{
		value: 'vyper-multi-part',
		label: 'Vyper (Multi-Part)',
		description: 'Multiple Vyper source files',
		icon: 'code'
	},
	{
		value: 'sourcify',
		label: 'Sourcify',
		description: 'Use Sourcify verification',
		icon: 'shield-check'
	}
]

const bytecodeTypes = [
	{
		value: 'DEPLOYED_BYTECODE',
		label: 'Deployed Bytecode',
		description: 'Bytecode stored on-chain'
	},
	{
		value: 'CREATION_INPUT',
		label: 'Creation Bytecode',
		description: 'Includes constructor'
	}
]

const selectedMethod = computed(() => {
	return methods.find(m => m.value === verificationStore.verificationMethod)
})

const selectedBytecodeType = computed(() => {
	return bytecodeTypes.find(t => t.value === verificationStore.bytecodeType)
})

const handleAddressChange = async () => {
	autoFillError.value = null
	contractMetadata.value = null

	const address = verificationStore.contractAddress
	if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
		return
	}

	// Auto-fill bytecode from Blockscout API
	isLoadingMetadata.value = true
	try {
		const response = await fetchContractBytecode(address)

		if (response) {
			contractMetadata.value = response

			// Auto-fill bytecode based on selected type
			const bytecode = verificationStore.bytecodeType === 'CREATION_INPUT'
				? response.creationBytecode
				: response.deployedBytecode

			if (bytecode && bytecode !== '0x') {
				verificationStore.setBytecode(bytecode)
			} else {
				autoFillError.value = 'No bytecode found at this address'
			}
		} else {
			autoFillError.value = 'Contract not found'
		}
	} catch (error) {
		autoFillError.value = 'Failed to fetch contract data'
		console.error('Failed to fetch contract data:', error)
	} finally {
		isLoadingMetadata.value = false
	}
}

// Watch for address changes
watch(() => verificationStore.contractAddress, () => {
	const timeout = setTimeout(handleAddressChange, 500)
	return () => clearTimeout(timeout)
})

// Watch for bytecode type changes - refetch bytecode
watch(() => verificationStore.bytecodeType, () => {
	if (verificationStore.contractAddress && contractMetadata.value) {
		handleAddressChange()
	}
})
</script>

<template>
	<Flex direction="column" gap="24" :class="$style.container">
		<!-- Header -->
		<Flex direction="column" gap="8">
			<Text size="16" weight="600" color="primary">Contract Information</Text>
			<Text size="13" color="tertiary">
				Enter the contract address and select your verification method
			</Text>
		</Flex>

		<!-- Contract Address -->
		<Flex direction="column" gap="12">
			<Input
				v-model="verificationStore.contractAddress"
				label="Contract Address"
				placeholder="0x..."
				icon="contract"
				:disabled="isLoadingMetadata"
			/>

			<!-- Contract Status -->
			<Flex v-if="contractMetadata" align="center" gap="8" :class="$style.statusCard">
				<Icon name="check-circle" size="14" color="green" />
				<Text size="12" color="secondary">
					Contract found on-chain
				</Text>
				<Badge v-if="contractMetadata.contractExists" type="green">Exists</Badge>
				<Badge v-if="contractMetadata.isToken" type="blue">Token</Badge>
			</Flex>

			<Flex v-if="autoFillError" align="center" gap="8" :class="$style.errorCard">
				<Icon name="alert-circle" size="14" color="red" />
				<Text size="12" color="red">{{ autoFillError }}</Text>
			</Flex>
		</Flex>

		<!-- Verification Method -->
		<Flex direction="column" gap="12">
			<Text size="13" weight="600" color="secondary">Verification Method</Text>

			<div :class="$style.methodGrid">
				<div
					v-for="method in methods"
					:key="method.value"
					:class="[
						$style.methodCard,
						verificationStore.verificationMethod === method.value && $style.selected
					]"
					@click="verificationStore.setVerificationMethod(method.value)"
				>
					<Flex direction="column" gap="8">
						<Flex align="center" gap="8">
							<Icon :name="method.icon" size="16" color="primary" />
							<Text size="13" weight="600" color="primary">{{ method.label }}</Text>
						</Flex>
						<Text size="11" color="tertiary">{{ method.description }}</Text>
					</Flex>

					<Icon
						v-if="verificationStore.verificationMethod === method.value"
						name="check-circle"
						size="16"
						color="brand"
						:class="$style.checkIcon"
					/>
				</div>
			</div>
		</Flex>

		<!-- Bytecode Type -->
		<Flex direction="column" gap="12">
			<Text size="13" weight="600" color="secondary">Bytecode Type</Text>

			<Flex gap="12" :class="$style.bytecodeTypes">
				<div
					v-for="type in bytecodeTypes"
					:key="type.value"
					:class="[
						$style.bytecodeCard,
						verificationStore.bytecodeType === type.value && $style.selected
					]"
					@click="verificationStore.setBytecodeType(type.value)"
				>
					<Flex direction="column" gap="6">
						<Flex align="center" gap="8">
							<div :class="$style.radio">
								<div
									v-if="verificationStore.bytecodeType === type.value"
									:class="$style.radioInner"
								/>
							</div>
							<Text size="13" weight="600" color="primary">{{ type.label }}</Text>
						</Flex>
						<Text size="11" color="tertiary" :class="$style.typeDescription">
							{{ type.description }}
						</Text>
					</Flex>
				</div>
			</Flex>
		</Flex>

		<!-- Bytecode Input -->
		<Flex direction="column" gap="12">
			<Flex align="center" justify="between">
				<Text size="13" weight="600" color="secondary">Contract Bytecode</Text>
				<Text v-if="isLoadingMetadata" size="11" color="tertiary">
					<Flex align="center" gap="6">
						<Icon name="loader" size="12" color="tertiary" :class="$style.spin" />
						Fetching from chain...
					</Flex>
				</Text>
			</Flex>

			<div :class="$style.bytecodeInput">
				<textarea
					v-model="verificationStore.bytecode"
					placeholder="0x608060405234801561001057600080fd5b50..."
					:class="$style.textarea"
					rows="6"
					spellcheck="false"
				/>
			</div>

			<Text size="11" color="tertiary">
				Enter the contract bytecode. For deployed contracts, this will be auto-filled from the blockchain.
			</Text>
		</Flex>
	</Flex>
</template>

<style module>
.container {
	padding: 24px;
	background: var(--card-background);
	border: 1px solid var(--border);
	border-radius: 12px;
}

.statusCard {
	padding: 12px;
	background: rgba(34, 197, 94, 0.05);
	border: 1px solid rgba(34, 197, 94, 0.2);
	border-radius: 8px;
}

.errorCard {
	padding: 12px;
	background: rgba(239, 68, 68, 0.05);
	border: 1px solid rgba(239, 68, 68, 0.2);
	border-radius: 8px;
}

.methodGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 12px;
}

.methodCard {
	position: relative;
	padding: 16px;
	background: var(--op-3);
	border: 2px solid var(--border);
	border-radius: 10px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.methodCard:hover {
	background: var(--op-5);
	border-color: var(--op-15);
	transform: translateY(-2px);
}

.methodCard.selected {
	background: rgba(59, 130, 246, 0.05);
	border-color: var(--brand);
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkIcon {
	position: absolute;
	top: 12px;
	right: 12px;
}

.bytecodeTypes {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 12px;
}

.bytecodeCard {
	padding: 16px;
	background: var(--op-3);
	border: 2px solid var(--border);
	border-radius: 10px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.bytecodeCard:hover {
	background: var(--op-5);
	border-color: var(--op-15);
}

.bytecodeCard.selected {
	background: rgba(59, 130, 246, 0.05);
	border-color: var(--brand);
}

.radio {
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 2px solid var(--border);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s ease;
}

.bytecodeCard.selected .radio {
	border-color: var(--brand);
}

.radioInner {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: var(--brand);
}

.typeDescription {
	margin-left: 26px;
}

.bytecodeInput {
	position: relative;
	border-radius: 8px;
	border: 1px solid var(--border);
	background: var(--op-3);
	overflow: hidden;
	transition: all 0.2s ease;
}

.bytecodeInput:hover {
	border-color: var(--op-15);
}

.bytecodeInput:focus-within {
	border-color: var(--brand);
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.textarea {
	width: 100%;
	padding: 12px;
	border: none;
	background: transparent;
	color: var(--txt-primary);
	font-size: 12px;
	font-family: 'Source Code Pro', monospace;
	resize: vertical;
	outline: none;
}

.textarea::placeholder {
	color: var(--txt-tertiary);
}

.spin {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

@media (max-width: 768px) {
	.container {
		padding: 16px;
	}

	.methodGrid,
	.bytecodeTypes {
		grid-template-columns: 1fr;
	}
}
</style>
