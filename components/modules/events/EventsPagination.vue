<script setup>
/** UI */
import Button from "@/components/ui/Tooltip.vue"

const props = defineProps({
	/**
	 * Current page number (1-indexed)
	 */
	currentPage: {
		type: Number,
		required: true,
	},
	/**
	 * Total number of pages
	 */
	totalPages: {
		type: Number,
		required: true,
	},
})

const emit = defineEmits(['update:page', 'first', 'prev', 'next', 'last'])

const handleFirst = () => {
	emit('first')
	emit('update:page', 1)
}

const handlePrev = () => {
	if (props.currentPage === 1) return
	emit('prev')
	emit('update:page', props.currentPage - 1)
}

const handleNext = () => {
	if (props.currentPage === props.totalPages) return
	emit('next')
	emit('update:page', props.currentPage + 1)
}

const handleLast = () => {
	emit('last')
	emit('update:page', props.totalPages)
}
</script>

<template>
	<Flex v-if="totalPages > 1" align="center" gap="6" :class="$style.pagination">
		<Button @click="handleFirst" type="secondary" size="mini" :disabled="currentPage === 1">
			<Icon name="arrow-left-stop" size="12" color="primary" />
		</Button>
		<Button type="secondary" @click="handlePrev" size="mini" :disabled="currentPage === 1">
			<Icon name="arrow-left" size="12" color="primary" />
		</Button>

		<Button type="secondary" size="mini" disabled>
			<Text size="12" weight="600" color="primary"> {{ currentPage }} of {{ totalPages }} </Text>
		</Button>

		<Button @click="handleNext" type="secondary" size="mini" :disabled="currentPage === totalPages">
			<Icon name="arrow-right" size="12" color="primary" />
		</Button>
		<Button @click="handleLast" type="secondary" size="mini" :disabled="currentPage === totalPages">
			<Icon name="arrow-right-stop" size="12" color="primary" />
		</Button>
	</Flex>
</template>

<style module>
.pagination {
	padding: 0 16px 16px 16px;
}
</style>
