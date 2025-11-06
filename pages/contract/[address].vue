<script setup>
/** Components */
import Skeleton from "@/components/Skeleton.vue"
import Button from "@/components/ui/Button.vue"
import Badge from "@/components/ui/Badge.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

/** Services */
import { splitAddress, comma } from "@/services/utils"

/** API */
import { fetchContract } from "@/services/api/contract"

const route = useRoute()
const router = useRouter()

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

// Copy address to clipboard
const copyAddress = () => {
	navigator.clipboard.writeText(route.params.address)
}

// View raw data
const handleViewRawData = () => {
	// This would open a modal with raw contract data
}
</script>

<template>
	<Flex direction="column" gap="4">
		<Skeleton v-if="pending" />

		<template v-else-if="contractData">
			<!-- Header -->
			<Flex align="center" justify="between" :class="$style.header">
				<Flex align="center" gap="8">
					<Icon name="contract" size="14" color="primary" />
					<Text as="h1" size="13" weight="600" color="primary">
						Contract <Text color="secondary">{{ splitAddress(route.params.address) }}</Text>
					</Text>
					<CopyButton :text="route.params.address" size="12" />
				</Flex>

				<Flex align="center" gap="12">
					<Button
						v-if="!isVerified"
						:link="`/verify-contract?address=${route.params.address}`"
						type="primary"
						size="mini"
					>
						<Icon name="shield-check" size="12" color="primary" />
						Verify Contract
					</Button>

					<Dropdown>
						<Button type="secondary" size="mini">
							<Icon name="dots" size="16" color="primary" />
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
							<DropdownItem :link="`/verify-contract?address=${route.params.address}`">
								<Flex align="center" gap="8">
									<Icon name="shield-check" size="12" color="secondary" />
									Verify Contract
								</Flex>
							</DropdownItem>
						</template>
					</Dropdown>
				</Flex>
			</Flex>

			<!-- Verification CTA (for unverified contracts) -->
			<Flex v-if="!isVerified" direction="column" gap="12" :class="$style.verifyCta">
				<Flex align="center" gap="12">
					<div :class="$style.verifyIcon">
						<Icon name="shield-check" size="24" color="white" />
					</div>
					<Flex direction="column" gap="4">
						<Text size="14" weight="600" color="primary">Contract Not Verified</Text>
						<Text size="12" color="tertiary">
							Verify your contract to enable source code viewing and improve transparency
						</Text>
					</Flex>
				</Flex>
				<Button
					:link="`/verify-contract?address=${route.params.address}`"
					type="primary"
					size="medium"
					wide
				>
					<Icon name="shield-check" size="14" color="primary" />
					Verify This Contract
				</Button>
			</Flex>

			<!-- Verified Success Banner -->
			<Flex v-else direction="column" gap="12" :class="$style.verifiedBanner">
				<Flex align="center" gap="12">
					<div :class="$style.verifiedIcon">
						<Icon name="check" size="20" color="white" />
					</div>
					<Flex direction="column" gap="4">
						<Flex align="center" gap="8">
							<Text size="14" weight="600" color="primary">Contract Verified</Text>
							<Badge v-if="isFullyVerified" type="green">Fully Verified</Badge>
							<Badge v-else-if="contract?.isPartiallyVerified" type="orange">Partially Verified</Badge>
						</Flex>
						<Text size="12" color="tertiary">
							This contract's source code has been verified and is publicly available
						</Text>
					</Flex>
				</Flex>
			</Flex>

			<!-- Contract Info Cards -->
			<Flex gap="4" :class="$style.content">
				<!-- Basic Info -->
				<Flex direction="column" gap="16" :class="$style.card">
					<Text size="12" weight="600" color="primary">Contract Information</Text>

					<Flex direction="column" gap="12">
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Language</Text>
							<Badge :type="contractLanguage === 'solidity' ? 'blue' : contractLanguage === 'vyper' ? 'purple' : 'gray'">
								{{ contractLanguage }}
							</Badge>
						</Flex>

						<Flex align="center" justify="between" v-if="isToken">
							<Text size="11" color="tertiary">Type</Text>
							<Badge type="green">Token Contract</Badge>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Verified</Text>
							<Badge :type="isVerified ? 'green' : 'red'">
								{{ isVerified ? 'Yes' : 'No' }}
							</Badge>
						</Flex>

						<Flex align="center" justify="between" v-if="contract?.verifiedAt">
							<Text size="11" color="tertiary">Verified At</Text>
							<Text size="11" color="secondary">
								{{ new Date(contract.verifiedAt).toLocaleDateString() }}
							</Text>
						</Flex>

						<Flex align="center" justify="between" v-if="isProxied">
							<Text size="11" color="tertiary">Proxy</Text>
							<Badge type="orange">Proxied</Badge>
						</Flex>

						<Flex align="center" justify="between" v-if="contract?.minimalProxyAddress">
							<Text size="11" color="tertiary">Implementation</Text>
							<Flex align="center" gap="4">
								<Text size="11" color="secondary">{{ splitAddress(contract.minimalProxyAddress) }}</Text>
								<CopyButton :text="contract.minimalProxyAddress" size="10" />
							</Flex>
						</Flex>
					</Flex>
				</Flex>

				<!-- Contract Status -->
				<Flex direction="column" gap="16" :class="$style.card">
					<Text size="12" weight="600" color="primary">Contract Status</Text>

					<Flex direction="column" gap="12">
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Creation Status</Text>
							<Badge :type="creationStatus === 'success' ? 'green' : creationStatus === 'failed' ? 'red' : 'gray'">
								{{ creationStatus }}
							</Badge>
						</Flex>

						<Flex align="center" justify="between" v-if="contract?.deployedBytecode">
							<Text size="11" color="tertiary">Has Bytecode</Text>
							<Badge type="green">Yes</Badge>
						</Flex>

						<Flex align="center" justify="between" v-if="contract?.isChangedBytecode">
							<Text size="11" color="tertiary">Bytecode Changed</Text>
							<Badge type="orange">Yes</Badge>
						</Flex>
					</Flex>
				</Flex>

				<!-- Compilation Info -->
				<Flex direction="column" gap="16" :class="$style.card" v-if="contract?.compilerVersion">
					<Text size="12" weight="600" color="primary">Compilation Details</Text>

					<Flex direction="column" gap="12">
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Compiler</Text>
							<Text size="11" color="secondary" family="mono">
								{{ contract.compilerVersion }}
							</Text>
						</Flex>

						<Flex align="center" justify="between" v-if="contract?.evmVersion">
							<Text size="11" color="tertiary">EVM Version</Text>
							<Text size="11" color="secondary">{{ contract.evmVersion }}</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Optimization</Text>
							<Badge :type="contract?.optimizationEnabled ? 'green' : 'gray'">
								{{ contract?.optimizationEnabled ? 'Enabled' : 'Disabled' }}
							</Badge>
						</Flex>

						<Flex align="center" justify="between" v-if="contract?.optimizationsRuns">
							<Text size="11" color="tertiary">Runs</Text>
							<Text size="11" color="secondary">{{ contract.optimizationsRuns }}</Text>
						</Flex>
					</Flex>
				</Flex>
			</Flex>

			<!-- Source Code Section -->
			<Flex direction="column" gap="16" :class="$style.card" v-if="contract?.sourceCode && isVerified">
				<Text size="12" weight="600" color="primary">Source Code</Text>
				<Flex :class="$style.code">
					<Text size="10" color="tertiary" family="mono">
						{{ contract.sourceCode.substring(0, 500) }}{{ contract.sourceCode.length > 500 ? '...' : '' }}
					</Text>
				</Flex>
			</Flex>

			<!-- Bytecode Section -->
			<Flex direction="column" gap="16" :class="$style.card" v-if="contract?.deployedBytecode">
				<Text size="12" weight="600" color="primary">Deployed Bytecode</Text>
				<Flex :class="$style.bytecode">
					<Text size="10" color="tertiary" family="mono">
						{{ contract.deployedBytecode.substring(0, 200) }}...
					</Text>
				</Flex>
			</Flex>
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
.header {
	padding: 16px;
	border-radius: 8px;
	background: var(--card-background);
	border: 1px solid var(--border);
}

