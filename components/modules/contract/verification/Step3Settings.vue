<script setup>
/** Components */
import Input from "@/components/ui/Input.vue"
import Toggle from "@/components/ui/Toggle.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

/** Store */
import { useVerificationStore } from "@/store/verification.store"

const verificationStore = useVerificationStore()

const isSolidityMethod = computed(() => {
	return verificationStore.verificationMethod.includes('solidity')
})

const isVyperMethod = computed(() => {
	return verificationStore.verificationMethod.includes('vyper')
})

const evmVersions = computed(() => {
	if (!verificationStore.verificationConfig) return []

	// Get appropriate EVM versions based on method
	let versions = []
	if (isSolidityMethod.value) {
		versions = verificationStore.verificationConfig.solidity_evm_versions || []
	} else if (isVyperMethod.value) {
		versions = verificationStore.verificationConfig.vyper_evm_versions || []
	}

	// Transform to {value, label} format
	return versions.map(v => ({
		value: v,
		label: v.charAt(0).toUpperCase() + v.slice(1)
	}))
})

const selectedEvmVersion = computed(() => {
	return evmVersions.value.find(v => v.value === verificationStore.evmVersion)
})

const optimizationPresets = [
	{ runs: 200, label: 'Default (200)', description: 'Standard optimization' },
	{ runs: 1, label: 'Size (1)', description: 'Optimize for smaller bytecode' },
	{ runs: 1000, label: 'Performance (1000)', description: 'Optimize for gas efficiency' },
	{ runs: 10000, label: 'High (10000)', description: 'Maximum gas optimization' }
]

const handleOptimizationToggle = () => {
	verificationStore.setOptimizationEnabled(!verificationStore.optimizationEnabled)
}

const setOptimizationPreset = (runs) => {
	verificationStore.setOptimizationRuns(runs)
}
</script>

