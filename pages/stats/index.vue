<script setup>
/** UI */
import Button from "@/components/ui/Button.vue"

/** Widgets */
import NetworkHealthWidget from "@/components/widgets/NetworkHealthWidget.vue"
import ValidatorStatsWidget from "@/components/widgets/ValidatorStatsWidget.vue"
import GeographicDistributionWidget from "@/components/widgets/GeographicDistributionWidget.vue"
import CentralizationRiskWidget from "@/components/widgets/CentralizationRiskWidget.vue"
import ValidatorEventsWidget from "@/components/widgets/ValidatorEventsWidget.vue"
import ValidatorNetworkSummary from "@/components/data/ValidatorNetworkSummary.vue"

/** Stats Components */
import MonadGeoMap from "@/components/modules/stats/MonadGeoMap.vue"
import MonadDistributionChart from "@/components/modules/stats/MonadDistributionChart.vue"

/** Services */
import { capitilize } from "@/services/utils"

useHead({
	title: "Analytics - Monad Explorer",
	meta: [
		{
			name: "description",
			content: "Monad validator network analytics. Explore network health, geographic distribution, centralization risks and validator performance metrics.",
		},
		{
			property: "og:title",
			content: "Analytics - Monad Explorer",
		},
		{
			property: "og:description",
			content: "Monad validator network analytics. Explore network health, geographic distribution, centralization risks and validator performance metrics.",
		},
		{
			name: "twitter:title",
			content: "Analytics - Monad Explorer",
		},
		{
			name: "twitter:description",
			content: "Monad validator network analytics. Explore network health, geographic distribution, centralization risks and validator performance metrics.",
		},
		{
			name: "twitter:card",
			content: "summary_large_image",
		},
	],
})

const route = useRoute()
const router = useRouter()

const tabs = ref([
	{
		name: "network",
		visible: true,
	},
	{
		name: "validators",
		visible: true,
	},
	{
		name: "geographic",
		visible: true,
	},
	{
		name: "ecosystem",
		visible: true,
	},
])

const activeTab = ref(
	route.query.tab &&
		tabs.value
			.filter((t) => t.visible)
			.map((t) => t.name)
			.includes(route.query.tab)
		? route.query.tab
		: tabs.value[0].name,
)

const updateRouteQuery = () => {
	router.replace({
		query: {
			tab: activeTab.value,
		},
	})
}

onMounted(() => {
	updateRouteQuery()
})

watch(
	() => activeTab.value,
	() => {
		updateRouteQuery()
	},
)

watch(
	() => route.query,
	() => {
		if (route.query.tab) activeTab.value = route.query.tab
	},
)
</script>

<template>
	<Flex direction="column" gap="12" wide :class="$style.wrapper">
		<Breadcrumbs
			:items="[
				{ link: '/', name: 'Dashboard' },
				{ link: '/stats', name: `Analytics` },
			]"
			:class="$style.breadcrumbs"
		/>

		<Flex align="center" gap="8" :class="$style.header">
			<Icon name="bar-chart" size="16" color="secondary" />
			<Text size="16" weight="600" color="primary">Monad Network Analytics</Text>
		</Flex>

		<Flex align="center" justify="between" wide :class="$style.tabs_wrapper">
			<Flex align="center" gap="16">
				<Text
					v-for="t in tabs.filter((t) => t.visible)"
					@click="activeTab = t.name"
					size="14"
					color="tertiary"
					:class="[$style.tab, activeTab === t.name && $style.tab_active]"
				>
					{{ capitilize(t.name) }}
				</Text>
			</Flex>

			<Flex v-if="activeTab === 'validators'" align="start" :class="$style.actions">
				<Button link="/validators" type="secondary" size="mini">
					<Icon name="validator" size="12" color="secondary" />
					All Validators
				</Button>
			</Flex>
		</Flex>

		<!-- Network Overview Tab -->
		<Flex v-if="activeTab === 'network'" direction="column" gap="20">
			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Network Health Overview</Text>
				<Flex gap="16" :class="$style.grid_2">
					<NetworkHealthWidget />
					<ValidatorStatsWidget />
				</Flex>
			</Flex>

			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Network Security</Text>
				<Flex gap="16" :class="$style.grid_2">
					<CentralizationRiskWidget />
					<ValidatorEventsWidget />
				</Flex>
			</Flex>
		</Flex>

		<!-- Validators Performance Tab -->
		<Flex v-if="activeTab === 'validators'" direction="column" gap="20">
			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Validator Performance</Text>
				<ValidatorNetworkSummary />
			</Flex>

			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Network Events</Text>
				<ValidatorEventsWidget />
			</Flex>
		</Flex>

		<!-- Geographic Distribution Tab -->
		<Flex v-if="activeTab === 'geographic'" direction="column" gap="20">
			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Geographic Distribution</Text>
				<Flex gap="16" :class="$style.grid_2">
					<GeographicDistributionWidget />
					<CentralizationRiskWidget />
				</Flex>
			</Flex>

			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Network Diversity</Text>
				<ValidatorNetworkSummary />
			</Flex>
		</Flex>

		<!-- Ecosystem Tab -->
		<Flex v-if="activeTab === 'ecosystem'" direction="column" gap="20">
			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Monad Validator Network Distribution</Text>
				<MonadGeoMap :class="$style.chart" />
			</Flex>

			<Flex direction="column" gap="16">
				<Text size="14" weight="600" color="primary">Infrastructure Analysis</Text>
				<Flex gap="16" :class="$style.grid_2">
					<MonadDistributionChart type="provider" />
					<MonadDistributionChart type="geographic" />
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	max-width: calc(var(--base-width) + 48px);
	padding: 20px 24px 60px 24px;
}

.breadcrumbs {
	margin-bottom: 16px;
}

.header {
	margin-bottom: 16px;
}

.tabs_wrapper {
	position: relative;
}

.tabs_wrapper::after {
	content: "";
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 2px;
	background-color: var(--op-5);
}

.tab {
	padding-bottom: 12px;
	cursor: pointer;
}

.tab_active {
	color: var(--txt-primary);
	border-bottom: solid 3px var(--txt-primary);
}

.actions {
	transform: translateY(-8px);
}

.grid_2 {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16px;
}

.chart {
	width: 100%;
	max-width: 1000px;
	aspect-ratio: 16 / 10;
}

@media (max-width: 768px) {
	.wrapper {
		padding: 32px 12px;
	}

	.grid_2 {
		grid-template-columns: 1fr;
	}

	.header {
		gap: 16px;
		height: initial;
		padding: 16px;
	}
}
</style> 