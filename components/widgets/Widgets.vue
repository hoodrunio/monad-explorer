<script setup>
/** Components: Widgets */
import ValidatorEventsWidget from "./ValidatorEventsWidget.vue"
import GeographicDistributionWidget from "./GeographicDistributionWidget.vue"
import EpochWidget from "./EpochWidget.vue"
import RecentBlocksWidget from "./RecentBlocksWidget.vue"
import RecentTransactionsWidget from "./RecentTransactionsWidget.vue"
import GasWidget from "./GasWidget.vue"
import TransactionsWidget from "./TransactionsWidget.vue"
import TpsWidget from "./TpsWidget.vue"
import PriceChartWidget from "./PriceChartWidget.vue"
import NetworkStatsWidget from "./NetworkStatsWidget.vue"
</script>

<template>
	<Flex direction="column" gap="20" :class="$style.wrapper">
		<!-- Section 1: Epoch, Transactions & Gas -->
		<div :class="$style.analytics_grid">
			<EpochWidget :class="$style.epoch_widget_tall" />
			<TransactionsWidget :class="$style.transactions_widget" />
			<GasWidget :class="$style.gas_widget" />
		</div>

		<!-- Section 2: Price Chart & Network Stats (Compact) -->
		<Flex gap="20" :class="$style.section">
			<PriceChartWidget :class="$style.equal_widget" />
			<NetworkStatsWidget :class="$style.equal_widget" />
		</Flex>

		<!-- Section 3: Network TPS -->
		<Flex gap="20" :class="$style.section">
			<TpsWidget :class="$style.stats_widget_full" />
		</Flex>

		<!-- Section 4: Validator Analysis & Recent Data -->
		<Flex gap="20" :class="$style.section">
			<GeographicDistributionWidget :class="$style.equal_widget" />
			<ValidatorEventsWidget :class="$style.equal_widget" />
		</Flex>

		<!-- Section 5: Recent Blocks & Transactions -->
		<Flex gap="20" :class="$style.section">
			<RecentBlocksWidget :class="$style.recent_widget" />
			<RecentTransactionsWidget :class="$style.recent_widget" />
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

.analytics_grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	grid-template-rows: 1fr auto;
	gap: 20px;
	width: 100%;
	min-height: 200px;
}

.epoch_widget_tall {
	grid-row: 1 / 3;
	grid-column: 1;
	min-height: 200px;
}

.transactions_widget {
	grid-row: 1;
	grid-column: 2;
	min-height: 164px;
}

.gas_widget {
	grid-row: 2;
	grid-column: 2;
	min-height: 80px;
}

.stats_widget_full {
	width: 100%;
	min-width: 280px;
}

.equal_widget {
	flex: 1;
	min-width: 368px;
}

.recent_widget {
	flex: 1;
	min-width: 400px;
}

@media (max-width: 1100px) {
	.analytics_grid {
		grid-template-columns: 1fr;
		grid-template-rows: auto auto auto;
		min-height: auto;
	}

	.epoch_widget_tall {
		grid-row: 1;
		grid-column: 1;
		min-height: auto;
	}

	.transactions_widget {
		grid-row: 2;
		grid-column: 1;
	}

	.gas_widget {
		grid-row: 3;
		grid-column: 1;
	}

	.section {
		flex-direction: column;
	}
}

@media (max-width: 500px) {
	.epoch_widget_tall,
	.transactions_widget,
	.gas_widget,
	.stats_widget_full,
	.equal_widget,
	.events_widget,
	.recent_widget {
		min-width: initial;
		min-height: auto;
	}
}
</style>
