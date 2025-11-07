<script setup>
/** Components */
import Skeleton from "@/components/Skeleton.vue"
import Button from "@/components/ui/Button.vue"
import Badge from "@/components/ui/Badge.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"
import VerificationBadge from "@/components/modules/contract/VerificationBadge.vue"
import ContractTabs from "@/components/modules/contract/ContractTabs.vue"
import ContractSourceCode from "@/components/modules/contract/ContractSourceCode.vue"

/** Services */
import { splitAddress } from "@/services/utils"

/** Composables */
import { CONTRACT_TABS } from "@/composables/useContractTabs"

/** API */
import { fetchContract } from "@/services/api/contract"

const route = useRoute()

// Validate address format
const isValidAddress = (address) => {
	if (!address || typeof address !== 'string') return false
	return /^0x[a-fA-F0-9]{40}$/i.test(address)
}

// Check if address is valid, redirect if not
if (!isValidAddress(route.params.address)) {
	throw createError({
		statusCode: 400,
		statusMessage: 'Invalid contract address format'
	})
}

// Fetch contract data (new API includes all data automatically)
const { data: contractData, pending, error, refresh } = await fetchContract(route.params.address)

// Handle error states
if (error.value) {
	throw createError({
		statusCode: error.value.statusCode || 404,
		statusMessage: error.value.statusMessage || 'Contract not found'
	})
}

// SEO
useHead({
	title: `Contract ${splitAddress(route.params.address)} - Monad Explorer`,
	link: [
		{
			rel: "canonical",
			href: `/contract/${route.params.address}`,
		},
	],
	meta: [
		{
			name: "description",
			content: `Explore contract ${splitAddress(route.params.address)} on the Monad blockchain. View contract details, metadata, and verification status.`,
		},
		{
			property: "og:title",
			content: `Contract ${splitAddress(route.params.address)} - Monad Explorer`,
		},
		{
			property: "og:description",
			content: `Explore contract ${splitAddress(route.params.address)} on the Monad blockchain. View contract details, metadata, and verification status.`,
		},
		{
			property: "og:type",
			content: "website",
		},
	],
})

// Computed properties - Updated for new API structure
const contract = computed(() => contractData.value)

// New API provides these fields directly
const contractLanguage = computed(() => contract.value?.language || 'Unknown')
const isToken = computed(() => {
	// Check if ABI has token methods
	const abi = contract.value?.abi
	if (!abi) return false
	const abiString = typeof abi === 'string' ? abi : JSON.stringify(abi)
	return abiString.includes('transfer') && abiString.includes('balanceOf')
})
const isProxied = computed(() => !!(contract.value?.minimalProxyAddress))
const isVerified = computed(() => contract.value?.isVerified || false)
const isFullyVerified = computed(() => contract.value?.isFullyVerified || false)
const creationStatus = computed(() => contract.value?.creationStatus || 'unknown')

// Active tab state for contract tabs
const activeTab = ref(CONTRACT_TABS.SOURCE)

// Handle tab change
const handleTabChange = (tabId) => {
	activeTab.value = tabId
}

// View raw data
const handleViewRawData = () => {
	// This would open a modal with raw contract data
}
</script>

