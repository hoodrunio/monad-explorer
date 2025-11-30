<script setup>
/** Components */
import TokensTable from "@/components/modules/tokens/TokensTable.vue"

/** UI */
import Button from "@/components/ui/Button.vue"
import Input from "@/components/ui/Input.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

/** API */
import { fetchTokensClient } from "@/services/api/tokens"

/** State */
const collections = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedType = ref('all')

/** Pagination */
const nextPageParams = ref(null)
const previousPages = ref([])

/** NFT Types */
const nftTypes = [
	{ value: 'all', label: 'All Types' },
	{ value: 'ERC-721', label: 'ERC-721' },
	{ value: 'ERC-1155', label: 'ERC-1155' },
]

/**
 * Fetch NFT collections (tokens of type ERC-721 or ERC-1155)
 */
const getCollections = async (paginationParams = null) => {
	isLoading.value = true

	try {
		const queryParams = {}

		// Add search query if present
		if (searchQuery.value) {
			queryParams.q = searchQuery.value
		}

		// Filter by NFT types
		if (selectedType.value !== 'all') {
			queryParams.type = selectedType.value
		} else {
			queryParams.type = 'ERC-721,ERC-1155'
		}

		// Add pagination params for cursor-based pagination
		if (paginationParams) {
			Object.keys(paginationParams).forEach(key => {
				// Don't override type filter
				if (key !== 'type') {
					queryParams[key] = paginationParams[key]
				}
			})
		}

		const { data } = await fetchTokensClient(queryParams)

		if (data.value?.items) {
			collections.value = data.value.items
			nextPageParams.value = data.value.next_page_params || null
		} else {
			collections.value = []
			nextPageParams.value = null
		}
	} catch (error) {
		console.error('Error fetching NFT collections:', error)
		collections.value = []
		nextPageParams.value = null
	}

	isLoading.value = false
}

/**
 * Handle search
 */
let searchTimeout = null
const handleSearch = () => {
	clearTimeout(searchTimeout)
	searchTimeout = setTimeout(() => {
		previousPages.value = []
		getCollections()
	}, 300)
}

/**
 * Handle type filter change
 */
const handleTypeChange = (type) => {
	selectedType.value = type
	previousPages.value = []
	getCollections()
}

/**
 * Pagination handlers
 */
const handleNext = async () => {
	if (!nextPageParams.value) return

	// Save current state with deep copy to avoid reference issues
	previousPages.value.push({
		collections: JSON.parse(JSON.stringify(collections.value)),
		nextParams: JSON.parse(JSON.stringify(nextPageParams.value))
	})

	await getCollections(nextPageParams.value)
}

const handlePrev = () => {
	if (previousPages.value.length === 0) return

	const previousState = previousPages.value.pop()
	collections.value = previousState.collections
	nextPageParams.value = previousState.nextParams
}

/** Initial load */
onMounted(() => {
	getCollections()
})

/** SEO */
useHead({
	title: "NFT Collections - Monad Explorer",
	meta: [
		{
			name: "description",
			content: "Explore NFT collections on the Monad blockchain. View ERC-721 and ERC-1155 NFTs, collections, and ownership data.",
		},
		{
			property: "og:title",
			content: "NFT Collections - Monad Explorer",
		},
	],
})
</script>

<template>
	<Flex direction="column" gap="4" wide :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="grid" size="14" color="primary" />
				<Text size="13" weight="600" color="primary">NFT Collections</Text>
			</Flex>
		</Flex>

		<!-- Main Content -->
		<Flex direction="column" gap="4" :class="$style.content">
			<!-- Filters -->
			<Flex align="center" justify="between" gap="12" :class="$style.filters">
				<Flex align="center" gap="8">
					<Input
						v-model="searchQuery"
						@input="handleSearch"
						placeholder="Search collections..."
						size="small"
						:class="$style.search_input"
					/>
				</Flex>

				<Flex align="center" gap="8">
					<Dropdown>
						<Button type="secondary" size="mini">
							<Text size="12" weight="600" color="secondary">
								{{ nftTypes.find(t => t.value === selectedType)?.label }}
							</Text>
							<Icon name="chevron" size="12" color="tertiary" />
						</Button>

						<template #popup>
							<DropdownItem
								v-for="type in nftTypes"
								:key="type.value"
								@click="handleTypeChange(type.value)"
							>
								<Text size="12" weight="500" :color="selectedType === type.value ? 'primary' : 'secondary'">
									{{ type.label }}
								</Text>
							</DropdownItem>
						</template>
					</Dropdown>
				</Flex>
			</Flex>

			<!-- Table -->
			<Flex direction="column" :class="[$style.table_wrapper, isLoading && $style.loading]">
				<!-- Loading State -->
				<Flex
					v-if="isLoading"
					align="center"
					justify="center"
					:class="$style.empty"
				>
					<Text size="13" weight="600" color="tertiary">Loading...</Text>
				</Flex>

				<TokensTable v-else-if="collections.length" :tokens="collections" routePrefix="/nfts" />

				<Flex
					v-else-if="searchQuery"
					align="center"
					justify="center"
					direction="column"
					gap="16"
					:class="$style.empty"
				>
					<Icon name="search" size="24" color="support" />
					<Text size="13" weight="600" color="secondary">No collections found</Text>
					<Text size="12" weight="500" color="tertiary">
						Try a different search term
					</Text>
				</Flex>

				<Flex
					v-else
					align="center"
					justify="center"
					direction="column"
					gap="16"
					:class="$style.empty"
				>
					<Icon name="grid" size="24" color="support" />
					<Text size="13" weight="600" color="secondary">No NFT collections available</Text>
				</Flex>

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
	</Flex>
</template>

<style module>
.wrapper {
	padding: 20px 24px 60px 24px;
}

.header {
	height: 40px;
	border-radius: 8px 8px 4px 4px;
	background: var(--card-background);
	padding: 0 12px;
}

.content {
	background: var(--card-background);
	border-radius: 4px 4px 8px 8px;
}

.filters {
	padding: 12px 16px;
	border-bottom: 1px dashed var(--op-8);
}

.search_input {
	width: 280px;
}

.table_wrapper {
	min-height: 400px;
}

.table_wrapper.loading {
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

@media (max-width: 600px) {
	.wrapper {
		padding: 12px 12px 32px 12px;
	}

	.filters {
		flex-direction: column;
		align-items: stretch;
	}

	.search_input {
		width: 100%;
	}
}
</style>
