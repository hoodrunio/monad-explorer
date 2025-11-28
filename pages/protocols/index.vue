<script setup>
/** Components */
import ProtocolCard from "@/components/modules/protocols/ProtocolCard.vue"

/** UI */
import Button from "@/components/ui/Button.vue"
import Input from "@/components/ui/Input.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

/** API */
import {
	preloadProtocolList,
	getProtocolsList,
	getCategories,
} from "@/services/api/protocolList"

/** State */
const protocols = ref([])
const categories = ref({ primary: [], byPrimary: {} })
const isLoading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('all')
const selectedSubcategory = ref('all')
const expandedProtocols = ref(new Set())

const route = useRoute()
const router = useRouter()

/** Computed */
const subcategories = computed(() => {
	if (selectedCategory.value === 'all') return []
	return categories.value.byPrimary?.[selectedCategory.value] || []
})

const filteredProtocols = computed(() => {
	let result = protocols.value

	// Filter by category
	if (selectedCategory.value !== 'all') {
		result = result.filter(p => p.ctype === selectedCategory.value)
	}

	// Filter by subcategory
	if (selectedSubcategory.value !== 'all') {
		result = result.filter(p => p.csubtype === selectedSubcategory.value)
	}

	// Filter by search
	if (searchQuery.value) {
		const query = searchQuery.value.toLowerCase()
		result = result.filter(p =>
			p.name.toLowerCase().includes(query) ||
			p.csubtype?.toLowerCase().includes(query)
		)
	}

	return result
})

const categoryStats = computed(() => {
	const stats = { all: protocols.value.length }
	protocols.value.forEach(p => {
		stats[p.ctype] = (stats[p.ctype] || 0) + 1
	})
	return stats
})

const totalContracts = computed(() => {
	return filteredProtocols.value.reduce((sum, p) => sum + (p.contracts?.length || 0), 0)
})

/** Methods */
const loadData = async () => {
	isLoading.value = true
	await preloadProtocolList()
	protocols.value = getProtocolsList()
	categories.value = getCategories()
	isLoading.value = false

	// Check for search query in URL
	if (route.query.search) {
		searchQuery.value = route.query.search
	}
}

const selectCategory = (cat) => {
	selectedCategory.value = cat
	selectedSubcategory.value = 'all'
}

const toggleExpand = (name) => {
	if (expandedProtocols.value.has(name)) {
		expandedProtocols.value.delete(name)
	} else {
		expandedProtocols.value.add(name)
	}
	// Trigger reactivity
	expandedProtocols.value = new Set(expandedProtocols.value)
}

/** Lifecycle */
onMounted(loadData)

/** Watch for URL search param changes */
watch(() => route.query.search, (newSearch) => {
	if (newSearch) {
		searchQuery.value = newSearch
	}
})

/** SEO */
useHead({
	title: "Protocols - Monad Explorer",
	meta: [
		{
			name: "description",
			content: "Explore all protocols on the Monad blockchain. View DeFi, AI, Gaming, and more protocols with their smart contracts.",
		},
	],
})
</script>

