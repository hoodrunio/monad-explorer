<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** UI */
import Button from "@/components/ui/Button.vue"
import Tooltip from "@/components/ui/Tooltip.vue"
import Checkbox from "@/components/ui/Checkbox.vue"

/** Services */
import { shortHex } from "@/services/utils"

/** API */
import { fetchEventSearch } from "@/services/api/main"

const props = defineProps({
	validatorId: {
		type: String,
		required: true,
	},
})

const isLoading = ref(true)
const events = ref([])
const page = ref(1)
const limit = ref(20)
const totalEvents = ref(0)
const totalPages = computed(() => Math.ceil(totalEvents.value / limit.value))

// Filter options
const filters = ref({
	block_proposal: true,
	block_skipped: true,
	qc_participation: false,
})

const activeFilters = computed(() => {
	return Object.keys(filters.value).filter(key => filters.value[key])
})

const getEventName = (type) => {
	switch (type) {
		case 'block_proposal': return 'Proposed Block'
		case 'block_skipped': return 'Skipped Block'
		case 'qc_participation': return 'Quorum (QC) Participation'
	}
}

const getEventIcon = (type, event = null) => {
	switch (type) {
		case 'block_proposal': return 'zap'
		case 'block_skipped': return 'close-circle'
		case 'qc_participation': return event?.details?.participated ? 'check-circle' : 'close-circle'
		case 'validator_joined': return 'plus-circle'
		case 'validator_left': return 'minus-circle'
		case 'performance_warning': return 'warning'
		case 'validator_slashed': return 'shield-alert'
		case 'consensus_failure': return 'close'
		default: return 'info'
	}
}

const getEventColor = (type, event = null) => {
	switch (type) {
		case 'block_proposal': return 'green'
		case 'block_skipped': return 'red'
		case 'qc_participation': return event?.details?.participated ? 'green' : 'red'
		case 'validator_joined': return 'green'
		case 'validator_left': return 'yellow'
		case 'performance_warning': return 'yellow'
		case 'validator_slashed': return 'red'
		case 'consensus_failure': return 'red'
		default: return 'tertiary'
	}
}

const getEventDescription = (event) => {
	switch (event.event_type) {
		case 'block_proposal':
			return event.details?.status === 'proposed' ? 'Proposed' : 'Attempted'
		case 'block_skipped':
			return 'Skipped'
		case 'qc_participation':
			return event.details?.participated ? 'Participated in Quorum' : 'Missed Quorum'
		case 'validator_joined':
			return 'Validator joined the network'
		case 'validator_left':
			return 'Validator left the network'
		case 'performance_warning':
			return 'Performance warning issued'
		case 'validator_slashed':
			return 'Validator was slashed'
		case 'consensus_failure':
			return 'Consensus participation failure'
		default:
			return event.event_type || 'Unknown event'
	}
}

const formatTime = (timestamp) => {
	try {
		// Handle different timestamp formats
		let parsedDate
		
		if (timestamp.includes('T')) {
			// ISO format: "2025-07-01T10:18:43.891Z"
			parsedDate = DateTime.fromISO(timestamp, { zone: 'utc' })
		} else {
			// SQL format: "2025-07-01 10:18:43.891"
			parsedDate = DateTime.fromSQL(timestamp, { zone: 'utc' })
		}
		
		const localDate = parsedDate.toLocal()
		
		return {
			relative: localDate.toRelative({ locale: "en", style: "short" }),
			absolute: localDate.toFormat("LLL dd, yyyy, HH:mm:ss")
		}
	} catch (error) {
		return {
			relative: 'Unknown',
			absolute: 'Unknown time'
		}
	}
}

const getEvents = async () => {
	isLoading.value = true
	
	try {
		if (activeFilters.value.length === 0) {
			events.value = []
			totalEvents.value = 0
			return
		}
		
		// Try to pass multiple event types as comma-separated string first
		const eventTypes = activeFilters.value.join(',')
		
		const { data } = await fetchEventSearch({
			validatorId: props.validatorId,
			eventType: eventTypes,
			limit: limit.value,
			offset: (page.value - 1) * limit.value
		})
		
		if (data.value?.events && Array.isArray(data.value.events)) {
			// Filter events client-side to match selected filters (in case API doesn't support comma-separated)
			const filteredEvents = data.value.events.filter(event => 
				activeFilters.value.includes(event.event_type)
			)
			
			events.value = filteredEvents
			totalEvents.value = data.value.total_count || filteredEvents.length
		} else {
			events.value = []
			totalEvents.value = 0
		}
		
	} catch (error) {
		// Fallback: If comma-separated doesn't work, make sequential calls but limit results
		try {
			const results = []
			for (const eventType of activeFilters.value) {
				const { data } = await fetchEventSearch({
					validatorId: props.validatorId,
					eventType: eventType,
					limit: Math.min(10, Math.ceil(limit.value / activeFilters.value.length)), // Limit each call
					offset: 0
				})
				
				if (data.value?.events && Array.isArray(data.value.events)) {
					results.push(...data.value.events)
				}
			}
			
			// Sort by timestamp (newest first)
			results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
			
			// Apply pagination
			const startIndex = (page.value - 1) * limit.value
			const endIndex = startIndex + limit.value
			
			events.value = results.slice(startIndex, endIndex)
			totalEvents.value = results.length
			
		} catch (fallbackError) {
			events.value = []
			totalEvents.value = 0
		}
	} finally {
		isLoading.value = false
	}
}

