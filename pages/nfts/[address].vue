<script setup>
/** Components */
import TokenOverview from "@/components/modules/tokens/TokenOverview.vue"
import NFTGrid from "@/components/modules/nfts/NFTGrid.vue"
import TokenHoldersTable from "@/components/modules/tokens/TokenHoldersTable.vue"
import TokenTransfersTable from "@/components/modules/tokens/TokenTransfersTable.vue"

/** UI */
import Button from "@/components/ui/Button.vue"

/** Services */
import { splitAddress } from "@/services/utils"

/** API */
import {
	fetchTokenByIdClient,
	fetchTokenCountersClient,
	fetchTokenHoldersClient,
	fetchTokenTransfersClient,
	fetchTokenInstancesClient,
} from "@/services/api/tokens"

const route = useRoute()
const router = useRouter()

/** Validate address */
const isValidAddress = (address) => {
	if (!address || typeof address !== 'string') return false
	return /^0x[a-fA-F0-9]{40}$/i.test(address)
}

// Validate address format (only if address param is present)
const addressParam = computed(() => route.params.address)
const isAddressValid = computed(() => isValidAddress(addressParam.value))

/** State */
const collection = ref(null)
const counters = ref(null)
const nfts = ref([])
const holders = ref([])
const transfers = ref([])
const isLoading = ref(true)
const isRefetching = ref(false)

/** Tabs */
const tabs = ref([
	{ alias: "inventory", displayName: "Inventory", icon: "nft", show: true },
	{ alias: "holders", displayName: "Holders", icon: "address", show: true },
	{ alias: "transfers", displayName: "Transfers", icon: "tx", show: true },
])

const activeTab = ref(route.query.tab || 'inventory')

/** Pagination */
const nextPageParams = ref(null)
const previousPages = ref([])

/**
 * Fetch collection details
 */
const getCollectionDetails = async () => {
	if (!isAddressValid.value) return

	isLoading.value = true

	try {
		const [tokenRes, countersRes] = await Promise.all([
			fetchTokenByIdClient(addressParam.value),
			fetchTokenCountersClient(addressParam.value),
		])

		const tokenData = tokenRes.data?.value || null
		collection.value = tokenData ? {
			...tokenData,
			address: tokenData.address || tokenData.address_hash || addressParam.value,
		} : null
		counters.value = countersRes.data?.value || null
	} catch (error) {
		collection.value = null
		counters.value = null
	}

	isLoading.value = false
}

/**
 * Fetch NFT instances (inventory)
 */
const getNFTs = async (params = {}) => {
	if (!isAddressValid.value) return

	isRefetching.value = true

	try {
		const { data } = await fetchTokenInstancesClient(addressParam.value, params || {})

		if (data.value?.items) {
			// Add token info to each NFT for display
			nfts.value = data.value.items.map(nft => ({
				...nft,
				id: nft.id ?? nft.token_id ?? nft.unique_token,
				token: {
					address: addressParam.value,
					name: collection.value?.name,
					symbol: collection.value?.symbol,
					icon_url: collection.value?.icon_url,
				}
			}))
			nextPageParams.value = data.value.next_page_params || null
		}
	} catch (error) {
		nfts.value = []
		nextPageParams.value = null
	}

	isRefetching.value = false
}

/**
 * Fetch holders
 */
