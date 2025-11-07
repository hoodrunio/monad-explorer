<script setup>
/** Composables */
import { useContractTabs, CONTRACT_TABS } from "@/composables/useContractTabs"

const props = defineProps({
	isVerified: {
		type: Boolean,
		default: false,
	},
	defaultTab: {
		type: String,
		default: CONTRACT_TABS.SOURCE,
	},
})

const emit = defineEmits(["tab-change"])

const { activeTab, availableTabs, isTabActive, setActiveTab } = useContractTabs({
	defaultTab: props.defaultTab,
	isVerified: props.isVerified,
})

/** Handle tab click */
const handleTabClick = (tabId) => {
	const success = setActiveTab(tabId)
	if (success) {
		emit("tab-change", tabId)
	}
}

/** Expose active tab for parent components */
defineExpose({
	activeTab,
	setActiveTab,
})
</script>

<template>
	<Flex direction="column" gap="0" :class="$style.wrapper">
		<!-- Tab Navigation -->
		<Flex align="center" gap="4" :class="$style.tabBar">
			<button
				v-for="tab in availableTabs"
				:key="tab.id"
				:class="[
					$style.tab,
					{ [$style.active]: isTabActive(tab.id) }
				]"
				@click="handleTabClick(tab.id)"
			>
				<Icon :name="tab.icon" size="14" />
				<Text size="13" weight="500">{{ tab.label }}</Text>

				<!-- Active Indicator -->
				<div v-if="isTabActive(tab.id)" :class="$style.activeIndicator" />
			</button>
		</Flex>

		<!-- Tab Content Slot -->
		<div :class="$style.content">
			<slot :active-tab="activeTab" />
		</div>
	</Flex>
</template>

<style module>
.wrapper {
	width: 100%;
}

.tabBar {
	background: var(--card-background);
	border: 1px solid var(--op-10);
	border-radius: 12px 12px 0 0;
	padding: 8px;
	gap: 4px;
	overflow-x: auto;
	overflow-y: hidden;
	/* Hide scrollbar but keep functionality */
	scrollbar-width: none;
	-ms-overflow-style: none;
}

.tabBar::-webkit-scrollbar {
	display: none;
}

.tab {
	position: relative;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 16px;
	background: transparent;
	border: none;
	border-radius: 8px;
	color: var(--txt-tertiary);
	fill: var(--txt-tertiary);
	cursor: pointer;
	transition: var(--transition-normal);
	white-space: nowrap;
	flex-shrink: 0;
	user-select: none;
}

.tab:hover {
	background: var(--op-05);
	color: var(--txt-secondary);
	fill: var(--txt-secondary);
}

.tab.active {
	background: var(--op-08);
	color: var(--txt-primary);
	fill: var(--brand);
}

.tab.active:hover {
	background: var(--op-10);
}

.activeIndicator {
	position: absolute;
	bottom: 0;
	left: 16px;
	right: 16px;
	height: 2px;
	background: var(--brand);
	border-radius: 2px 2px 0 0;
	animation: slideIn 0.2s ease;
}

@keyframes slideIn {
	from {
		transform: scaleX(0);
		opacity: 0;
	}
	to {
		transform: scaleX(1);
		opacity: 1;
	}
}

.content {
	background: var(--card-background);
	border: 1px solid var(--op-10);
	border-top: none;
	border-radius: 0 0 12px 12px;
	padding: 24px;
	min-height: 400px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
	.tabBar {
		padding: 6px;
		gap: 2px;
	}

	.tab {
		padding: 8px 12px;
		font-size: 12px;
	}

	.tab Icon {
		display: none; /* Hide icons on mobile to save space */
	}

	.content {
		padding: 16px;
	}

	.activeIndicator {
		left: 12px;
		right: 12px;
	}
}

/* Tablet */
@media (max-width: 1024px) and (min-width: 769px) {
	.tab {
		padding: 9px 14px;
	}
}
</style>
