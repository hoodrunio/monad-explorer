<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** Services */
import { comma, shortHex } from "@/services/utils"
import { getTokenLogoSync, preloadTokenList } from "@/services/api/tokenList"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

const router = useRouter()

// Preload token registry
onMounted(() => {
	preloadTokenList()
})

/**
 * Get token logo URL - prioritizes registry logo over API logo
 */
const getTokenLogoUrl = (token) => {
	const address = getTokenAddress(token)
	if (!address) return token?.icon_url || null

	const registryLogo = getTokenLogoSync(address)
	if (registryLogo) return registryLogo

	return token?.icon_url || null
}

const props = defineProps({
	tokens: {
		type: Array,
		required: true,
	},
})

/**
 * Format large numbers with abbreviations
 */
const formatNumber = (num) => {
	if (!num) return '0'
	const n = parseFloat(num)
	if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
	if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
	if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
	return n.toFixed(2)
}

/**
 * Get token type badge color
 */
const getTypeColor = (type) => {
	switch (type) {
		case 'ERC-20': return 'blue'
		case 'ERC-721': return 'purple'
		case 'ERC-1155': return 'orange'
		default: return 'tertiary'
	}
}

/**
 * Resolve token address from different API shapes
 */
const getTokenAddress = (token) => {
	return token?.address ||
		token?.address_hash ||
		token?.token?.address ||
		token?.token?.address_hash ||
		token?.hash ||
		null
}

const handleRowClick = (token) => {
	const address = getTokenAddress(token)
	if (!address) return

	router.push(`/tokens/${address}`)
}
</script>

<template>
	<div :class="$style.wrapper">
		<table :class="$style.table">
			<thead>
				<tr>
					<th><Text size="12" weight="600" color="tertiary">Token</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Type</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Price</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Holders</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Market Cap</Text></th>
				</tr>
			</thead>

			<tbody>
				<tr
					v-for="token in tokens"
					:key="getTokenAddress(token)"
					@click="handleRowClick(token)"
					:class="$style.row"
				>
					<td>
						<Flex align="center" gap="12">
							<div :class="$style.token_icon">
								<img
									v-if="getTokenLogoUrl(token)"
									:src="getTokenLogoUrl(token)"
									:alt="token.name"
									@error="$event.target.style.display = 'none'"
								/>
								<Icon v-else name="coins" size="20" color="secondary" />
							</div>
							<Flex direction="column" gap="4">
								<Flex align="center" gap="6">
									<Text size="13" weight="600" color="primary">
										{{ token.name || 'Unknown Token' }}
									</Text>
									<Text v-if="token.symbol" size="12" weight="500" color="tertiary">
										{{ token.symbol }}
									</Text>
								</Flex>
								<Tooltip position="start" delay="300">
									<Text size="11" weight="500" color="tertiary" mono>
										{{ shortHex(getTokenAddress(token)) }}
									</Text>
									<template #content>
										{{ getTokenAddress(token) }}
									</template>
								</Tooltip>
							</Flex>
						</Flex>
					</td>
					<td>
						<Flex align="center" gap="6">
							<div :class="[$style.type_badge, $style[`type_${token.type?.toLowerCase().replace('-', '')}`]]">
								<Text size="11" weight="600">{{ token.type || 'Unknown' }}</Text>
							</div>
						</Flex>
					</td>
					<td>
						<Flex direction="column" gap="2">
							<Text v-if="token.exchange_rate" size="12" weight="600" color="primary">
								${{ parseFloat(token.exchange_rate).toFixed(4) }}
							</Text>
							<Text v-else size="12" weight="500" color="tertiary">-</Text>
						</Flex>
					</td>
					<td>
						<Text size="12" weight="600" color="secondary">
							{{ comma(token.holders_count || 0) }}
						</Text>
					</td>
					<td>
						<Text v-if="token.circulating_market_cap" size="12" weight="600" color="secondary">
							${{ formatNumber(token.circulating_market_cap) }}
						</Text>
						<Text v-else size="12" weight="500" color="tertiary">-</Text>
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
		padding-top: 12px;
		padding-bottom: 12px;

		white-space: nowrap;

		&:first-child {
			padding-left: 16px;
		}
	}
}

.token_icon {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: var(--op-8);
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;

	& img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.type_badge {
	padding: 2px 8px;
	border-radius: 4px;
	background: var(--op-8);
}

.type_erc20 {
	background: rgba(59, 130, 246, 0.15);
	& span { color: rgb(96, 165, 250); }
}

.type_erc721 {
	background: rgba(168, 85, 247, 0.15);
	& span { color: rgb(192, 132, 252); }
}

.type_erc1155 {
	background: rgba(249, 115, 22, 0.15);
	& span { color: rgb(251, 146, 60); }
}
</style>
