<script setup>
/** Components */
import NFTInstanceOverview from "@/components/modules/nfts/NFTInstanceOverview.vue"
import NFTTransfersTable from "@/components/modules/nfts/NFTTransfersTable.vue"

/** UI */
import Button from "@/components/ui/Button.vue"

/** Services */
import { splitAddress, shortHex } from "@/services/utils"

/** API */
import { fetchTokenByIdClient } from "@/services/api/tokens"
import {
	fetchNFTInstanceClient,
	fetchNFTInstanceTransfersClient,
	fetchNFTInstanceHoldersClient,
	refetchNFTMetadata,
} from "@/services/api/nfts"

const route = useRoute()
const router = useRouter()

/** Validate address */
const isValidAddress = (address) => {
	if (!address || typeof address !== 'string') return false
	return /^0x[a-fA-F0-9]{40}$/i.test(address)
}

// Validate address format (only if address param is present)
const addressParam = computed(() => route.params.address)
const idParam = computed(() => route.params.id)
const isAddressValid = computed(() => isValidAddress(addressParam.value))

/** State */
const nft = ref(null)
const token = ref(null)
const transfers = ref([])
const holders = ref([])
const isLoading = ref(true)
const isRefetching = ref(false)
const isRefreshingMetadata = ref(false)

/** Tabs */
const tabs = ref([
	{ alias: "transfers", displayName: "Transfers", icon: "tx", show: true },
	{ alias: "holders", displayName: "Holders", icon: "address", show: true },
])

const activeTab = ref(route.query.tab || 'transfers')

/** Pagination */
const nextPageParams = ref(null)
const previousPages = ref([])

/**
 * Fetch NFT details
 */
const getNFTDetails = async () => {
	if (!isAddressValid.value || !idParam.value) return

	isLoading.value = true

	try {
		const [nftRes, tokenRes] = await Promise.all([
			fetchNFTInstanceClient(addressParam.value, idParam.value),
			fetchTokenByIdClient(addressParam.value),
		])

		nft.value = nftRes.data?.value || null
		const tokenData = tokenRes.data?.value || null
		token.value = tokenData ? {
			...tokenData,
			address: tokenData.address || tokenData.address_hash || addressParam.value,
		} : null
	} catch (error) {
		nft.value = null
		token.value = null
	}

	isLoading.value = false
}

/**
 * Fetch transfers
 */
const getTransfers = async (params = {}) => {
	if (!isAddressValid.value || !idParam.value) return

	isRefetching.value = true

	try {
		const { data } = await fetchNFTInstanceTransfersClient(
			addressParam.value,
			idParam.value,
			params || {}
		)

		if (data.value?.items) {
			transfers.value = data.value.items
			nextPageParams.value = data.value.next_page_params || null
		}
	} catch (error) {
		transfers.value = []
		nextPageParams.value = null
	}

	isRefetching.value = false
}

/**
 * Fetch holders (for ERC-1155)
 */
const getHolders = async (params = {}) => {
	if (!isAddressValid.value || !idParam.value) return

	isRefetching.value = true

	try {
		const queryParams = { items_count: 20, ...params }
		const { data } = await fetchNFTInstanceHoldersClient(
			addressParam.value,
			idParam.value,
			queryParams
		)

		if (data.value?.items) {
			holders.value = data.value.items
			nextPageParams.value = data.value.next_page_params || null
		}
	} catch (error) {
		holders.value = []
		nextPageParams.value = null
	}

	isRefetching.value = false
}

/**
 * Handle tab change
 */
const handleTabChange = async (tab) => {
	if (activeTab.value === tab) return

	activeTab.value = tab
	previousPages.value = []
	nextPageParams.value = null

	router.replace({ query: { tab } })

	if (tab === 'transfers') {
		await getTransfers()
	} else if (tab === 'holders') {
		await getHolders()
	}
}

/**
 * Handle metadata refresh
 */
const handleRefreshMetadata = async () => {
	if (!isAddressValid.value || !idParam.value) return

	isRefreshingMetadata.value = true

	try {
		await refetchNFTMetadata(addressParam.value, idParam.value)
		// Wait a bit for the backend to process
		await new Promise(resolve => setTimeout(resolve, 2000))
		// Refetch NFT details
		await getNFTDetails()
	} catch (error) {
		console.error('Failed to refresh metadata:', error)
	}

	isRefreshingMetadata.value = false
}