<template>
	<Flex direction="column" gap="4" wide :class="$style.wrapper">
		<Skeleton v-if="pending" />

		<template v-else-if="contractData">
			<!-- Compact Header with Inline Badge -->
			<Flex align="center" justify="between" :class="$style.header">
				<Flex align="center" gap="12">
					<Icon name="contract" size="16" color="brand" />
					<Flex direction="column" gap="2">
						<Flex align="center" gap="8">
							<Text as="h1" size="16" weight="600" color="primary">Contract</Text>
							<VerificationBadge
								:is-verified="isVerified"
								:is-fully-verified="isFullyVerified"
								size="small"
								:show-animation="false"
							/>
						</Flex>
						<Flex align="center" gap="6">
							<Text size="12" color="secondary" family="mono">{{ route.params.address }}</Text>
							<CopyButton :text="route.params.address" size="10" />
						</Flex>
					</Flex>
				</Flex>

				<Flex align="center" gap="8">
					<Button
						v-if="!isVerified"
						:link="`/verify-contract?address=${route.params.address}`"
						type="primary"
						size="small"
						:class="$style.verifyButton"
					>
						<Icon name="shield-check" size="12" />
						Verify
					</Button>

					<Dropdown>
						<Button type="secondary" size="small">
							<Icon name="dots" size="14" />
						</Button>

						<template #popup>
							<DropdownItem @click="handleViewRawData">
								<Flex align="center" gap="8">
									<Icon name="code" size="12" color="secondary" />
									View Raw Data
								</Flex>
							</DropdownItem>
							<DropdownItem @click="refresh">
								<Flex align="center" gap="8">
									<Icon name="refresh" size="12" color="secondary" />
									Refresh
								</Flex>
							</DropdownItem>
						</template>
					</Dropdown>
				</Flex>
			</Flex>

			<!-- Single Unified Contract Info Card -->
			<div :class="$style.infoCard">
				<Text size="13" weight="600" color="primary" :class="$style.infoCardTitle">Contract Info</Text>

				<!-- Compact Grid Layout -->
				<div :class="$style.infoGrid">
					<!-- Row 1 -->
					<div :class="$style.infoItem">
						<Text size="11" color="tertiary">Contract Creator:</Text>
						<Flex align="center" gap="4">
							<Icon name="user" size="10" color="green" />
							<Text size="11" weight="500" color="primary" family="mono">
								{{ contract?.creator ? splitAddress(contract.creator) : 'Unknown' }}
							</Text>
						</Flex>
					</div>

					<div :class="$style.infoItem">
						<Text size="11" color="tertiary">Language:</Text>
						<Text size="11" weight="500" color="primary">{{ contractLanguage }}</Text>
					</div>

					<div :class="$style.infoItem">
						<Text size="11" color="tertiary">Creation Status:</Text>
						<Badge size="tiny" :type="creationStatus === 'success' ? 'green' : 'gray'">
							{{ creationStatus }}
						</Badge>
					</div>

					<!-- Row 2 -->
					<div :class="$style.infoItem" v-if="contract?.verifiedAt">
						<Text size="11" color="tertiary">Verified At:</Text>
						<Text size="11" weight="500" color="primary">
							{{ new Date(contract.verifiedAt).toLocaleDateString() }}
						</Text>
					</div>

					<div :class="$style.infoItem" v-if="contract?.compilerVersion">
						<Text size="11" color="tertiary">Compiler:</Text>
						<Text size="11" weight="500" color="primary" family="mono">{{ contract.compilerVersion }}</Text>
					</div>

					<div :class="$style.infoItem" v-if="contract?.evmVersion">
						<Text size="11" color="tertiary">EVM Version:</Text>
						<Text size="11" weight="500" color="primary">{{ contract.evmVersion }}</Text>
					</div>

					<!-- Row 3 -->
					<div :class="$style.infoItem" v-if="contract?.optimizationEnabled !== undefined">
						<Text size="11" color="tertiary">Optimization:</Text>
						<Badge size="tiny" :type="contract?.optimizationEnabled ? 'green' : 'gray'">
							{{ contract?.optimizationEnabled ? 'Enabled' : 'Disabled' }}
						</Badge>
					</div>

					<div :class="$style.infoItem" v-if="contract?.optimizationsRuns">
						<Text size="11" color="tertiary">Runs:</Text>
						<Text size="11" weight="500" color="primary">{{ contract.optimizationsRuns }}</Text>
					</div>

					<div :class="$style.infoItem" v-if="isToken">
						<Text size="11" color="tertiary">Type:</Text>
						<Badge size="tiny" type="green">Token</Badge>
					</div>

					<!-- Row 4 - Proxy Info (if applicable) -->
					<div :class="$style.infoItem" v-if="isProxied" style="grid-column: 1 / -1;">
						<Text size="11" color="tertiary">Implementation:</Text>
						<Flex align="center" gap="6">
							<Icon name="link" size="10" color="orange" />
							<Text size="11" weight="500" color="primary" family="mono">
								{{ splitAddress(contract.minimalProxyAddress) }}
							</Text>
							<CopyButton :text="contract.minimalProxyAddress" size="10" />
						</Flex>
					</div>
				</div>
			</div>

			<!-- Contract Code Tabs (Source / ABI / Bytecode) -->
			<ContractTabs
				:is-verified="isVerified"
				:default-tab="CONTRACT_TABS.SOURCE"
				@tab-change="handleTabChange"
			>
				<template #default="{ activeTab: currentTab }">
					<!-- Source Code Tab -->
					<div v-if="currentTab === CONTRACT_TABS.SOURCE && contract?.sourceCode">
						<ContractSourceCode
							:source-code="contract.sourceCode"
							:contract-name="contract?.contractName || 'Contract'"
							:language="contractLanguage"
							:max-height="600"
						/>
					</div>

					<!-- Empty state for source code -->
					<Flex v-else-if="currentTab === CONTRACT_TABS.SOURCE && !contract?.sourceCode" direction="column" align="center" justify="center" gap="12" :class="$style.emptyState">
						<Icon name="code" size="32" color="tertiary" />
						<Text size="13" color="tertiary">
							{{ isVerified ? 'No source code available' : 'Contract must be verified to view source code' }}
						</Text>
					</Flex>

					<!-- ABI Tab -->
					<div v-else-if="currentTab === CONTRACT_TABS.ABI && contract?.abi" :class="$style.jsonContainer">
						<pre :class="$style.jsonContent">{{ JSON.stringify(contract.abi, null, 2) }}</pre>
					</div>

					<!-- Empty state for ABI -->
					<Flex v-else-if="currentTab === CONTRACT_TABS.ABI && !contract?.abi" direction="column" align="center" justify="center" gap="12" :class="$style.emptyState">
						<Icon name="brackets" size="32" color="tertiary" />
						<Text size="13" color="tertiary">No ABI available for this contract</Text>
					</Flex>

					<!-- Bytecode Tab -->
					<div v-else-if="currentTab === CONTRACT_TABS.BYTECODE && contract?.deployedBytecode" :class="$style.bytecodeContainer">
						<Flex direction="column" gap="12">
							<Flex align="center" justify="between">
								<Text size="14" weight="600" color="primary">Deployed Bytecode</Text>
								<Text size="11" color="tertiary">{{ (contract.deployedBytecode.length / 2 - 1).toLocaleString() }} bytes</Text>
							</Flex>
							<div :class="$style.bytecodeContent">
								<Text size="11" color="secondary" family="mono">{{ contract.deployedBytecode }}</Text>
							</div>
						</Flex>
					</div>

					<!-- Empty state for bytecode -->
					<Flex v-else-if="currentTab === CONTRACT_TABS.BYTECODE && !contract?.deployedBytecode" direction="column" align="center" justify="center" gap="12" :class="$style.emptyState">
						<Icon name="binary" size="32" color="tertiary" />
						<Text size="13" color="tertiary">No bytecode available for this contract</Text>
					</Flex>

					<!-- Read Contract Tab (Placeholder) -->
					<Flex v-else-if="currentTab === CONTRACT_TABS.READ" direction="column" align="center" justify="center" gap="12" :class="$style.emptyState">
						<Icon name="eye" size="32" color="tertiary" />
						<Text size="13" color="primary" weight="600">Read Contract</Text>
						<Text size="12" color="tertiary" align="center">
							Coming soon: Read contract functions will be available here
						</Text>
					</Flex>

					<!-- Write Contract Tab (Placeholder) -->
					<Flex v-else-if="currentTab === CONTRACT_TABS.WRITE" direction="column" align="center" justify="center" gap="12" :class="$style.emptyState">
						<Icon name="edit" size="32" color="tertiary" />
						<Text size="13" color="primary" weight="600">Write Contract</Text>
						<Text size="12" color="tertiary" align="center">
							Coming soon: Write contract functions will be available here
						</Text>
					</Flex>
				</template>
			</ContractTabs>
		</template>

		<Flex v-else direction="column" align="center" justify="center" gap="16" :class="$style.empty">
			<Icon name="contract" size="32" color="tertiary" />
			<Flex direction="column" align="center" gap="8">
				<Text size="14" weight="600" color="primary">Contract not found</Text>
				<Text size="13" color="tertiary" align="center" style="max-width: 220px">
					This address is not a contract or hasn't been indexed yet
				</Text>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
