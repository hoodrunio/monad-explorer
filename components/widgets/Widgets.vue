<script setup>
/** Services */
import { getNetworkName } from "@/services/utils/general"

/** Components: Widgets */
import NetworkHealthWidget from "./NetworkHealthWidget.vue"
import ValidatorStatsWidget from "./ValidatorStatsWidget.vue"
import ValidatorEventsWidget from "./ValidatorEventsWidget.vue"
import GeographicDistributionWidget from "./GeographicDistributionWidget.vue"
import CentralizationRiskWidget from "./CentralizationRiskWidget.vue"

const tablet = ref(false)

onBeforeMount(() => {
	if (window.innerWidth < 1100) {
		tablet.value = true
	}
})
</script>

<template>
	<Flex direction="column" gap="20" :class="$style.wrapper">
		<!-- Section 1: Network Overview -->
		<Flex gap="20" :class="$style.section">
			<NetworkHealthWidget :class="$style.network_widget" />
			<ValidatorStatsWidget :class="$style.stats_widget" />
		</Flex>

		<!-- Section 2: Validator Analysis & Risk -->
		<Flex gap="20" :class="$style.section">
			<Flex direction="column" gap="20" wide :class="$style.column">
				<GeographicDistributionWidget />
				<CentralizationRiskWidget />
			</Flex>
			
			<ValidatorEventsWidget :class="$style.events_widget" />
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	max-width: 100%;
}

.section {
	width: 100%;
}

.column {
	min-width: 368px;
}

.network_widget {
	flex: 1;
	min-width: 300px;
}

.stats_widget {
	flex: 1;
	min-width: 300px;
}

.events_widget {
	min-width: 368px;
	flex: 1;
}

@media (max-width: 1100px) {
	.section {
		flex-direction: column;
	}
	
	.column {
		min-width: initial;
	}
}

@media (max-width: 500px) {
	.network_widget,
	.stats_widget,
	.events_widget {
		min-width: initial;
	}
}
</style>