const onFilterChange = () => {
	page.value = 1 // Reset to first page when filters change
	getEvents()
}

const handleNext = () => {
	if (page.value >= totalPages.value) return
	page.value += 1
}

const handlePrev = () => {
	if (page.value <= 1) return
	page.value -= 1
}

// Watch page changes to refetch data
watch(() => page.value, () => {
	getEvents()
})

// Watch filter changes
watch(() => activeFilters.value, () => {
	if (activeFilters.value.length === 0) {
		events.value = []
		totalEvents.value = 0
		return
	}
	onFilterChange()
}, { deep: true })

// Initial load
onMounted(() => {
	if (activeFilters.value.length > 0) {
		getEvents()
	}
})
</script>

<template>
	<Flex direction="column" gap="16">
		<Flex align="center" justify="between">
			<Text size="13" weight="600" color="primary">Recent Events</Text>
			<Text v-if="!isLoading" size="11" weight="500" color="tertiary">
				{{ totalEvents }} total events
			</Text>
		</Flex>
		
		<!-- Event Filters -->
		<Flex direction="column" gap="12" :class="$style.filters_section">
			<Text size="12" weight="600" color="secondary">Event Filters</Text>
			<Flex align="center" gap="16" wrap :class="$style.filters_container">
				<Flex align="center" gap="8">
					<Checkbox 
						v-model="filters.block_proposal"
						@change="onFilterChange"
						:class="$style.filter_checkbox"
					/>
					<Flex align="center" gap="6">
						<Icon name="zap" size="12" color="brand" />
						<Text size="12" weight="500" color="primary">Block Proposals</Text>
					</Flex>
				</Flex>
				
				<Flex align="center" gap="8">
					<Checkbox 
						v-model="filters.block_skipped"
						@change="onFilterChange"
						:class="$style.filter_checkbox"
					/>
					<Flex align="center" gap="6">
						<Icon name="x" size="12" color="red" />
						<Text size="12" weight="500" color="primary">Block Skipped</Text>
					</Flex>
				</Flex>
				
				<Flex align="center" gap="8">
					<Checkbox 
						v-model="filters.qc_participation"
						@change="onFilterChange"
						:class="$style.filter_checkbox"
					/>
					<Flex align="center" gap="6">
						<Icon name="message" size="12" color="blue" />
						<Text size="12" weight="500" color="primary">Quorum (QC) Participation</Text>
					</Flex>
				</Flex>
			</Flex>
		</Flex>
		
		<Flex v-if="isLoading" align="center" justify="center" :class="$style.loading">
			<Text size="12" weight="500" color="tertiary">Loading events...</Text>
		</Flex>
		
		<Flex v-else-if="activeFilters.length === 0" align="center" justify="center" :class="$style.no_data">
			<Flex direction="column" align="center" gap="8">
				<Icon name="filter" size="24" color="tertiary" />
				<Text size="13" weight="600" color="secondary">No filters selected</Text>
				<Text size="12" weight="500" color="tertiary">Please select at least one event type to view</Text>
			</Flex>
		</Flex>
		
		<Flex v-else-if="events.length === 0" align="center" justify="center" :class="$style.no_data">
			<Flex direction="column" align="center" gap="8">
				<Icon name="message" size="24" color="tertiary" />
				<Text size="13" weight="600" color="secondary">No events found</Text>
				<Text size="12" weight="500" color="tertiary">No events match the selected filters</Text>
			</Flex>
		</Flex>
		
		<Flex v-else direction="column" gap="16">
			<!-- Events Table -->
			<div :class="$style.table_container">
				<div :class="$style.scrollable_wrapper">
					<table :class="$style.events_table">
					<thead>
						<tr>
							<th><Text size="12" weight="600" color="tertiary">Type</Text></th>
							<th><Text size="12" weight="600" color="tertiary">Description</Text></th>
							<th><Text size="12" weight="600" color="tertiary">Round</Text></th>
							<th><Text size="12" weight="600" color="tertiary">Time</Text></th>
						</tr>
					</thead>
					
					<tbody>
						<tr v-for="event in events" :key="`${event.event_type}-${event.round_number}-${event.timestamp}`" :class="$style.event_row">
							<td :class="$style.type_cell">
								<Flex align="center" gap="8">
																	<Icon 
									:name="getEventIcon(event.event_type, event)" 
									size="14" 
									:color="getEventColor(event.event_type, event)"
								/>
									<Text size="12" weight="600" color="primary">
										{{ getEventName(event.event_type) }}
									</Text>
								</Flex>
							</td>
							
							<td :class="$style.description_cell">
								<Text size="12" weight="500" color="secondary">
									{{ getEventDescription(event) }}
								</Text>
							</td>
							
							<td :class="$style.round_cell">
								<Text size="12" weight="600" color="tertiary" mono>
									#{{ event.round_number || 0 }}
								</Text>
							</td>
							
							<td :class="$style.time_cell">
								<Tooltip>
									<Text size="12" weight="500" color="primary">
										{{ formatTime(event.timestamp).relative }}
									</Text>
									
									<template #content>
										<Text size="12" color="primary">
											{{ formatTime(event.timestamp).absolute }}
										</Text>
									</template>
								</Tooltip>
							</td>
						</tr>
					</tbody>
					</table>
				</div>
			</div>
			
			<!-- Pagination -->
			<Flex v-if="totalPages > 1" align="center" justify="center" gap="8" :class="$style.pagination">
				<Button @click="page = 1" type="secondary" size="mini" :disabled="page === 1">
					<Icon name="arrow-left-stop" size="12" color="primary" />
				</Button>
				<Button @click="handlePrev" type="secondary" size="mini" :disabled="page === 1">
					<Icon name="arrow-left" size="12" color="primary" />
				</Button>
				
				<Text size="12" weight="600" color="secondary" :class="$style.page_info">
					Page {{ page }} of {{ totalPages }}
				</Text>
				
				<Button @click="handleNext" type="secondary" size="mini" :disabled="page >= totalPages">
					<Icon name="arrow-right" size="12" color="primary" />
				</Button>
				<Button @click="page = totalPages" type="secondary" size="mini" :disabled="page >= totalPages">
					<Icon name="arrow-right-stop" size="12" color="primary" />
				</Button>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.table_container {
	border: 1px solid var(--op-8);
	border-radius: 8px;
	background: var(--op-3);
}

