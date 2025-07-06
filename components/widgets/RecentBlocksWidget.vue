<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

/** Services */
import { comma, formatBytes } from "@/services/utils"

/** API */
import { fetchBlocks } from "@/services/api/block"

const blocks = ref([])
const isLoading = ref(true)
const isRefreshing = ref(false)

// Ensure blocks is always an array
watch(blocks, (newBlocks) => {
	if (!Array.isArray(newBlocks)) {
		blocks.value = []
	}
}, { immediate: true })

const formatGasValue = (value) => {
	if (!value) return "0"
	return comma(value)
}

const getGasUsagePercent = (gasUsed, gasLimit) => {
	if (!gasUsed || !gasLimit || gasLimit === "0") return 0
	const used = parseInt(gasUsed) || 0
	const limit = parseInt(gasLimit) || 1
	return (used / limit) * 100
}

const getBlocks = async (isInitial = false) => {
	if (isInitial) {
		isLoading.value = true
		isRefreshing.value = false
	} else {
		isRefreshing.value = true
		isLoading.value = false
	}
	
	try {
		const { data } = await fetchBlocks({ limit: 10 })
		const response = data?.value?.data
		const newBlocks = Array.isArray(response?.blocks) ? response.blocks : []
		
		// Add a small delay for smooth transition
		if (!isInitial && blocks.value.length > 0) {
			await new Promise(resolve => setTimeout(resolve, 100))
		}
		
		blocks.value = newBlocks
	} catch (error) {
		console.error("Error fetching recent blocks:", error)
		if (isInitial) {
			blocks.value = []
		}
	}
	
	isLoading.value = false
	isRefreshing.value = false
}

// Initial data fetch
let refreshInterval = null

onMounted(async () => {
	await getBlocks(true)
	
	// Refresh every 5 seconds
	refreshInterval = setInterval(() => getBlocks(false), 5000)
})

onUnmounted(() => {
	if (refreshInterval) {
		clearInterval(refreshInterval)
		refreshInterval = null
	}
})
</script>

<template>
	<Flex direction="column" gap="16" :class="$style.wrapper">
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="block" size="16" color="primary" />
				<Text size="16" weight="600" color="primary">Recent Blocks</Text>
				<div v-if="isRefreshing" :class="$style.refresh_indicator">
					<Icon name="refresh" size="12" color="secondary" :class="$style.spinning" />
				</div>
			</Flex>
			
			<NuxtLink to="/blocks">
				<Flex align="center" gap="4" :class="$style.view_all">
					<Text size="12" weight="600" color="secondary">View All</Text>
					<Icon name="chevron" size="12" color="secondary" style="transform: rotate(-90deg)" />
				</Flex>
			</NuxtLink>
		</Flex>

		<div v-if="isLoading" :class="$style.loading">
			<Text size="13" weight="600" color="tertiary">Loading recent blocks...</Text>
		</div>

		<div v-else-if="blocks && blocks.length" :class="[$style.table_wrapper, isRefreshing && $style.refreshing]">
			<transition name="fade" mode="out-in">
				<table :key="blocks.length" :class="$style.table">
					<thead>
						<tr>
							<th><Text size="12" weight="600" color="tertiary">Block</Text></th>
							<th><Text size="12" weight="600" color="tertiary">Time</Text></th>
							<th><Text size="12" weight="600" color="tertiary">Txs</Text></th>
							<th><Text size="12" weight="600" color="tertiary">Gas Used</Text></th>
							<th><Text size="12" weight="600" color="tertiary">Size</Text></th>
						</tr>
					</thead>

					<transition-group name="list-item" tag="tbody">
						<tr v-for="(block, index) in blocks" :key="block?.number || `block-${index}`">
								<td v-if="block?.number">
									<NuxtLink :to="`/block/${block.number}`">
										<Flex align="center" gap="6">
											<Icon name="block" size="14" color="primary" />
											<Text size="13" weight="600" color="primary" tabular>{{ comma(block.number) }}</Text>
										</Flex>
									</NuxtLink>
								</td>
								<td v-if="block?.timestamp">
									<NuxtLink :to="`/block/${block.number}`">
										<Tooltip position="start" delay="500">
											<Text size="12" weight="600" color="primary">
												{{ DateTime.fromISO(block.timestamp).toRelative({ locale: "en", style: "short" }) }}
											</Text>

											<template #content>
												{{ DateTime.fromISO(block.timestamp).setLocale("en").toFormat("LLL d, t") }}
											</template>
										</Tooltip>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/block/${block?.number || '#'}`">
										<Text size="13" weight="600" color="primary">
											{{ comma(block?.transactionCount || 0) }}
										</Text>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/block/${block?.number || '#'}`">
										<Flex align="center" gap="4">
											<Text size="13" weight="600" color="primary">
												{{ getGasUsagePercent(block?.gasUsed, block?.gasLimit).toFixed(1) }}%
											</Text>
											<Text size="12" weight="600" color="tertiary">
												({{ formatGasValue(block?.gasUsed) }})
											</Text>
										</Flex>
									</NuxtLink>
								</td>
								<td>
									<NuxtLink :to="`/block/${block?.number || '#'}`">
										<Text size="13" weight="600" color="primary">
											{{ formatBytes(block?.size || 0, 0) }}
										</Text>
									</NuxtLink>
								</td>
							</tr>
						</transition-group>
				</table>
			</transition>
		</div>

		<div v-else :class="$style.empty">
			<Text size="13" weight="600" color="tertiary">No recent blocks found</Text>
		</div>
	</Flex>
