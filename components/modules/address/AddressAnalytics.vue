<script setup>
import AddressCharts from "./AddressCharts.vue"

const props = defineProps({
	hash: {
		type: String,
		required: true,
	},
})

const isCollapsed = ref(false)

// Persist collapse state in localStorage
onMounted(() => {
	const saved = localStorage.getItem("addressAnalyticsCollapsed")
	if (saved !== null) {
		isCollapsed.value = saved === "true"
	}
})

watch(isCollapsed, (value) => {
	localStorage.setItem("addressAnalyticsCollapsed", value.toString())
})
</script>

<template>
	<Flex direction="column" :class="$style.wrapper">
		<!-- Header -->
		<Flex @click="isCollapsed = !isCollapsed" align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="chart" size="14" color="primary" />
				<Text size="13" weight="600" color="primary">Analytics</Text>
			</Flex>

			<Flex align="center" gap="8">
				<Text size="11" weight="500" color="tertiary">
					{{ isCollapsed ? "Show charts" : "Hide charts" }}
				</Text>
				<Icon
					name="chevron"
					size="14"
					color="tertiary"
					:style="{
						transform: `rotate(${isCollapsed ? '0' : '180'}deg)`,
						transition: 'transform 300ms ease',
					}"
				/>
			</Flex>
		</Flex>

		<!-- Charts Content -->
		<Transition name="slide">
			<Flex v-if="!isCollapsed" direction="column" :class="$style.content">
				<AddressCharts :hash="hash" />
			</Flex>
		</Transition>
	</Flex>
</template>

<style module>
.wrapper {
	border-radius: 4px;
	background: var(--card-background);
	overflow: hidden;
}

.header {
	padding: 12px 16px;
	cursor: pointer;
	border-bottom: 1px solid var(--op-5);

	&:hover {
		background: var(--op-3);
	}
}

.content {
	padding: 0;
}
</style>

<style>
.slide-enter-active,
.slide-leave-active {
	transition: all 0.3s ease;
	max-height: 500px;
	overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
	max-height: 0;
	opacity: 0;
}
</style>
