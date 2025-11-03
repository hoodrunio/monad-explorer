<script setup>
/** Components */
import Input from "@/components/ui/Input.vue"

/** Store */
import { useVerificationStore } from "@/store/verification.store"

const verificationStore = useVerificationStore()

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
			/>
			<Text size="11" color="tertiary">
				Enter the address of the deployed contract you want to verify
			</Text>
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
	</Flex>
</template>

<style module>
.container {
	padding: 24px;
	background: var(--card-background);
	border: 1px solid var(--border);
	border-radius: 12px;
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

@media (max-width: 768px) {
	.container {
		padding: 16px;
	}

	.methodGrid {
		grid-template-columns: 1fr;
	}
}
</style>