</template>

<style module>
.wrapper {
	background: var(--card-background);
	border-radius: 8px;
	padding: 16px;
	min-height: 400px;
}

.header {
	padding-bottom: 8px;
	border-bottom: 1px solid var(--op-5);
}

.view_all {
	cursor: pointer;
	transition: all 0.1s ease;
	padding: 4px 8px;
	border-radius: 4px;
}

.view_all:hover {
	background: var(--op-5);
}

.loading,
.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	min-height: 200px;
}

.table_wrapper {
	width: 100%;
	overflow-x: auto;
}

.table {
	width: 100%;
	border-spacing: 0;
	
	& thead th {
		text-align: left;
		padding: 8px 12px;
		border-bottom: 1px solid var(--op-5);
		
		&:first-child {
			padding-left: 0;
		}
		
		&:last-child {
			padding-right: 0;
		}
	}
	
	& tbody {
		& tr {
			cursor: pointer;
			transition: all 0.05s ease;
			
			&:hover {
				background: var(--op-3);
			}
			
			&:active {
				background: var(--op-5);
			}
		}
		
		& td {
			padding: 12px 12px;
			white-space: nowrap;
			border-bottom: 1px solid var(--op-3);
			
			&:first-child {
				padding-left: 0;
			}
			
			&:last-child {
				padding-right: 0;
			}
			
			& > a {
				display: flex;
				align-items: center;
				width: 100%;
				color: inherit;
				text-decoration: none;
			}
		}
	}
}

/* Refresh indicator */
.refresh_indicator {
	display: flex;
	align-items: center;
	justify-content: center;
}

.spinning {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

/* Table refreshing state */
.refreshing {
	opacity: 0.7;
	transition: opacity 0.3s ease;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

/* List item transitions */
.list-item-enter-active,
.list-item-leave-active {
	transition: all 0.3s ease;
}

.list-item-enter-from {
	opacity: 0;
	transform: translateY(-10px);
}

.list-item-leave-to {
	opacity: 0;
	transform: translateY(10px);
}

.list-item-move {
	transition: transform 0.3s ease;
}

@media (max-width: 768px) {
	.wrapper {
		padding: 12px;
	}
	
	.table {
		font-size: 12px;
	}
}
</style> 