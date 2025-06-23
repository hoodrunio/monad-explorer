<script setup>
/** Services */
import { getNetworkName } from "@/services/utils/general"

/** Components: Widgets */
import NetworkHealthWidget from "./NetworkHealthWidget.vue"
import ValidatorEventsWidget from "./ValidatorEventsWidget.vue"
import ValidatorStatsWidget from "./ValidatorStatsWidget.vue"
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
	<Flex gap="20" :class="$style.wrapper">
		<Flex direction="column" gap="20" wide :class="$style.column">
			<NetworkHealthWidget />
			<ValidatorEventsWidget />
		</Flex>

		<ValidatorStatsWidget :class="$style.validator_widget" />

		<Flex direction="column" gap="20" wide :class="$style.column">
			<GeographicDistributionWidget />
			<CentralizationRiskWidget />
		</Flex>
	</Flex>
</template>

<style module>
.column {
	min-width: 368px;
}

.validator_widget {
	min-width: 216px;
}

@media (max-width: 1100px) {
	.wrapper {
		flex-direction: column;
	}
}

@media (max-width: 420px) {
	.column {
		min-width: initial;
	}
}
</style>
