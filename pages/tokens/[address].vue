<script setup>
/** Components */
import TokenOverview from "@/components/modules/tokens/TokenOverview.vue"
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
const token = ref(null)
const counters = ref(null)
const holders = ref([])
const transfers = ref([])
const nftInstances = ref([])
const isLoading = ref(true)
const isRefetching = ref(false)

/** Tabs */
const tabs = ref([
	{ alias: "holders", displayName: "Holders", icon: "address", show: true },
	{ alias: "transfers", displayName: "Transfers", icon: "tx", show: true },
	{ alias: "inventory", displayName: "Inventory", icon: "nft", show: false },
])

const activeTab = ref(route.query.tab || 'holders')

/** Pagination */
const nextPageParams = ref(null)
const previousPages = ref([])

/**
 * Fetch token details
 */
const getTokenDetails = async () => {
	if (!isAddressValid.value) return

	isLoading.value = true

	try {
		const [tokenRes, countersRes] = await Promise.all([
			fetchTokenByIdClient(addressParam.value),
			fetchTokenCountersClient(addressParam.value),
		])

		const tokenData = tokenRes.data?.value || null
		token.value = tokenData ? {
			...tokenData,
			address: tokenData.address || tokenData.address_hash || addressParam.value,
		} : null
		counters.value = countersRes.data?.value || null

		// Show inventory tab for NFT tokens
		if (token.value?.type === 'ERC-721' || token.value?.type === 'ERC-1155') {
			tabs.value = tabs.value.map(tab =>
				tab.alias === 'inventory' ? { ...tab, show: true } : tab
			)
		}
	} catch (error) {
		token.value = null
		counters.value = null
	}

	isLoading.value = false
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
 * Fetch NFT instances (inventory)
 */
const getNFTInstances = async (params = {}) => {
	if (!isAddressValid.value) return

	isRefetching.value = true

	try {
		const { data } = await fetchTokenInstancesClient(addressParam.value, params || {})

		if (data.value?.items) {
			nftInstances.value = data.value.items.map(nft => ({
				...nft,
				id: nft.id ?? nft.token_id ?? nft.unique_token,
			}))
			nextPageParams.value = data.value.next_page_params || null
		}
	} catch (error) {
		nftInstances.value = []
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

	if (tab === 'holders') {
		await getHolders()
	} else if (tab === 'transfers') {
		await getTransfers()
	} else if (tab === 'inventory') {
		await getNFTInstances()
	}
}

/**
 * Pagination handlers
 */
const handleNext = () => {
	if (!nextPageParams.value) return

	const currentData = activeTab.value === 'holders' ? holders.value :
		activeTab.value === 'transfers' ? transfers.value : nftInstances.value

	previousPages.value.push({
		data: [...currentData],
		params: nextPageParams.value
	})

	if (activeTab.value === 'holders') {
		getHolders(nextPageParams.value)
	} else if (activeTab.value === 'transfers') {
		getTransfers(nextPageParams.value)
	} else if (activeTab.value === 'inventory') {
		getNFTInstances(nextPageParams.value)
	}
}

const handlePrev = () => {
	if (previousPages.value.length === 0) return

	const previousState = previousPages.value.pop()

	if (activeTab.value === 'holders') {
		holders.value = previousState.data
	} else if (activeTab.value === 'transfers') {
		transfers.value = previousState.data
	} else if (activeTab.value === 'inventory') {
		nftInstances.value = previousState.data
	}

	nextPageParams.value = previousState.params
}

/** Initial load */
onMounted(async () => {
	await getTokenDetails()
	await getHolders()
})

/** SEO */
useHead({
	title: computed(() => token.value
		? `${token.value.name || 'Token'} (${token.value.symbol || ''}) - Monad Explorer`
		: 'Token - Monad Explorer'
	),
	meta: [
		{
			name: "description",
			content: computed(() => `View details for token ${splitAddress(addressParam.value || '')} on Monad blockchain.`),
		},
	],
})
</script>

<template>
	<Flex direction="column" gap="4" wide>
		<!-- Invalid Address Error -->
		<Flex v-if="addressParam && !isAddressValid" direction="column" align="center" justify="center" gap="16" :class="$style.error_container">
			<Icon name="close" size="32" color="red" />
			<Text size="14" weight="600" color="primary">Invalid Token Address</Text>
			<Text size="13" weight="500" color="secondary">The provided address format is not valid.</Text>
			<NuxtLink to="/tokens">
				<Button type="secondary" size="mini">
					<Icon name="arrow-left" size="12" color="primary" />
					Back to Tokens
				</Button>
			</NuxtLink>
		</Flex>

		<template v-else>
			<!-- Header -->
			<Flex align="center" justify="between" :class="$style.header">
				<Flex align="center" gap="8">
					<Icon name="coins" size="14" color="primary" />
					<Text size="13" weight="600" color="primary">
						Token <Text color="secondary">{{ token?.symbol || splitAddress(addressParam || '') }}</Text>
					</Text>
				</Flex>

				<NuxtLink to="/tokens">
					<Button type="secondary" size="mini">
						<Icon name="arrow-left" size="12" color="primary" />
						All Tokens
					</Button>
				</NuxtLink>
			</Flex>

		<!-- Token Overview -->
		<TokenOverview v-if="token" :token="token" :counters="counters" />

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
				<!-- Holders Tab -->
				<template v-if="activeTab === 'holders'">
					<TokenHoldersTable
						v-if="holders.length"
						:holders="holders"
						:tokenDecimals="token?.decimals || 18"
						:tokenSymbol="token?.symbol || ''"
						:totalSupply="token?.total_supply || '0'"
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
						:tokenDecimals="token?.decimals || 18"
						:tokenSymbol="token?.symbol || ''"
					/>
					<Flex v-else align="center" justify="center" :class="$style.empty">
						<Text size="13" weight="600" color="secondary">No transfers found</Text>
					</Flex>
				</template>

				<!-- Inventory Tab (NFTs) -->
				<template v-else-if="activeTab === 'inventory'">
					<Flex v-if="nftInstances.length" wrap="wrap" gap="16" :class="$style.nft_grid">
						<NuxtLink
							v-for="nft in nftInstances"
							:key="nft.id || nft.token_id || nft.unique_token"
							:to="`/nfts/${addressParam}/${nft.id || nft.token_id || nft.unique_token}`"
							:class="$style.nft_item"
						>
							<div :class="$style.nft_image">
								<img
									v-if="nft.image_url"
									:src="nft.image_url"
									:alt="`NFT #${nft.id}`"
									@error="$event.target.style.display = 'none'"
								/>
								<Icon v-else name="grid" size="32" color="tertiary" />
							</div>
							<Flex direction="column" gap="4" :class="$style.nft_info">
								<Text size="12" weight="600" color="primary">
									#{{ nft.id }}
								</Text>
							</Flex>
						</NuxtLink>
					</Flex>
					<Flex v-else align="center" justify="center" :class="$style.empty">
						<Text size="13" weight="600" color="secondary">No NFTs in this collection</Text>
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

.nft_grid {
	padding: 16px;
}

.nft_item {
	width: 140px;
	background: var(--op-5);
	border-radius: 8px;
	overflow: hidden;
	transition: all 0.2s ease;

	&:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
}

.nft_image {
	width: 100%;
	height: 140px;
	background: var(--op-8);
	display: flex;
	align-items: center;
	justify-content: center;

	& img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.nft_info {
	padding: 8px;
}

@media (max-width: 600px) {
	.nft_grid {
		justify-content: center;
	}
}
</style>
