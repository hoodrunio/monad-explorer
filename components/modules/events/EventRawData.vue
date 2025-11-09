<script setup>
/** UI */
import Button from "@/components/ui/Button.vue"

/** Composables */
import { useEventActions } from "@/composables/useEventActions"

const props = defineProps({
	/**
	 * Event topics array
	 */
	topics: {
		type: Array,
		default: () => [],
	},
	/**
	 * Event data (hex string)
	 */
	data: {
		type: String,
		default: '',
	},
	/**
	 * Full event object (for viewing JSON)
	 */
	event: {
		type: Object,
		required: true,
	},
})

const emit = defineEmits(['view-json'])

const { copyToClipboard } = useEventActions()

const handleViewJson = () => {
	emit('view-json', props.event)
}
</script>

<template>
	<Flex direction="column" gap="8" :class="$style.raw_section">
		<Flex align="center" justify="between">
			<Text size="12" weight="600" color="primary">Raw Event Data</Text>
			<Flex align="center" gap="6">
				<Button
					@click.stop="copyToClipboard(JSON.stringify(topics))"
					type="secondary"
					size="mini"
				>
					<Icon name="copy" size="12" color="secondary" />
					<Text size="11" weight="500" color="secondary">Copy Topics</Text>
				</Button>
				<Button
					@click.stop="copyToClipboard(data)"
					type="secondary"
					size="mini"
				>
					<Icon name="copy" size="12" color="secondary" />
					<Text size="11" weight="500" color="secondary">Copy Data</Text>
				</Button>
				<Button
					@click.stop="handleViewJson"
					type="secondary"
					size="mini"
				>
					<Icon name="explorable" size="12" color="secondary" />
					<Text size="11" weight="500" color="secondary">View JSON</Text>
				</Button>
			</Flex>
		</Flex>

		<!-- Topics -->
		<Flex direction="column" gap="4">
			<Text size="11" weight="600" color="secondary">Topics ({{ topics?.length || 0 }})</Text>
			<Flex direction="column" gap="2" :class="$style.topics_list">
				<Flex
					v-for="(topic, topicIdx) in topics"
					:key="topicIdx"
					align="center"
					gap="8"
					:class="$style.topic_item"
				>
					<Text size="10" weight="600" color="tertiary" :class="$style.topic_index">{{ topicIdx }}</Text>
					<Text size="11" weight="500" color="primary" mono :class="$style.topic_value">{{ topic }}</Text>
				</Flex>
			</Flex>
		</Flex>

		<!-- Data -->
		<Flex direction="column" gap="4">
			<Text size="11" weight="600" color="secondary">Data</Text>
			<Flex :class="$style.data_hex">
				<Text size="11" weight="500" color="primary" mono>{{ data || '0x' }}</Text>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.raw_section {
	padding: 12px;
	border-radius: 6px;
	background: var(--card-background);
	border: 1px solid var(--op-8);
}

.topics_list {
	max-height: 200px;
	overflow-y: auto;
}

.topic_item {
	padding: 6px 8px;
	border-radius: 4px;
	background: var(--op-5);
}

.topic_index {
	flex: 0 0 20px;
	padding: 2px 6px;
	border-radius: 3px;
	background: var(--op-10);
	text-align: center;
}

.topic_value {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.data_hex {
	padding: 8px 12px;
	border-radius: 4px;
	background: var(--op-5);
	overflow-x: auto;

	& > * {
		word-break: break-all;
	}
}
</style>
