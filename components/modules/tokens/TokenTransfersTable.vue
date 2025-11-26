<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** Services */
import { shortHex } from "@/services/utils"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

const router = useRouter()

const props = defineProps({
	transfers: {
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
})

/**
 * Format token amount considering decimals
 */
const formatAmount = (total, decimals = 18) => {
	if (!total) return '0'

	// Handle different total structures (ERC-20 vs ERC-721/1155)
	let value = total
	if (typeof total === 'object') {
		value = total.value || total.token_id || '0'
	}

	const num = parseFloat(value) / Math.pow(10, decimals)
	if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
	if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
	if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
	return num.toFixed(4)
}

/**
 * Get transfer type icon and color
 */
const getTransferIcon = (method) => {
	switch (method?.toLowerCase()) {
		case 'transfer':
			return { icon: 'arrow-right', color: 'primary' }
		case 'transferfrom':
			return { icon: 'arrow-right', color: 'secondary' }
		case 'mint':
			return { icon: 'plus-circle', color: 'green' }
		case 'burn':
			return { icon: 'close-circle', color: 'red' }
		default:
			return { icon: 'arrow-right', color: 'tertiary' }
	}
}
</script>

<template>
	<div :class="$style.wrapper">
		<table :class="$style.table">
			<thead>
				<tr>
					<th><Text size="12" weight="600" color="tertiary">Tx Hash</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Method</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Time</Text></th>
					<th><Text size="12" weight="600" color="tertiary">From</Text></th>
					<th><Text size="12" weight="600" color="tertiary"></Text></th>
					<th><Text size="12" weight="600" color="tertiary">To</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Amount</Text></th>
				</tr>
			</thead>

			<tbody>
				<tr
					v-for="transfer in transfers"
					:key="`${transfer.transaction_hash}-${transfer.log_index}`"
					@click="router.push(`/tx/${transfer.transaction_hash}`)"
					:class="$style.row"
				>
					<td>
						<Tooltip position="start" delay="300">
							<Flex align="center" gap="6">
								<Text size="12" weight="600" color="primary" mono>
									{{ shortHex(transfer.transaction_hash) }}
								</Text>
								<CopyButton :text="transfer.transaction_hash" size="10" />
							</Flex>
							<template #content>
								{{ transfer.transaction_hash }}
							</template>
						</Tooltip>
					</td>
					<td>
						<div :class="$style.method_badge">
							<Text size="11" weight="600" color="secondary">
								{{ transfer.method || 'transfer' }}
							</Text>
						</div>
					</td>
					<td>
						<Flex direction="column" gap="2">
							<ClientOnlyTime fallback-text="..." fallback-size="12" fallback-color="primary">
								<Text size="12" weight="600" color="primary">
									{{ DateTime.fromISO(transfer.timestamp).toRelative({ locale: "en", style: "short" }).replace(' ago', '') }}
								</Text>
							</ClientOnlyTime>
							<Text size="11" weight="500" color="tertiary">
								{{ DateTime.fromISO(transfer.timestamp).setLocale("en").toFormat("LLL d, t") }}
							</Text>
						</Flex>
					</td>
					<td>
						<Tooltip position="start" delay="300">
							<Flex align="center" gap="6">
								<Icon name="address" size="12" color="secondary" />
								<Text size="12" weight="600" color="secondary" mono>
									{{ transfer.from?.hash ? shortHex(transfer.from.hash) : 'Null Address' }}
								</Text>
							</Flex>
							<template #content>
								{{ transfer.from?.hash || '0x0000000000000000000000000000000000000000' }}
							</template>
						</Tooltip>
					</td>
					<td>
						<Icon
							:name="getTransferIcon(transfer.method).icon"
							size="14"
							:color="getTransferIcon(transfer.method).color"
						/>
					</td>
					<td>
						<Tooltip position="start" delay="300">
							<Flex align="center" gap="6">
								<Icon name="address" size="12" color="secondary" />
								<Text size="12" weight="600" color="secondary" mono>
									{{ transfer.to?.hash ? shortHex(transfer.to.hash) : 'Null Address' }}
								</Text>
							</Flex>
							<template #content>
								{{ transfer.to?.hash || '0x0000000000000000000000000000000000000000' }}
							</template>
						</Tooltip>
					</td>
					<td>
						<Flex align="center" gap="6">
							<Text size="12" weight="600" color="primary">
								{{ formatAmount(transfer.total, tokenDecimals) }}
							</Text>
							<Text v-if="tokenSymbol" size="11" weight="500" color="tertiary">
								{{ tokenSymbol }}
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
		padding-right: 16px;
		padding-top: 10px;
		padding-bottom: 10px;

		white-space: nowrap;

		&:first-child {
			padding-left: 16px;
		}
	}
}

.method_badge {
	padding: 2px 8px;
	border-radius: 4px;
	background: var(--op-8);
	display: inline-block;
}
</style>
