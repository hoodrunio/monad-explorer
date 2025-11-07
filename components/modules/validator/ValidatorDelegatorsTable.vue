<script setup>
/** UI */
import Spinner from "@/components/ui/Spinner.vue"

/** Components */
import CopyButton from "@/components/CopyButton.vue"

/** Services */
import { fetchValidatorDelegators } from "@/services/api/validator"
import { shortHex } from "@/services/utils"

const props = defineProps({
	precompileId: {
		type: [String, Number],
		required: true,
	},
})

// State for delegators data
const delegatorsData = ref(null)
const isLoading = ref(true)
const error = ref(null)
const hasMore = ref(false)
const currentPage = ref(1)

// Fetch delegators data
const loadDelegators = async (loadMore = false) => {
	try {
		if (!loadMore) {
			isLoading.value = true
			error.value = null
		}

		const options = {
			maxPages: 1,
			fetchAll: false,
		}

		// If loading more pages, use the nextDelegator from pagination
		if (loadMore && delegatorsData.value?.pagination?.nextDelegator) {
			options.startDelegator = delegatorsData.value.pagination.nextDelegator
		}

		const { data } = await fetchValidatorDelegators(props.precompileId, options)
		
		if (data.value) {
			if (loadMore && delegatorsData.value) {
				// Append new delegators to existing list
				delegatorsData.value.delegators = [
					...delegatorsData.value.delegators,
					...data.value.delegators
				]
				delegatorsData.value.pagination = data.value.pagination
			} else {
				// Set initial data
				delegatorsData.value = data.value
			}
			
			// Check if there are more pages to load
			hasMore.value = !data.value.pagination.isDone && data.value.pagination.nextDelegator !== null
		}
	} catch (err) {
		error.value = err.message || 'Failed to load delegators'
	} finally {
		isLoading.value = false
	}
}

// Load more delegators
const loadMoreDelegators = async () => {
	if (hasMore.value && !isLoading.value) {
		currentPage.value += 1
		await loadDelegators(true)
	}
}

	// Load initial data
	onMounted(() => {
		if (props.precompileId) {
			loadDelegators()
		}
	})

	// Watch for precompileId changes
	watch(() => props.precompileId, (newId, oldId) => {
		if (newId && newId !== oldId) {
			delegatorsData.value = null
			currentPage.value = 1
			hasMore.value = false
			loadDelegators()
		}
	})

const delegatorCount = computed(() => {
	return delegatorsData.value?.delegators?.length || 0
})

const formattedTimestamp = computed(() => {
	if (!delegatorsData.value?.timestamp) return 'N/A'
	
	const date = new Date(delegatorsData.value.timestamp)
	return date.toLocaleString()
})
</script>