.scrollable_wrapper {
	max-height: 400px;
	overflow-y: auto;
	overflow-x: auto;
}

.scrollable_wrapper::-webkit-scrollbar {
	width: 6px;
}

.scrollable_wrapper::-webkit-scrollbar-track {
	background: var(--op-3);
	border-radius: 3px;
}

.scrollable_wrapper::-webkit-scrollbar-thumb {
	background: var(--op-10);
	border-radius: 3px;
	transition: background 0.2s ease;
}

.scrollable_wrapper::-webkit-scrollbar-thumb:hover {
	background: var(--op-15);
}

.events_table {
	width: 100%;
	border-collapse: collapse;
}

.events_table th {
	text-align: left;
	padding: 12px 16px;
	border-bottom: 1px solid var(--op-8);
	background: var(--op-5);
	font-size: 12px;
	font-weight: 600;
	color: var(--txt-tertiary);
}

.events_table td {
	padding: 12px 16px;
	border-bottom: 1px solid var(--op-5);
	vertical-align: top;
}

.event_row {
	transition: background-color 0.2s ease;
}

.event_row:hover {
	background: var(--op-5);
}

.event_row:last-child td {
	border-bottom: none;
}

.type_cell {
	min-width: 150px;
	white-space: nowrap;
}

.description_cell {
	min-width: 200px;
	max-width: 300px;
}

.round_cell {
	min-width: 80px;
	white-space: nowrap;
}

.time_cell {
	min-width: 120px;
	white-space: nowrap;
}

.loading, .no_data {
	padding: 60px 20px;
	border: 1px dashed var(--op-8);
	border-radius: 8px;
	background: var(--op-3);
}

.pagination {
	padding: 16px;
}

.page_info {
	padding: 0 16px;
	min-width: 100px;
	text-align: center;
}

.filters_section {
	padding: 16px;
	border: 1px solid var(--op-8);
	border-radius: 8px;
	background: var(--op-3);
}

.filter_checkbox {
	cursor: pointer;
}

@media (max-width: 768px) {
	.events_table th,
	.events_table td {
		padding: 8px 12px;
	}
	
	.description_cell {
		max-width: 200px;
	}
	
	.filters_section {
		padding: 12px;
	}
	
	.pagination {
		padding: 12px;
	}
	
	.page_info {
		padding: 0 12px;
		min-width: 80px;
	}
}

@media (max-width: 640px) {
	.filters_section {
		padding: 12px;
	}
	
	.filters_container {
		flex-direction: column;
		gap: 12px;
		align-items: flex-start;
	}
	
	.events_table th:nth-child(3), /* Round column */
	.events_table td:nth-child(3) {
		display: none;
	}
	
	.type_cell {
		min-width: 120px;
	}
	
	.description_cell {
		max-width: 180px;
	}
	
	.time_cell {
		min-width: 100px;
	}
}

@media (max-width: 480px) {
	.type_cell {
		min-width: 100px;
	}
	
	.description_cell {
		max-width: 120px;
		min-width: 100px;
	}
	
	.time_cell {
		min-width: 80px;
	}
	
	.events_table th,
	.events_table td {
		padding: 6px 8px;
		font-size: 11px;
	}
	
	.filters_section {
		padding: 10px;
	}
	
	.pagination {
		padding: 10px;
		gap: 4px;
	}
	
	.page_info {
		padding: 0 8px;
		min-width: 60px;
		font-size: 11px;
	}
}
</style> 