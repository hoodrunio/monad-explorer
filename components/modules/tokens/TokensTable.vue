<script setup>
/** Services */
import { comma, shortHex } from "@/services/utils"
import { getTokenLogoSync, preloadTokenList, useCacheVersion } from "@/services/api/tokenList"
import { getProtocolInfoSync, preloadProtocolList, useCacheVersion as useProtocolCacheVersion } from "@/services/api/protocolList"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

const router = useRouter()

// Reactive cache versions for re-rendering when data loads
const tokenCacheVersion = useCacheVersion()
const protocolCacheVersion = useProtocolCacheVersion()

// Preload registries
onMounted(() => {
	preloadTokenList()
	preloadProtocolList()
})

/**
 * Get protocol info for a token
 */
const getProtocol = (token) => {
	const address = getTokenAddress(token)
	return address ? getProtocolInfoSync(address) : null
}

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

// Combined cache version for reactive re-rendering
const cacheKey = computed(() => `${tokenCacheVersion.value}-${protocolCacheVersion.value}`)

const props = defineProps({
	tokens: {
		type: Array,
		required: true,
	},
	routePrefix: {
		type: String,
		default: null,
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

const getRoutePrefix = (token) => {
	if (props.routePrefix) return props.routePrefix

	const isNFT = token.type === 'ERC-721' || token.type === 'ERC-1155'
	return isNFT ? '/nfts' : '/tokens'
}

const handleRowClick = (token) => {
	const address = getTokenAddress(token)
	if (!address) return

	router.push(`${getRoutePrefix(token)}/${address}`)
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

			<tbody :key="cacheKey">
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
									<Flex v-if="getProtocol(token)" align="center" gap="4" :class="$style.protocol_tag">
										<div :class="[$style.protocol_dot, $style[`protocol_${getProtocol(token).ctype?.toLowerCase()}`]]" />
										<Text size="10" weight="600" color="tertiary">
											{{ getProtocol(token).name }}
										</Text>
									</Flex>
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

.protocol_tag {
	padding: 1px 6px;
	background: var(--op-5);
	border-radius: 3px;
}

.protocol_dot {
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: var(--txt-tertiary);
}

.protocol_defi { background: #3b82f6; }
.protocol_ai { background: #8b5cf6; }
.protocol_consumer { background: #10b981; }
.protocol_gaming { background: #f59e0b; }
.protocol_depin { background: #06b6d4; }
.protocol_infra { background: #6b7280; }
.protocol_nft { background: #ec4899; }
.protocol_cefi { background: #eab308; }
</style>