<template>
	<Flex direction="column" gap="4" wide :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="layers" size="14" color="primary" />
				<Text size="13" weight="600" color="primary">Protocols</Text>
				<Text size="12" color="tertiary">({{ filteredProtocols.length }} protocols, {{ totalContracts }} contracts)</Text>
			</Flex>
		</Flex>

		<!-- Main Content -->
		<Flex direction="column" gap="4" :class="$style.content">
			<!-- Filters -->
			<Flex direction="column" gap="12" :class="$style.filters">
				<!-- Category Tabs -->
				<Flex align="center" gap="4" :class="$style.category_tabs">
					<div
						@click="selectCategory('all')"
						:class="[$style.category_tab, selectedCategory === 'all' && $style.active]"
					>
						<Text size="12" weight="600">All</Text>
						<Text size="11" color="tertiary">({{ categoryStats.all || 0 }})</Text>
					</div>
					<div
						v-for="cat in categories.primary"
						:key="cat"
						@click="selectCategory(cat)"
						:class="[$style.category_tab, selectedCategory === cat && $style.active, $style[`cat_${cat.toLowerCase()}`]]"
					>
						<Text size="12" weight="600">{{ cat }}</Text>
						<Text size="11" color="tertiary">({{ categoryStats[cat] || 0 }})</Text>
					</div>
				</Flex>

				<!-- Search & Subcategory -->
				<Flex align="center" gap="12" wrap="wrap">
					<Input
						v-model="searchQuery"
						placeholder="Search protocols..."
						size="small"
						:class="$style.search_input"
					>
						<template #prefix>
							<Icon name="search" size="12" color="tertiary" />
						</template>
					</Input>

					<Dropdown v-if="subcategories.length > 0">
						<Button type="secondary" size="mini">
							<Text size="12" color="secondary">
								{{ selectedSubcategory === 'all' ? 'All Subcategories' : selectedSubcategory }}
							</Text>
							<Icon name="chevron" size="12" color="tertiary" />
						</Button>
						<template #popup>
							<DropdownItem @click="selectedSubcategory = 'all'">
								All Subcategories
							</DropdownItem>
							<DropdownItem
								v-for="sub in subcategories"
								:key="sub"
								@click="selectedSubcategory = sub"
							>
								{{ sub }}
							</DropdownItem>
						</template>
					</Dropdown>
				</Flex>
			</Flex>

			<!-- Protocols List -->
			<Flex v-if="isLoading" align="center" justify="center" :class="$style.loading">
				<Text size="13" weight="600" color="tertiary">Loading protocols...</Text>
			</Flex>

			<Flex v-else-if="filteredProtocols.length" direction="column" gap="8" :class="$style.protocols_list">
				<ProtocolCard
					v-for="protocol in filteredProtocols"
					:key="protocol.name"
					:protocol="protocol"
					:expanded="expandedProtocols.has(protocol.name)"
					@click="toggleExpand(protocol.name)"
				/>
			</Flex>

			<Flex v-else align="center" justify="center" direction="column" gap="16" :class="$style.empty">
				<Icon name="search" size="24" color="support" />
				<Flex direction="column" gap="8" align="center">
					<Text size="13" weight="600" color="secondary">No protocols found</Text>
					<Text size="12" weight="500" color="tertiary">Try adjusting your search or filters</Text>
				</Flex>
				<Button v-if="searchQuery || selectedCategory !== 'all'" @click="searchQuery = ''; selectCategory('all')" type="secondary" size="small">
					Clear filters
				</Button>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	max-width: 1200px;
	margin: 0 auto;
	padding: 0 16px;
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
	min-height: 600px;
}

.filters {
	position: sticky;
	top: 0;
	z-index: 10;
	background: var(--card-background);
	padding: 16px;
	border-bottom: 1px solid var(--op-5);
}

.category_tabs {
	flex-wrap: wrap;
	gap: 6px;
}

.category_tab {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	border-radius: 6px;
	background: var(--op-5);
	cursor: pointer;
	transition: all 0.15s ease;
}

.category_tab:hover {
	background: var(--op-8);
}

.category_tab.active {
	background: var(--op-15);
}

.category_tab.active span:first-child {
	color: var(--txt-primary);
}

/* Category tab colors when active */
.cat_defi.active { background: rgba(59, 130, 246, 0.15); }
.cat_ai.active { background: rgba(139, 92, 246, 0.15); }
.cat_consumer.active { background: rgba(16, 185, 129, 0.15); }
.cat_gaming.active { background: rgba(245, 158, 11, 0.15); }
.cat_depin.active { background: rgba(6, 182, 212, 0.15); }
.cat_infra.active { background: rgba(107, 114, 128, 0.15); }
.cat_nft.active { background: rgba(236, 72, 153, 0.15); }
.cat_cefi.active { background: rgba(234, 179, 8, 0.15); }

.search_input {
	min-width: 250px;
}

.protocols_list {
	padding: 16px;
}

.loading {
	padding: 100px 16px;
}

.empty {
	padding: 100px 16px;
}

@media (max-width: 768px) {
	.wrapper {
		padding: 0 8px;
	}

	.search_input {
		min-width: 100%;
		width: 100%;
	}

	.category_tabs {
		overflow-x: auto;
		flex-wrap: nowrap;
		padding-bottom: 8px;
	}

	.category_tab {
		flex-shrink: 0;
	}
}
</style>