/**
 * Pagination handlers
 */
const handleNext = () => {
	if (!nextPageParams.value) return

	const currentData = activeTab.value === 'transfers' ? transfers.value : holders.value

	previousPages.value.push({
		data: [...currentData],
		params: nextPageParams.value
	})

	if (activeTab.value === 'transfers') {
		getTransfers(nextPageParams.value)
	} else if (activeTab.value === 'holders') {
		getHolders(nextPageParams.value)
	}
}

const handlePrev = () => {
	if (previousPages.value.length === 0) return

	const previousState = previousPages.value.pop()

	if (activeTab.value === 'transfers') {
		transfers.value = previousState.data
	} else if (activeTab.value === 'holders') {
		holders.value = previousState.data
	}

	nextPageParams.value = previousState.params
}

/** Initial load */
onMounted(async () => {
	await getNFTDetails()
	await getTransfers()
})

/** SEO */
useHead({
	title: computed(() => {
		const name = nft.value?.metadata?.name || `#${idParam.value || ''}`
		const collection = token.value?.name || 'NFT'
		return `${name} - ${collection} - Monad Explorer`
	}),
	meta: [
		{
			name: "description",
			content: computed(() => `View NFT #${idParam.value || ''} from collection ${splitAddress(addressParam.value || '')} on Monad blockchain.`),
		},
	],
})
</script>

<template>
	<Flex direction="column" gap="4" wide :class="$style.wrapper">
		<!-- Invalid Address Error -->
		<Flex v-if="addressParam && !isAddressValid" direction="column" align="center" justify="center" gap="16" :class="$style.error_container">
			<Icon name="close" size="32" color="red" />
			<Text size="14" weight="600" color="primary">Invalid Collection Address</Text>
			<Text size="13" weight="500" color="secondary">The provided address format is not valid.</Text>
			<NuxtLink to="/nfts">
				<Button type="secondary" size="mini">
					<Icon name="arrow-left" size="12" color="primary" />
					Back to Collections
				</Button>
			</NuxtLink>
		</Flex>

		<template v-else>
			<!-- Header -->
			<Flex align="center" justify="between" :class="$style.header">
				<Flex align="center" gap="8">
					<Icon name="grid" size="14" color="primary" />
					<Text size="13" weight="600" color="primary">
						NFT <Text color="secondary">#{{ idParam && idParam.length > 10 ? shortHex(idParam) : idParam }}</Text>
					</Text>
				</Flex>

				<NuxtLink :to="`/nfts/${addressParam}`">
					<Button type="secondary" size="mini">
						<Icon name="arrow-left" size="12" color="primary" />
						Back to Collection
					</Button>
				</NuxtLink>
			</Flex>

		<!-- Disclaimer -->
		<Flex align="center" gap="8" :class="$style.disclaimer">
			<Icon name="info" size="14" color="yellow" />
			<Text size="12" weight="500" color="secondary">
				Data may be delayed due to indexing. Some information might not reflect the latest on-chain state.
			</Text>
		</Flex>

		<!-- NFT Overview -->
		<NFTInstanceOverview
			v-if="nft"
			:nft="nft"
			:token="token"
			@refreshMetadata="handleRefreshMetadata"
		/>

		<!-- Loading State -->
		<Flex v-else-if="isLoading" align="center" justify="center" :class="$style.loading_container">
			<Text size="13" weight="600" color="tertiary">Loading NFT...</Text>
		</Flex>

		<!-- Tabs -->
		<Flex direction="column" :class="$style.tabs_container">
			<Flex align="center" gap="4" :class="$style.tabs_wrapper">
				<template v-for="tab in tabs">
					<Flex
						v-if="tab.show"
						@click="handleTabChange(tab.alias)"
						align="center"
						gap="6"
						:class="[$style.tab, activeTab === tab.alias && $style.active]"
					>
						<Icon :name="tab.icon" size="12" color="secondary" />
						<Text size="13" weight="600">{{ tab.displayName }}</Text>
					</Flex>
				</template>
			</Flex>

			<!-- Tab Content -->
			<Flex direction="column" :class="[$style.tab_content, isRefetching && $style.loading]">
				<!-- Loading State -->
				<Flex v-if="isLoading || isRefetching" align="center" justify="center" :class="$style.empty">
					<Text size="13" weight="600" color="tertiary">Loading...</Text>
				</Flex>

				<!-- Transfers Tab -->
				<template v-else-if="activeTab === 'transfers'">
					<NFTTransfersTable v-if="transfers.length" :transfers="transfers" />
					<Flex v-else align="center" justify="center" :class="$style.empty">
						<Text size="13" weight="600" color="secondary">No transfers found</Text>
					</Flex>
				</template>

				<!-- Holders Tab -->
				<template v-else-if="activeTab === 'holders'">
					<div v-if="holders.length" :class="$style.holders_list">
						<Flex
							v-for="holder in holders"
							:key="holder.address?.hash"
							align="center"
							justify="between"
							:class="$style.holder_item"
						>
							<NuxtLink :to="`/address/${holder.address?.hash}`">
								<Flex align="center" gap="8">
									<Icon name="address" size="14" color="secondary" />
									<Text size="12" weight="600" color="primary" mono>
										{{ shortHex(holder.address?.hash) }}
									</Text>
								</Flex>
							</NuxtLink>
							<Text size="12" weight="600" color="secondary">
								{{ holder.value || 1 }} {{ holder.value > 1 ? 'items' : 'item' }}
							</Text>
						</Flex>
					</div>
					<Flex v-else align="center" justify="center" :class="$style.empty">
						<Text size="13" weight="600" color="secondary">No holders found</Text>
					</Flex>
				</template>

				<!-- Pagination -->
				<Flex align="center" justify="between" :class="$style.pagination">
					<Flex align="center" gap="6">
						<Button type="secondary" @click="handlePrev" size="mini" :disabled="previousPages.length === 0">
							<Icon name="arrow-left" size="12" color="primary" />
						</Button>

						<Button type="secondary" size="mini" disabled>
							<Text size="12" weight="600" color="primary">Page {{ previousPages.length + 1 }}</Text>
						</Button>

						<Button @click="handleNext" type="secondary" size="mini" :disabled="!nextPageParams">
							<Icon name="arrow-right" size="12" color="primary" />
						</Button>
					</Flex>
				</Flex>
			</Flex>
		</Flex>
		</template>
	</Flex>
