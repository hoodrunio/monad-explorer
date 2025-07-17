<script setup>
/** UI */
import Badge from "@/components/ui/Badge.vue"
import Button from "@/components/ui/Button.vue"

/** Components */
import CopyButton from "@/components/CopyButton.vue"
import ValidatorLogo from "@/components/ValidatorLogo.vue"

/** Services */
import { abbreviate, comma, shortHex } from "@/services/utils"

const props = defineProps({
	data: {
		type: [Array, Object],
		required: true,
	},
	showPagination: {
		type: Boolean,
		default: true,
	},
	compact: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits(['pagination'])

const validatorList = computed(() => {
	if (Array.isArray(props.data)) {
		return props.data
	}
	return props.data?.rankings || []
})

const paginationData = computed(() => {
	if (Array.isArray(props.data)) {
		return null
	}
	return props.data?.pagination || null
})

const handleValidatorClick = (validatorId) => {
	navigateTo(`/validator/${validatorId}`)
}

const formatTransactionThroughput = (value) => {
	return `${comma(value, ",", 1)} tx/h`
}

const formatEfficiency = (value) => {
	return `${comma(value, ",", 1)}`
}

const formatUtilization = (value) => {
	return `${comma(value, ",", 1)}%`
}

const getBadgeType = (rank) => {
	if (rank <= 3) return 'green'
	if (rank <= 10) return 'yellow'
	return 'secondary'
}
</script>

<template>
	<Flex direction="column" gap="0" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Text size="12" weight="600" color="tertiary">Rank</Text>
			<Text size="12" weight="600" color="tertiary">Validator</Text>
			<Text size="12" weight="600" color="tertiary">Total Tx</Text>
			<Text size="12" weight="600" color="tertiary">Efficiency</Text>
			<Text size="12" weight="600" color="tertiary">Utilization</Text>
			<Text size="12" weight="600" color="tertiary">Throughput</Text>
		</Flex>

		<!-- Rows -->
		<Flex direction="column" gap="0">
			<Flex
				v-for="validator in validatorList"
				:key="validator.validatorId"
				@click="handleValidatorClick(validator.validatorId)"
				align="center"
				justify="between"
				:class="$style.row"
			>
				<!-- Rank -->
				<Flex align="center" :class="$style.rank_cell">
					<Badge 
						:type="getBadgeType(validator.rank)"
						size="small"
					>
						#{{ validator.rank }}
					</Badge>
				</Flex>

				<!-- Validator Info -->
				<Flex align="center" gap="8" :class="$style.validator_cell">
					<ValidatorLogo 
						:identity="validator.validatorId"
						:name="validator.validatorName"
						size="small"
					/>
					<Flex direction="column" gap="2">
						<Text size="13" weight="600" color="primary">
							{{ validator.validatorName || shortHex(validator.validatorId) }}
						</Text>
						<Flex align="center" gap="4">
							<Text size="11" color="tertiary">
								{{ validator.infrastructure?.location || 'Unknown' }}
							</Text>
							<CopyButton 
								:text="validator.validatorId" 
								size="10"
								:showLabel="false"
							/>
						</Flex>
					</Flex>
				</Flex>

				<!-- Total Transactions -->
				<Flex align="center" :class="$style.metric_cell">
					<Text size="13" weight="600" color="primary">
						{{ abbreviate(validator.transactionMetrics.totalTransactions) }}
					</Text>
				</Flex>

				<!-- Transaction Efficiency -->
				<Flex align="center" :class="$style.metric_cell">
					<Text size="13" weight="600" color="primary">
						{{ formatEfficiency(validator.transactionMetrics.transactionEfficiency) }}
					</Text>
				</Flex>

				<!-- Block Utilization -->
				<Flex align="center" :class="$style.metric_cell">
					<Text size="13" weight="600" color="primary">
						{{ formatUtilization(validator.transactionMetrics.blockUtilizationRate) }}
					</Text>
				</Flex>

				<!-- Throughput -->
				<Flex align="center" :class="$style.metric_cell">
					<Text size="13" weight="600" color="primary">
						{{ formatTransactionThroughput(validator.transactionMetrics.transactionThroughput) }}
					</Text>
				</Flex>
			</Flex>
		</Flex>

		<!-- Pagination (if enabled) -->
		<Flex v-if="showPagination && paginationData" align="center" justify="between" :class="$style.pagination">
			<Text size="12" color="tertiary">
				Showing {{ paginationData.limit }} of {{ paginationData.totalCount }} validators
			</Text>
			
			<Flex align="center" gap="8">
				<Button 
					@click="emit('pagination', { page: paginationData.currentPage - 1 })"
					:disabled="!paginationData.hasPreviousPage"
					type="secondary" 
					size="mini"
				>
					Previous
				</Button>
				
				<Text size="12" color="secondary">
					Page {{ paginationData.currentPage }} of {{ paginationData.totalPages }}
				</Text>
				
				<Button 
					@click="emit('pagination', { page: paginationData.currentPage + 1 })"
					:disabled="!paginationData.hasNextPage"
					type="secondary" 
					size="mini"
				>
					Next
				</Button>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	background: var(--card-background);
	border-radius: 12px;
	box-shadow: inset 0 0 0 1px var(--op-3);
	overflow: hidden;
}

.header {
	background: var(--op-3);
	padding: 12px 16px;
	border-bottom: 1px solid var(--op-5);
}

.header > * {
	flex: 1;
	text-align: left;
}

.header > *:first-child {
	flex: 0 0 80px;
	text-align: center;
}

.header > *:nth-child(2) {
	flex: 2;
}

.row {
	padding: 12px 16px;
	border-bottom: 1px solid var(--op-3);
	cursor: pointer;
	transition: background-color 0.2s ease;
}

.row:hover {
	background: var(--op-3);
}

.row:last-child {
	border-bottom: none;
}

.row > * {
	flex: 1;
}

.rank_cell {
	flex: 0 0 80px;
	justify-content: center;
}

.validator_cell {
	flex: 2;
}

.metric_cell {
	justify-content: flex-start;
}

.pagination {
	padding: 12px 16px;
	border-top: 1px solid var(--op-5);
	background: var(--op-3);
}

@media (max-width: 768px) {
	.header,
	.row {
		padding: 8px 12px;
	}
	
	.header > *:nth-child(4),
	.header > *:nth-child(5),
	.row > *:nth-child(4),
	.row > *:nth-child(5) {
		display: none;
	}
}

@media (max-width: 480px) {
	.header > *:nth-child(6),
	.row > *:nth-child(6) {
		display: none;
	}
	
	.validator_cell {
		flex: 1.5;
	}
}
</style> 