/* Page Wrapper */
.wrapper {
	padding: 0 24px;
}

/* Compact Header */
.header {
	padding: 14px 18px;
	border-radius: 8px;
	background: var(--card-background);
	border: 1px solid var(--op-10);
	transition: var(--transition-fast);
}

.verifyButton {
	background: linear-gradient(135deg, var(--brand) 0%, #14a87d 100%);
	box-shadow: 0 2px 6px rgba(24, 210, 165, 0.25);
	transition: all 0.15s ease;
}

.verifyButton:hover {
	box-shadow: 0 4px 10px rgba(24, 210, 165, 0.35);
}

/* Unified Info Card */
.infoCard {
	padding: 16px 18px;
	border-radius: 8px;
	background: var(--card-background);
	border: 1px solid var(--op-10);
}

.infoCardTitle {
	margin-bottom: 14px;
	display: block;
}

/* Compact Grid for Info Items */
.infoGrid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12px 20px;
}

.infoItem {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0; /* Allow text truncation */
}

/* Empty States */
.emptyState {
	min-height: 300px;
	padding: 40px 20px;
}

.empty {
	min-height: 400px;
}

/* JSON Container (for ABI) */
.jsonContainer {
	max-height: 600px;
	overflow: auto;
	border-radius: 8px;
	background: var(--code-background);
	border: 1px solid var(--border);
}

.jsonContent {
	padding: 16px;
	margin: 0;
	font-size: 12px;
	font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
	color: var(--txt-secondary);
	line-height: 1.6;
	overflow-x: auto;
}

/* Bytecode Container */
.bytecodeContainer {
	padding: 16px;
	border-radius: 8px;
	background: rgba(0, 0, 0, 0.2);
	border: 1px solid var(--op-10);
}

.bytecodeContent {
	max-height: 400px;
	overflow: auto;
	padding: 12px;
	background: var(--code-background);
	border-radius: 6px;
	border: 1px solid var(--border);
	word-break: break-all;
}

/* Mobile Responsive */
@media (max-width: 768px) {
	.wrapper {
		padding: 0 16px;
	}

	.header {
		padding: 12px 14px;
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}

	.infoCard {
		padding: 14px 16px;
	}

	.infoGrid {
		grid-template-columns: 1fr;
		gap: 10px;
	}

	.infoItem {
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: 8px 0;
		border-bottom: 1px solid var(--op-05);
	}

	.infoItem:last-child {
		border-bottom: none;
	}

	.emptyState {
		min-height: 250px;
		padding: 32px 16px;
	}
}

/* Tablet */
@media (max-width: 1024px) and (min-width: 769px) {
	.wrapper {
		padding: 0 20px;
	}

	.infoGrid {
		grid-template-columns: repeat(2, 1fr);
	}
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
	.header,
	.verifyButton {
		transition: none;
	}
}
</style>