<template>
	<Flex direction="column" gap="24" :class="$style.container">
		<!-- Header -->
		<Flex direction="column" gap="8">
			<Text size="16" weight="600" color="primary">Compiler Settings</Text>
			<Text size="13" color="tertiary">
				Configure optimization and EVM version settings
			</Text>
		</Flex>

		<!-- EVM Version -->
		<Flex direction="column" gap="12">
			<Text size="13" weight="600" color="secondary">EVM Version</Text>
			<Text size="11" color="tertiary">
				The Ethereum Virtual Machine version used during compilation
			</Text>

			<Dropdown>
				<div :class="$style.evmSelector">
					<Flex align="center" justify="between" wide>
						<Flex align="center" gap="8">
							<Icon name="layers" size="14" color="primary" />
							<Text size="13" weight="600" color="primary">
								{{ selectedEvmVersion?.label || 'Select EVM Version' }}
							</Text>
						</Flex>
						<Icon name="chevron-down" size="14" color="tertiary" />
					</Flex>
				</div>

				<template #popup>
					<DropdownItem
						v-for="version in evmVersions"
						:key="version.value"
						@click="verificationStore.setEvmVersion(version.value)"
					>
						<Flex align="center" gap="8">
							<Icon
								:name="verificationStore.evmVersion === version.value ? 'check-circle' : 'circle'"
								size="12"
								:color="verificationStore.evmVersion === version.value ? 'brand' : 'tertiary'"
							/>
							<Text size="12" weight="500" color="primary">{{ version.label }}</Text>
						</Flex>
					</DropdownItem>
					<Flex v-if="evmVersions.length === 0" align="center" justify="center" :style="{ padding: '16px' }">
						<Text size="12" color="tertiary">Loading EVM versions...</Text>
					</Flex>
				</template>
			</Dropdown>
		</Flex>

		<!-- Optimization -->
		<Flex direction="column" gap="16" :class="$style.section">
			<Flex align="center" justify="between">
				<Flex direction="column" gap="6">
					<Text size="13" weight="600" color="secondary">Optimization</Text>
					<Text size="11" color="tertiary">
						Enable compiler optimization to reduce gas costs
					</Text>
				</Flex>
				<Toggle
					:modelValue="verificationStore.optimizationEnabled"
					@update:modelValue="handleOptimizationToggle"
				/>
			</Flex>

			<!-- Optimization Runs -->
			<Flex v-if="verificationStore.optimizationEnabled" direction="column" gap="12" :class="$style.optimizationConfig">
				<Flex align="center" justify="between">
					<Text size="12" weight="600" color="secondary">Optimization Runs</Text>
					<Text size="11" color="tertiary">Current: {{ verificationStore.optimizationRuns || 200 }}</Text>
				</Flex>

				<!-- Presets -->
				<div :class="$style.presetGrid">
					<div
						v-for="preset in optimizationPresets"
						:key="preset.runs"
						:class="[
							$style.presetCard,
							verificationStore.optimizationRuns === preset.runs && $style.selected
						]"
						@click="setOptimizationPreset(preset.runs)"
					>
						<Flex direction="column" gap="4">
							<Text size="12" weight="600" color="primary">{{ preset.label }}</Text>
							<Text size="10" color="tertiary">{{ preset.description }}</Text>
						</Flex>
						<Icon
							v-if="verificationStore.optimizationRuns === preset.runs"
							name="check-circle"
							size="14"
							color="brand"
							:class="$style.checkIcon"
						/>
					</div>
				</div>

				<!-- Custom Runs Input -->
				<Input
					:modelValue="verificationStore.optimizationRuns"
					@update:modelValue="verificationStore.setOptimizationRuns"
					type="number"
					label="Custom Optimization Runs"
					placeholder="200"
				/>
			</Flex>
		</Flex>

		<!-- Constructor Arguments (for CREATION_INPUT) -->
		<Flex
			v-if="verificationStore.bytecodeType === 'CREATION_INPUT'"
			direction="column"
			gap="12"
			:class="$style.section"
		>
			<Text size="13" weight="600" color="secondary">Constructor Arguments</Text>
			<Text size="11" color="tertiary">
				ABI-encoded constructor arguments (without 0x prefix)
			</Text>

			<div :class="$style.constructorInput">
				<textarea
					v-model="verificationStore.constructorArguments"
					placeholder="000000000000000000000000..."
					:class="$style.textarea"
					rows="3"
					spellcheck="false"
				/>
			</div>
		</Flex>

		<!-- Tips -->
		<Flex direction="column" gap="8" :class="$style.tips">
			<Flex align="center" gap="8">
				<Icon name="lightbulb" size="14" color="orange" />
				<Text size="12" weight="600" color="primary">Important Notes</Text>
			</Flex>
			<Flex direction="column" gap="6" :class="$style.tipsList">
				<Text size="11" color="tertiary">
					• Optimization settings must exactly match those used during compilation
				</Text>
				<Text size="11" color="tertiary">
					• Default optimization is 200 runs for most Hardhat projects
				</Text>
				<Text size="11" color="tertiary">
					• EVM version should match your target network (Cancun for most recent chains)
				</Text>
			</Flex>
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

.section {
	padding: 16px;
	background: var(--op-3);
	border: 1px solid var(--border);
	border-radius: 10px;
}

.evmSelector {
	padding: 12px 16px;
	background: var(--op-3);
	border: 1px solid var(--border);
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.evmSelector:hover {
	background: var(--op-5);
	border-color: var(--op-15);
}

.optimizationConfig {
	padding: 12px;
	background: var(--card-background);
	border-radius: 8px;
}

.presetGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	gap: 8px;
}

.presetCard {
	position: relative;
	padding: 12px;
	background: var(--card-background);
	border: 2px solid var(--border);
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.presetCard:hover {
	border-color: var(--op-15);
	transform: translateY(-1px);
}

.presetCard.selected {
	background: rgba(59, 130, 246, 0.05);
	border-color: var(--brand);
}

.checkIcon {
	position: absolute;
	top: 8px;
	right: 8px;
}

.constructorInput {
	border-radius: 8px;
	border: 1px solid var(--border);
	background: var(--op-3);
	overflow: hidden;
	transition: all 0.2s ease;
}

.constructorInput:hover {
	border-color: var(--op-15);
}

.constructorInput:focus-within {
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

.tips {
	padding: 16px;
	background: rgba(251, 146, 60, 0.05);
	border: 1px solid rgba(251, 146, 60, 0.2);
	border-radius: 10px;
}

.tipsList {
	margin-left: 22px;
}

@media (max-width: 768px) {
	.container {
		padding: 16px;
	}

	.presetGrid {
		grid-template-columns: 1fr 1fr;
	}
}
</style>
