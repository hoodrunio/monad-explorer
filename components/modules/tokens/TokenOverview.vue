<script setup>
/** Services */
import { comma, splitAddress } from "@/services/utils"
import { getTokenLogoSync, preloadTokenList } from "@/services/api/tokenList"

/** UI */
import BookmarkButton from "@/components/BookmarkButton.vue"
import Button from "@/components/ui/Button.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

/** Store */
import { useCacheStore } from "@/store/cache.store"
import { useModalsStore } from "@/store/modals.store"

const cacheStore = useCacheStore()
const modalsStore = useModalsStore()

// Preload token registry
onMounted(() => {
	preloadTokenList()
})

/**
 * Get token logo URL - prioritizes registry logo over API logo
 */
const getTokenLogoUrl = (token) => {
	if (!token?.address) return token?.icon_url || null

	const registryLogo = getTokenLogoSync(token.address)
	if (registryLogo) return registryLogo

	return token?.icon_url || null
}

const props = defineProps({
	token: {
		type: Object,
		required: true,
	},
	counters: {
		type: Object,
		default: () => ({}),
	},
})

/**
 * Format token supply considering decimals
 */
const formatSupply = (value, decimals = 18) => {
	if (!value) return '0'
	const num = parseFloat(value) / Math.pow(10, decimals)
	if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T'
	if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
	if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
	if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
	return num.toLocaleString()
}

/**
 * Get token type color class
 */
const getTypeClass = (type) => {
	switch (type) {
		case 'ERC-20': return 'erc20'
		case 'ERC-721': return 'erc721'
		case 'ERC-1155': return 'erc1155'
		default: return ''
	}
}

const handleOpenQRModal = () => {
	cacheStore.qr.data = props.token.address
	cacheStore.qr.description = "Token Contract"
	cacheStore.qr.icon = "token"
	modalsStore.open("qr")
}
</script>

<template>
	<Flex direction="column" gap="16" :class="$style.card">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="12">
				<div :class="$style.token_icon">
					<img
						v-if="getTokenLogoUrl(token)"
						:src="getTokenLogoUrl(token)"
						:alt="token.name"
						@error="$event.target.style.display = 'none'"
					/>
					<Icon v-else name="coins" size="24" color="secondary" />
				</div>
				<Flex direction="column" gap="4">
					<Flex align="center" gap="8">
						<Text size="16" weight="600" color="primary">
							{{ token.name || 'Unknown Token' }}
						</Text>
						<div :class="[$style.type_badge, $style[getTypeClass(token.type)]]">
							<Text size="11" weight="600">{{ token.type || 'Unknown' }}</Text>
						</div>
					</Flex>
					<Flex align="center" gap="8">
						<Text v-if="token.symbol" size="13" weight="500" color="secondary">
							{{ token.symbol }}
						</Text>
						<Text size="12" weight="500" color="tertiary" mono>
							{{ splitAddress(token.address) }}
						</Text>
						<CopyButton :text="token.address" size="12" />
					</Flex>
				</Flex>
			</Flex>

			<Flex align="center" gap="8">
				<BookmarkButton type="token" :id="token.address" />

				<Dropdown>
					<Button type="secondary" size="mini">
						<Icon name="dots" size="16" color="primary" />
					</Button>

					<template #popup>
						<DropdownItem @click="handleOpenQRModal">
							<Flex align="center" gap="8">
								<Icon name="qr" size="12" color="secondary" />
								Get QR Code
							</Flex>
						</DropdownItem>
						<DropdownItem>
							<NuxtLink :to="`/contract/${token.address}`">
								<Flex align="center" gap="8">
									<Icon name="code" size="12" color="secondary" />
									View Contract
								</Flex>
							</NuxtLink>
						</DropdownItem>
					</template>
				</Dropdown>
			</Flex>
		</Flex>

		<!-- Stats Grid -->
		<Flex wrap="wrap" gap="16" :class="$style.stats_grid">
			<!-- Price -->
			<Flex direction="column" gap="4" :class="$style.stat_item">
				<Text size="12" weight="600" color="tertiary">Price</Text>
				<Text v-if="token.exchange_rate" size="14" weight="600" color="primary">
					${{ parseFloat(token.exchange_rate).toFixed(6) }}
				</Text>
				<Text v-else size="14" weight="500" color="tertiary">-</Text>
			</Flex>

			<!-- Market Cap -->
			<Flex direction="column" gap="4" :class="$style.stat_item">
				<Text size="12" weight="600" color="tertiary">Market Cap</Text>
				<Text v-if="token.circulating_market_cap" size="14" weight="600" color="primary">
					${{ formatSupply(token.circulating_market_cap, 0) }}
				</Text>
				<Text v-else size="14" weight="500" color="tertiary">-</Text>
			</Flex>

			<!-- Total Supply -->
			<Flex direction="column" gap="4" :class="$style.stat_item">
				<Text size="12" weight="600" color="tertiary">Total Supply</Text>
				<Flex align="center" gap="6">
					<Text size="14" weight="600" color="primary">
						{{ formatSupply(token.total_supply, token.decimals || 18) }}
					</Text>
					<Text v-if="token.symbol" size="12" weight="500" color="tertiary">
						{{ token.symbol }}
					</Text>
				</Flex>
			</Flex>

			<!-- Holders -->
			<Flex direction="column" gap="4" :class="$style.stat_item">
				<Text size="12" weight="600" color="tertiary">Holders</Text>
				<Text size="14" weight="600" color="primary">
					{{ comma(token.holders_count || counters?.holders_count || 0) }}
				</Text>
			</Flex>

			<!-- Transfers -->
			<Flex direction="column" gap="4" :class="$style.stat_item">
				<Text size="12" weight="600" color="tertiary">Transfers</Text>
				<Text size="14" weight="600" color="primary">
					{{ comma(counters?.transfers_count || 0) }}
				</Text>
			</Flex>

			<!-- Decimals -->
			<Flex direction="column" gap="4" :class="$style.stat_item">
				<Text size="12" weight="600" color="tertiary">Decimals</Text>
				<Text size="14" weight="600" color="primary">
					{{ token.decimals ?? 18 }}
				</Text>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.card {
	background: var(--card-background);
	border-radius: 8px;
	padding: 16px;
}

.header {
	padding-bottom: 16px;
	border-bottom: 1px solid var(--op-8);
}

.token_icon {
	width: 48px;
	height: 48px;
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

.erc20 {
	background: rgba(59, 130, 246, 0.15);
	& span { color: rgb(96, 165, 250); }
}

.erc721 {
	background: rgba(168, 85, 247, 0.15);
	& span { color: rgb(192, 132, 252); }
}

.erc1155 {
	background: rgba(249, 115, 22, 0.15);
	& span { color: rgb(251, 146, 60); }
}

.stats_grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	gap: 16px;
}

.stat_item {
	padding: 12px;
	background: var(--op-5);
	border-radius: 8px;
}

@media (max-width: 600px) {
	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}

	.stats_grid {
		grid-template-columns: repeat(2, 1fr);
	}
}
</style>