const getHolders = async (params = {}) => {
	if (!isAddressValid.value) return

	isRefetching.value = true

	try {
		const queryParams = { items_count: 20, ...params }
		const { data } = await fetchTokenHoldersClient(addressParam.value, queryParams)

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
 * Fetch transfers
 */
const getTransfers = async (params = {}) => {
	if (!isAddressValid.value) return

	isRefetching.value = true

	try {
		const { data } = await fetchTokenTransfersClient(addressParam.value, params || {})

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
 * Handle tab change
 */
const handleTabChange = async (tab) => {
	if (activeTab.value === tab) return

	activeTab.value = tab
	previousPages.value = []
	nextPageParams.value = null

	router.replace({ query: { tab } })

	if (tab === 'inventory') {
		await getNFTs()
	} else if (tab === 'holders') {
		await getHolders()
	} else if (tab === 'transfers') {
		await getTransfers()
	}
}

/**
 * Pagination handlers
 */
const handleNext = () => {
	if (!nextPageParams.value) return

	const currentData = activeTab.value === 'inventory' ? nfts.value :
		activeTab.value === 'holders' ? holders.value : transfers.value

	previousPages.value.push({
		data: [...currentData],
		params: nextPageParams.value
	})

	if (activeTab.value === 'inventory') {
		getNFTs(nextPageParams.value)
	} else if (activeTab.value === 'holders') {
		getHolders(nextPageParams.value)
	} else if (activeTab.value === 'transfers') {
		getTransfers(nextPageParams.value)
	}
}

const handlePrev = () => {
	if (previousPages.value.length === 0) return

	const previousState = previousPages.value.pop()

	if (activeTab.value === 'inventory') {
		nfts.value = previousState.data
	} else if (activeTab.value === 'holders') {
		holders.value = previousState.data
	} else if (activeTab.value === 'transfers') {
		transfers.value = previousState.data
	}

	nextPageParams.value = previousState.params
}

/** Initial load */
onMounted(async () => {
	await getCollectionDetails()
	await getNFTs()
})

/** SEO */
useHead({
	title: computed(() => collection.value
		? `${collection.value.name || 'NFT Collection'} - Monad Explorer`
		: 'NFT Collection - Monad Explorer'
	),
	meta: [
		{
			name: "description",
			content: computed(() => `View NFT collection ${splitAddress(addressParam.value || '')} on Monad blockchain.`),
		},
	],
})
</script>

<template>
	<!-- Show collection view when no instance id is present -->
	<template v-if="!route.params.id">
		<Flex direction="column" gap="4" wide>
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
							NFT Collection <Text color="secondary">{{ collection?.name || splitAddress(addressParam || '') }}</Text>
						</Text>
					</Flex>

					<NuxtLink to="/nfts">
						<Button type="secondary" size="mini">
							<Icon name="arrow-left" size="12" color="primary" />
							All Collections
						</Button>
					</NuxtLink>
				</Flex>

			<!-- Collection Overview -->
			<TokenOverview v-if="collection" :token="collection" :counters="counters" />

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

					<!-- Inventory Tab -->
					<template v-else-if="activeTab === 'inventory'">
						<NFTGrid v-if="nfts.length" :nfts="nfts" :showCollection="false" :fallbackAddress="addressParam" />
						<Flex v-else align="center" justify="center" :class="$style.empty">
							<Text size="13" weight="600" color="secondary">No NFTs in this collection</Text>
						</Flex>
					</template>

					<!-- Holders Tab -->
					<template v-else-if="activeTab === 'holders'">
						<TokenHoldersTable
							v-if="holders.length"
							:holders="holders"
							:tokenDecimals="0"
							:tokenSymbol="collection?.symbol || 'NFT'"
							:totalSupply="collection?.total_supply || '0'"
						/>
						<Flex v-else align="center" justify="center" :class="$style.empty">
							<Text size="13" weight="600" color="secondary">No holders found</Text>
						</Flex>
					</template>

					<!-- Transfers Tab -->
					<template v-else-if="activeTab === 'transfers'">
						<TokenTransfersTable
							v-if="transfers.length"
							:transfers="transfers"
							:tokenDecimals="0"
							:tokenSymbol="collection?.symbol || ''"
						/>
						<Flex v-else align="center" justify="center" :class="$style.empty">
							<Text size="13" weight="600" color="secondary">No transfers found</Text>
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

	<!-- Render NFT instance child route -->
	<NuxtPage v-else />
</template>

<style module>
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
	min-height: 400px;
}

.tab_content.loading {
	opacity: 0.5;
	pointer-events: none;
}

.empty {
	flex: 1;
	min-height: 300px;
}

.pagination {
	padding: 16px;
	border-top: 1px solid var(--op-5);
}
</style>
