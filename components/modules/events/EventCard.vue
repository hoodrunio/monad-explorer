<script setup>
/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

/** Components */
import AddressLink from "./AddressLink.vue"

/** Composables */
import { useEventIcons } from "@/composables/useEventIcons"

/** Services */
import { getEventDisplayName } from "@/services/utils"

const props = defineProps({
	/**
	 * Event object
	 */
	event: {
		type: Object,
		required: true,
	},
	/**
	 * Whether this event card is currently expanded
	 */
	isExpanded: {
		type: Boolean,
		default: false,
	},
	/**
	 * Event index in the list
	 */
	index: {
		type: Number,
		required: true,
	},
})

const emit = defineEmits(['toggle', 'view-raw'])

const { getEventIcon, getEventColor } = useEventIcons()

const handleClick = () => {
	if (props.event.decoded) {
		emit('toggle', props.index)
	} else {
		emit('view-raw', props.event)
	}
}
</script>

<template>
	<Flex
		@click="handleClick"
		align="center"
		gap="12"
		:class="[$style.event_header, isExpanded && $style.expanded]"
	>
		<Flex align="center" gap="12" :class="$style.event_header_left">
			<Flex :class="$style.icon_wrapper">
				<Icon
					:name="getEventIcon(event)"
					size="14"
					:color="getEventColor(event)"
				/>
			</Flex>

			<Flex direction="column" gap="4" :class="$style.event_info">
				<!-- Event Name -->
				<Flex align="center" gap="8">
					<Text size="13" weight="600" color="primary" mono>
						{{ getEventDisplayName(event) }}
					</Text>
					<Flex v-if="event.eventSignature" :class="$style.signature_badge">
						<Text size="11" weight="500" color="tertiary" mono>
							{{ event.eventSignature }}
						</Text>
					</Flex>
				</Flex>

				<!-- Contract Info -->
				<Flex align="center" gap="6">
					<Text size="11" weight="500" color="secondary">Contract</Text>
					<AddressLink :address="event.address" />

					<Text size="11" weight="500" color="tertiary">•</Text>
					<Text size="11" weight="500" color="secondary">Log Index</Text>
					<Text size="11" weight="500" color="primary" mono>#{{ event.logIndex }}</Text>
				</Flex>
			</Flex>
		</Flex>

		<!-- Right side actions -->
		<Flex align="center" gap="8">
			<Tooltip v-if="event.decoded && event.decoded.parameters">
				<Flex :class="$style.param_count">
					<Text size="11" weight="600" color="secondary">
						{{ event.decoded.parameters.length }} params
					</Text>
				</Flex>
				<template #content>
					{{ event.decoded.parameters.length }} decoded parameters
				</template>
			</Tooltip>

			<Icon
				v-if="event.decoded"
				name="chevron"
				size="16"
				color="secondary"
				:class="[isExpanded && $style.chevron_rotated]"
			/>
		</Flex>
	</Flex>
</template>

<style module>
.event_header {
	padding: 12px 16px;
	cursor: pointer;
	transition: background 0.2s ease;
	min-height: 60px;

	&:hover {
		background: var(--op-5);
	}

	&.expanded {
		background: var(--op-5);
		border-bottom: 1px solid var(--op-8);
	}
}

.event_header_left {
	flex: 1;
	min-width: 0;
}

.icon_wrapper {
	width: 32px;
	height: 32px;
	border-radius: 6px;
	background: var(--op-8);
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.event_info {
	flex: 1;
	min-width: 0;
}

.signature_badge {
	padding: 2px 8px;
	border-radius: 4px;
	background: var(--op-8);
	max-width: 400px;
	overflow: hidden;

	& > * {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.param_count {
	padding: 4px 8px;
	border-radius: 4px;
	background: var(--op-8);
}

.chevron_rotated {
	transform: rotate(180deg);
	transition: transform 0.2s ease;
}

@media (max-width: 800px) {
	.signature_badge {
		max-width: 200px;
	}
}

@media (max-width: 500px) {
	.event_header {
		padding: 10px 12px;
	}
}
</style>