</template>

<style module>
.wrapper {
	padding: 20px 24px 60px 24px;
}

.error_container {
	min-height: 400px;
	background: var(--card-background);
	border-radius: 8px;
	padding: 40px;
}

.header {
	height: 40px;
	border-radius: 8px 8px 4px 4px;
	background: var(--card-background);
	padding: 0 12px;
}

.disclaimer {
	background: rgba(234, 179, 8, 0.1);
	border: 1px solid rgba(234, 179, 8, 0.2);
	border-radius: 8px;
	padding: 10px 14px;
}

.loading_container {
	min-height: 200px;
	background: var(--card-background);
	border-radius: 8px;
}

.tabs_container {
	background: var(--card-background);
	border-radius: 4px 4px 8px 8px;
}

.tabs_wrapper {
	min-height: 44px;
	padding: 0 8px;
	border-bottom: 1px solid var(--op-8);
}

.tab {
	height: 28px;
	padding: 0 8px;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.1s ease;

	& span {
		color: var(--txt-tertiary);
		transition: all 0.1s ease;
	}

	&:hover span {
		color: var(--txt-secondary);
	}
}

.tab.active {
	background: var(--op-8);

	& span {
		color: var(--txt-primary);
	}
}

.tab_content {
	min-height: 300px;
}

.tab_content.loading {
	opacity: 0.5;
	pointer-events: none;
}

.empty {
	flex: 1;
	min-height: 200px;
}

.pagination {
	padding: 16px;
	border-top: 1px solid var(--op-5);
}

.holders_list {
	padding: 16px;
}

.holder_item {
	padding: 12px;
	border-radius: 8px;
	transition: background 0.2s ease;

	&:hover {
		background: var(--op-5);
	}

	& + & {
		margin-top: 8px;
	}
}

@media (max-width: 600px) {
	.wrapper {
		padding: 12px 12px 32px 12px;
	}
}
</style>