<template>
	<Flex direction="column" gap="16" :class="$style.container">
		<!-- Header with count and timestamp -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex direction="column" gap="4">
				<Text size="13" weight="600" color="primary">Delegators</Text>
				<Text v-if="delegatorCount > 0" size="11" weight="500" color="tertiary">
					{{ delegatorCount }} delegator{{ delegatorCount !== 1 ? 's' : '' }} found
				</Text>
			</Flex>
			<Text v-if="delegatorsData?.timestamp" size="10" weight="500" color="tertiary">
				Updated: {{ formattedTimestamp }}
			</Text>
		</Flex>

		<!-- Loading state -->
		<Flex v-if="isLoading && !delegatorsData" direction="column" gap="16" align="center" :class="$style.loading">
			<Spinner size="24" />
			<Text size="12" weight="500" color="secondary">Loading delegators...</Text>
		</Flex>

		<!-- Error state -->
		<Flex v-else-if="error" direction="column" gap="12" align="center" :class="$style.error">
			<Icon name="warning" size="24" color="red" />
			<Text size="12" weight="500" color="red">{{ error }}</Text>
			<button @click="loadDelegators" :class="$style.retry_button">
				<Text size="11" weight="600" color="brand">Retry</Text>
			</button>
		</Flex>

		<!-- Empty state -->
		<Flex v-else-if="!delegatorsData || delegatorCount === 0" direction="column" gap="12" align="center" :class="$style.empty">
			<Icon name="granters" size="24" color="tertiary" />
			<Text size="12" weight="500" color="tertiary">No delegators</Text>
		</Flex>

		<!-- Delegators list -->
		<template v-else-if="delegatorsData?.delegators?.length > 0">
			<Flex direction="column" gap="8" :class="$style.delegators_list">
				<div
					v-for="(delegator, index) in delegatorsData.delegators"
					:key="delegator"
					:class="$style.delegator_item"
				>
					<Flex align="center" justify="between" gap="12">
						<Flex align="center" gap="8" wide>
							<Text size="11" weight="500" color="tertiary" :class="$style.index">
								{{ index + 1 }}
							</Text>
							<NuxtLink :to="`/address/${delegator}`" :class="$style.delegator_link">
								<Text size="12" weight="600" color="brand" mono>
									{{ shortHex(delegator) }}
								</Text>
							</NuxtLink>
						</Flex>
						<CopyButton :text="delegator" size="12" />
					</Flex>
				</div>
			</Flex>

			<!-- Load more button -->
			<Flex v-if="hasMore" justify="center" :class="$style.load_more_section">
				<button 
					@click="loadMoreDelegators" 
					:disabled="isLoading"
					:class="$style.load_more_button"
				>
					<Spinner v-if="isLoading" size="14" />
					<Icon v-else name="chevron-down" size="14" color="brand" />
					<Text size="11" weight="600" color="brand">
						{{ isLoading ? 'Loading...' : 'Load More' }}
					</Text>
				</button>
			</Flex>

			<!-- Pagination info -->
			<Flex v-if="delegatorsData?.pagination" justify="center" :class="$style.pagination_info">
				<Text size="10" weight="500" color="tertiary">
					Page {{ delegatorsData.pagination.pagesFetched }} of {{ delegatorsData.pagination.maxPages }}
					{{ delegatorsData.pagination.isDone ? '(Complete)' : '' }}
				</Text>
			</Flex>
		</template>
	</Flex>
</template>

<style module>
.container {
	min-height: 200px;
}

.header {
	padding: 12px 0;
	border-bottom: 1px solid var(--op-8);
}

.loading,
.error,
.empty {
	padding: 40px 20px;
	text-align: center;
}

.retry_button {
	background: none;
	border: 1px solid var(--brand);
	border-radius: 6px;
	padding: 6px 12px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.retry_button:hover {
	background: var(--brand);
	color: white;
}

.delegators_list {
	max-height: 400px;
	overflow-y: auto;
}

.delegator_item {
	padding: 12px;
	border: 1px solid var(--op-8);
	border-radius: 6px;
	background: var(--op-3);
	transition: all 0.2s ease;
}

.delegator_item:hover {
	background: var(--op-5);
	border-color: var(--op-12);
}

.index {
	min-width: 24px;
	text-align: center;
}

.load_more_section {
	padding: 16px 0;
}

.load_more_button {
	display: flex;
	align-items: center;
	gap: 6px;
	background: none;
	border: 1px solid var(--brand);
	border-radius: 6px;
	padding: 8px 16px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.load_more_button:hover:not(:disabled) {
	background: var(--brand);
	color: white;
}

.load_more_button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.pagination_info {
	padding: 8px 0;
}

.delegator_link {
	text-decoration: none;
	transition: all 0.2s ease;
}

.delegator_link:hover {
	opacity: 0.8;
}

@media (max-width: 768px) {
	.delegator_item {
		padding: 8px;
	}
	
	.delegators_list {
		max-height: 300px;
	}
	
	.header {
		flex-direction: column;
		gap: 8px;
		align-items: flex-start;
	}
}
</style>