.content {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: 16px;
}

.card {
	padding: 16px;
	border-radius: 8px;
	background: var(--card-background);
	border: 1px solid var(--border);
}

.code,
.bytecode {
	padding: 12px;
	border-radius: 6px;
	background: var(--code-background);
	border: 1px solid var(--border);
	word-break: break-all;
	max-height: 300px;
	overflow-y: auto;
}

.empty {
	min-height: 300px;
}

.verifyCta {
	padding: 24px;
	background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%);
	border: 2px solid rgba(59, 130, 246, 0.3);
	border-radius: 12px;
	position: relative;
	overflow: hidden;
}

.verifyCta::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 4px;
	background: linear-gradient(90deg, var(--brand), var(--blue));
}

.verifyIcon {
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--brand);
	border-radius: 12px;
	flex-shrink: 0;
	box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.verifiedBanner {
	padding: 20px 24px;
	background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%);
	border: 2px solid rgba(34, 197, 94, 0.3);
	border-radius: 12px;
	position: relative;
	overflow: hidden;
}

.verifiedBanner::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 4px;
	background: linear-gradient(90deg, var(--green), #10b981);
}

.verifiedIcon {
	width: 44px;
	height: 44px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--green);
	border-radius: 50%;
	flex-shrink: 0;
	box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}
</style>
