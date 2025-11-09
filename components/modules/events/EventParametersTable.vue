<script setup>
/** UI */
import Button from "@/components/ui/Button.vue"
import Tooltip from "@/components/ui/Tooltip.vue"

/** Components */
import AddressLink from "./AddressLink.vue"

/** Composables */
import { useEventFormatting } from "@/composables/useEventFormatting"
import { useEventActions } from "@/composables/useEventActions"

const props = defineProps({
	/**
	 * Array of decoded parameters
	 */
	parameters: {
		type: Array,
		required: true,
	},
})

const { formatValue } = useEventFormatting()
const { copyToClipboard } = useEventActions()

const handleCopyAll = () => {
	copyToClipboard(JSON.stringify(props.parameters, null, 2))
}
</script>

<template>
	<Flex direction="column" gap="8" :class="$style.params_section">
		<Flex align="center" justify="between">
			<Text size="12" weight="600" color="primary">Decoded Parameters</Text>
			<Button
				@click.stop="handleCopyAll"
				type="secondary"
				size="mini"
			>
				<Icon name="copy" size="12" color="secondary" />
				<Text size="11" weight="500" color="secondary">Copy All</Text>
			</Button>
		</Flex>

		<!-- Parameters Table -->
		<Flex direction="column" :class="$style.params_table">
			<!-- Table Header -->
			<Flex :class="$style.table_header">
				<Flex :class="$style.table_cell_name">
					<Text size="11" weight="600" color="tertiary">Name</Text>
				</Flex>
				<Flex :class="$style.table_cell_type">
					<Text size="11" weight="600" color="tertiary">Type</Text>
				</Flex>
				<Flex :class="$style.table_cell_indexed">
					<Text size="11" weight="600" color="tertiary">Indexed</Text>
				</Flex>
				<Flex :class="$style.table_cell_value">
					<Text size="11" weight="600" color="tertiary">Value</Text>
				</Flex>
				<Flex :class="$style.table_cell_action"></Flex>
			</Flex>

			<!-- Table Rows -->
			<Flex
				v-for="(param, paramIdx) in parameters"
				:key="paramIdx"
				:class="$style.table_row"
			>
				<Flex align="center" :class="$style.table_cell_name">
					<Text size="12" weight="500" color="primary" mono>
						{{ param.name || `param${paramIdx}` }}
					</Text>
				</Flex>
				<Flex align="center" :class="$style.table_cell_type">
					<Flex :class="$style.type_badge">
						<Text size="11" weight="500" color="secondary" mono>
							{{ param.type }}
						</Text>
					</Flex>
				</Flex>
				<Flex align="center" justify="center" :class="$style.table_cell_indexed">
					<Flex v-if="param.indexed" :class="$style.indexed_badge">
						<Text size="10" weight="600" color="brand">✓</Text>
					</Flex>
					<Text v-else size="11" weight="500" color="tertiary">-</Text>
				</Flex>
				<Flex align="center" :class="$style.table_cell_value">
					<!-- Address values with link -->
					<AddressLink v-if="param.type === 'address'" :address="param.value" />
					<!-- Other values -->
					<Text v-else size="11" weight="500" color="primary" mono :class="$style.value_text">
						{{ formatValue(param.value, param.type) }}
					</Text>
				</Flex>
				<Flex align="center" justify="center" :class="$style.table_cell_action">
					<Flex
						@click.stop="copyToClipboard(param.value.toString())"
						:class="$style.copy_btn"
					>
						<Icon name="copy" size="12" color="secondary" />
					</Flex>
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.params_section {
	padding: 12px;
	border-radius: 6px;
	background: var(--card-background);
	border: 1px solid var(--op-8);
}

.params_table {
	border-radius: 4px;
	border: 1px solid var(--op-8);
	overflow: hidden;
}

.table_header {
	background: var(--op-8);
	padding: 8px 12px;
	border-bottom: 1px solid var(--op-10);
}

.table_row {
	padding: 10px 12px;
	border-bottom: 1px solid var(--op-5);
	transition: background 0.15s ease;

	&:last-child {
		border-bottom: none;
	}

	&:hover {
		background: var(--op-5);
	}
}

.table_cell_name {
	flex: 0 0 120px;
	min-width: 0;
}

.table_cell_type {
	flex: 0 0 100px;
	min-width: 0;
}

.table_cell_indexed {
	flex: 0 0 70px;
	min-width: 0;
}

.table_cell_value {
	flex: 1;
	min-width: 0;
}

.table_cell_action {
	flex: 0 0 40px;
	min-width: 0;
}

.type_badge {
	padding: 2px 6px;
	border-radius: 3px;
	background: var(--op-8);
}

.indexed_badge {
	width: 16px;
	height: 16px;
	border-radius: 3px;
	background: rgba(24, 210, 165, 0.15);
	align-items: center;
	justify-content: center;
}

.value_text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}

.copy_btn {
	opacity: 0;
	transition: opacity 0.2s ease;
	cursor: pointer;
	padding: 4px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		background: var(--op-5);
	}

	&:active {
		background: var(--op-8);
	}
}

.table_row:hover .copy_btn {
	opacity: 0.6;
}

.copy_btn:hover {
	opacity: 1 !important;
}

@media (max-width: 800px) {
	.table_cell_name {
		flex: 0 0 80px;
	}

	.table_cell_type {
		flex: 0 0 80px;
	}
}

@media (max-width: 500px) {
	.params_table {
		font-size: 10px;
	}
}
</style>
