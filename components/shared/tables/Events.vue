<script setup>
/** Components */
import EventCard from "@/components/modules/events/EventCard.vue"
import EventParametersTable from "@/components/modules/events/EventParametersTable.vue"
import EventRawData from "@/components/modules/events/EventRawData.vue"
import EventsPagination from "@/components/modules/events/EventsPagination.vue"

/** Composables */
import { useEventActions } from "@/composables/useEventActions"
import { useEventPagination } from "@/composables/useEventPagination"

/** Services */
import { hasDecodedData } from "@/services/utils"

const props = defineProps({
	block: {
		type: Object,
	},
	tx: {
		type: Object,
	},
})

const isLoading = ref(false)
const events = ref([])
const totalEventsCount = ref(0)

// Use composables
const {
	expandedEventIndex,
	handleViewRawEvent,
	toggleEventExpanded,
	resetExpansion,
} = useEventActions()

const {
	page,
	pages,
	handleNext,
	handlePrev,
	handleFirst,
	handleLast,
} = useEventPagination(props, 10)

/**
 * Fetch and paginate events
 */
const getEvents = async () => {
	isLoading.value = true

	try {
		if (props.block) {
			// Logs are only available at transaction level
			events.value = []
			totalEventsCount.value = 0
		} else if (props.tx) {
			// For EVM transactions, use decodedLogs directly from tx data
			const startIndex = (page.value - 1) * 10
			const endIndex = startIndex + 10
			const decodedLogs = props.tx.decodedLogs || []
			events.value = decodedLogs.slice(startIndex, endIndex)
			totalEventsCount.value = decodedLogs.length
		}
	} catch (error) {
		events.value = []
	}

	isLoading.value = false
}

onMounted(() => {
	getEvents()
})

/** Refetch events when page changes */
watch(
	() => page.value,
	() => {
		getEvents()
		resetExpansion()
	},
)
</script>

<template>
	<Flex direction="column" justify="between" :class="$style.data">
		<Flex direction="column" :class="[$style.inner, $style.events]">
			<!-- Event Cards -->
			<Flex
				v-if="events.length"
				v-for="(event, idx) in events"
				:key="idx"
				direction="column"
				:class="$style.event_card"
			>
				<!-- Event Card Header -->
				<EventCard
					:event="event"
					:isExpanded="expandedEventIndex === idx"
					:index="idx"
					@toggle="toggleEventExpanded"
					@view-raw="handleViewRawEvent"
				/>

				<!-- Expanded Content (for decoded events) -->
				<Flex
					v-if="expandedEventIndex === idx && hasDecodedData(event)"
					direction="column"
					:class="$style.event_expanded"
				>
					<!-- Parameters Table -->
					<EventParametersTable :parameters="event.decoded.parameters" />

					<!-- Raw Data Section -->
					<EventRawData
						:topics="event.topics"
						:data="event.data"
						:event="event"
						@view-json="handleViewRawEvent"
					/>
				</Flex>
			</Flex>

			<!-- Empty State -->
			<Flex v-else direction="column" align="center" justify="center" gap="8" :class="$style.empty">
				<Icon name="zap" size="24" color="tertiary" />
				<Text size="12" weight="500" height="160" color="tertiary" align="center" style="max-width: 220px">
					No events found for this transaction.
				</Text>
			</Flex>
		</Flex>

		<!-- Pagination -->
		<EventsPagination
			:currentPage="page"
			:totalPages="pages"
			@update:page="(newPage) => page = newPage"
			@first="handleFirst"
			@prev="handlePrev"
			@next="handleNext"
			@last="handleLast"
		/>
	</Flex>
</template>

<style module>
.data {
	min-width: 100%;
	height: 100%;

	overflow-x: auto;

	background: var(--card-background);
}

.inner {
	height: 100%;

	border-radius: 4px 4px 8px 4px;
	background: var(--card-background);
}

.events {
	padding: 16px;
	gap: 8px;
}

/* Event Card Styles */
.event_card {
	border-radius: 6px;
	border: 1px solid var(--op-5);
	background: var(--card-background);
	overflow: hidden;
	transition: all 0.2s ease;

	&:hover {
		border-color: var(--op-8);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
}

.event_expanded {
	padding: 16px;
	background: var(--op-5);
	border-top: 1px solid var(--op-8);
	gap: 16px;
}

.empty {
	flex: 1;
	padding: 32px 0;
}

@media (max-width: 800px) {
	.data {
		max-width: initial;
		min-width: 0;

		border-radius: 4px;
	}
}

@media (max-width: 500px) {
	.events {
		padding: 12px;
	}

	.event_expanded {
		padding: 12px;
	}
}
</style>
