<script setup>
/** Services */
import { comma, shortHex } from "@/services/utils"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

const router = useRouter()

const props = defineProps({
	holders: {
		type: Array,
		required: true,
	},
	tokenDecimals: {
		type: Number,
		default: 18,
	},
	tokenSymbol: {
		type: String,
		default: '',
	},
	totalSupply: {
		type: String,
		default: '0',
	},
})

/**
 * Format token balance considering decimals
 */
const formatBalance = (value, decimals = 18) => {
	if (!value) return '0'
	const num = parseFloat(value) / Math.pow(10, decimals)
	if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
	if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
	if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
	return num.toFixed(4)
}

/**
 * Calculate percentage of total supply
 */
const calculatePercentage = (value) => {
	if (!value || !props.totalSupply || props.totalSupply === '0') return '0'
	const percent = (parseFloat(value) / parseFloat(props.totalSupply)) * 100
	return percent.toFixed(2)
}

/**
 * Safely resolve holder address from different API shapes
 */
const getHolderAddress = (holder) => {
	return holder?.address?.hash ||
		holder?.address_hash ||
		holder?.address ||
		holder?.hash ||
		''
}

const handleRowClick = (holder) => {
	const address = getHolderAddress(holder)
	if (!address) return

	router.push(`/address/${address}`)
}
</script>

<template>
	<div :class="$style.wrapper">
		<table :class="$style.table">
			<thead>
				<tr>
					<th><Text size="12" weight="600" color="tertiary">Rank</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Address</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Balance</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Percentage</Text></th>
				</tr>
			</thead>

			<tbody>
				<tr
					v-for="(holder, index) in holders"
					:key="`${getHolderAddress(holder)}-${index}`"
					@click="handleRowClick(holder)"
					:class="$style.row"
				>
					<td>
						<Text size="12" weight="600" color="tertiary">
							#{{ index + 1 }}
						</Text>
					</td>
					<td>
						<Flex align="center" gap="8">
							<Icon name="address" size="14" color="secondary" />
							<Tooltip position="start" delay="300">
								<Text size="12" weight="600" color="primary" mono>
									{{ shortHex(getHolderAddress(holder)) }}
								</Text>
								<template #content>
									{{ getHolderAddress(holder) }}
								</template>
							</Tooltip>
							<CopyButton :text="getHolderAddress(holder) || ''" size="12" />
						</Flex>
					</td>
					<td>
						<Flex align="center" gap="6">
							<Text size="12" weight="600" color="secondary">
								{{ formatBalance(holder.value, tokenDecimals) }}
							</Text>
							<Text v-if="tokenSymbol" size="11" weight="500" color="tertiary">
								{{ tokenSymbol }}
							</Text>
						</Flex>
					</td>
					<td>
						<Flex align="center" gap="8">
							<div :class="$style.percentage_bar">
								<div
									:class="$style.percentage_fill"
									:style="{ width: `${Math.min(calculatePercentage(holder.value), 100)}%` }"
								/>
							</div>
							<Text size="12" weight="600" color="tertiary">
								{{ calculatePercentage(holder.value) }}%
							</Text>
						</Flex>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style module>
.wrapper {
	min-width: 100%;
	width: 0;
	height: 100%;

	overflow-x: auto;
}

.table {
	width: 100%;
	height: fit-content;

	border-spacing: 0px;

	& tbody {
		& tr {
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover {
				background: var(--op-5);
				transform: translateX(4px);
			}

			&:active {
				background: var(--op-8);
			}
		}
	}

	& tr th {
		text-align: left;
		padding: 0;
		padding-right: 16px;
		padding-top: 16px;
		padding-bottom: 8px;

		&:first-child {
			padding-left: 16px;
		}

		& span {
			display: flex;
		}
	}

	& tr td {
		padding: 0;
		padding-right: 24px;
		padding-top: 10px;
		padding-bottom: 10px;

		white-space: nowrap;

		&:first-child {
			padding-left: 16px;
		}
	}
}

.percentage_bar {
	width: 60px;
	height: 6px;
	background: var(--op-8);
	border-radius: 3px;
	overflow: hidden;
}

.percentage_fill {
	height: 100%;
	background: var(--brand);
	border-radius: 3px;
	transition: width 0.3s ease;
}
</style>
