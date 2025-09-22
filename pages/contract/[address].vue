<script setup>
/** Components */
import Skeleton from "@/components/Skeleton.vue"
import Button from "@/components/ui/Button.vue"
import Badge from "@/components/ui/Badge.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

/** Services */
import { splitAddress, comma } from "@/services/utils"

/** API */
import { fetchContract, enrichContract } from "@/services/api/contract"

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

// Fetch contract data
const { data: contractData, pending, error, refresh } = await fetchContract(route.params.address, { includeMetadata: true })

// Handle error states
if (error.value) {
	throw createError({
		statusCode: error.value.statusCode || 404,
		statusMessage: error.value.statusMessage || 'Contract not found'
	})
}

// Reactive state
const isEnriching = ref(false)

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

// Computed properties
const contract = computed(() => contractData.value?.data)
const metadata = computed(() => contract.value?.metadata)

const contractType = computed(() => metadata.value?.contractType || 'Unknown')
const isToken = computed(() => metadata.value?.isToken || false)
const isProxied = computed(() => metadata.value?.isProxied || false)
const isVerified = computed(() => contract.value?.isVerified || false)

// Handle contract enrichment
const handleEnrichContract = async () => {
	isEnriching.value = true
	try {
		await enrichContract(route.params.address, { priority: 5 })
		// Refresh data after a delay to allow processing
		setTimeout(() => {
			refresh()
		}, 2000)
	} catch (error) {
		console.error('Failed to enrich contract:', error)
	}
	isEnriching.value = false
}

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
					<Button @click="handleEnrichContract" type="secondary" size="mini" :disabled="isEnriching">
						<Icon name="refresh" size="12" color="primary" />
						{{ isEnriching ? 'Enriching...' : 'Enrich' }}
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
						</template>
					</Dropdown>
				</Flex>
			</Flex>

			<!-- Contract Info Cards -->
			<Flex gap="4" :class="$style.content">
				<!-- Basic Info -->
				<Flex direction="column" gap="16" :class="$style.card">
					<Text size="12" weight="600" color="primary">Contract Information</Text>
					
					<Flex direction="column" gap="12">
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Type</Text>
							<Badge :type="contractType === 'Token' ? 'green' : contractType === 'Proxy' ? 'orange' : 'gray'">
								{{ contractType }}
							</Badge>
						</Flex>

						<Flex align="center" justify="between" v-if="isToken">
							<Text size="11" color="tertiary">Token Type</Text>
							<Badge type="blue">{{ metadata?.tokenType || 'Unknown' }}</Badge>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Verified</Text>
							<Badge :type="isVerified ? 'green' : 'red'">
								{{ isVerified ? 'Yes' : 'No' }}
							</Badge>
						</Flex>

						<Flex align="center" justify="between" v-if="isProxied">
							<Text size="11" color="tertiary">Proxy</Text>
							<Badge type="orange">Proxied</Badge>
						</Flex>

						<Flex align="center" justify="between" v-if="metadata?.implementationAddress">
							<Text size="11" color="tertiary">Implementation</Text>
							<Flex align="center" gap="4">
								<Text size="11" color="secondary">{{ splitAddress(metadata.implementationAddress) }}</Text>
								<CopyButton :text="metadata.implementationAddress" size="10" />
							</Flex>
						</Flex>
					</Flex>
				</Flex>

				<!-- Contract Status -->
				<Flex direction="column" gap="16" :class="$style.card">
					<Text size="12" weight="600" color="primary">Contract Status</Text>
					
					<Flex direction="column" gap="12">
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Exists</Text>
							<Badge :type="metadata?.contractExists ? 'green' : 'red'">
								{{ metadata?.contractExists ? 'Yes' : 'No' }}
							</Badge>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Has Bytecode</Text>
							<Badge :type="metadata?.runtimeBytecode ? 'green' : 'red'">
								{{ metadata?.runtimeBytecode ? 'Yes' : 'No' }}
							</Badge>
						</Flex>
					</Flex>
				</Flex>

				<!-- Creation Info -->
				<Flex direction="column" gap="16" :class="$style.card" v-if="contract">
					<Text size="12" weight="600" color="primary">Creation Details</Text>
					
					<Flex direction="column" gap="12">
						<Flex align="center" justify="between" v-if="contract.createdAt">
							<Text size="11" color="tertiary">Created At</Text>
							<Text size="11" color="secondary">
								{{ new Date(contract.createdAt).toLocaleDateString() }}
							</Text>
						</Flex>

						<Flex align="center" justify="between" v-if="contract.creator">
							<Text size="11" color="tertiary">Creator</Text>
							<Flex align="center" gap="4">
								<Text size="11" color="secondary">{{ splitAddress(contract.creator) }}</Text>
								<CopyButton :text="contract.creator" size="10" />
							</Flex>
						</Flex>

						<Flex align="center" justify="between" v-if="contract.creationTransaction">
							<Text size="11" color="tertiary">Creation Tx</Text>
							<Flex align="center" gap="4">
								<Text size="11" color="secondary">{{ splitAddress(contract.creationTransaction) }}</Text>
								<CopyButton :text="contract.creationTransaction" size="10" />
							</Flex>
						</Flex>
					</Flex>
				</Flex>
			</Flex>

			<!-- Bytecode Section -->
			<Flex direction="column" gap="16" :class="$style.card" v-if="metadata?.runtimeBytecode">
				<Text size="12" weight="600" color="primary">Runtime Bytecode</Text>
				<Flex :class="$style.bytecode">
					<Text size="10" color="tertiary" family="mono">
						{{ metadata.runtimeBytecode.substring(0, 200) }}...
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

.bytecode {
	padding: 12px;
	border-radius: 6px;
	background: var(--code-background);
	border: 1px solid var(--border);
	word-break: break-all;
	max-height: 200px;
	overflow-y: auto;
}

.empty {
	min-height: 300px;
}
</style>
