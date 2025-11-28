<script setup>
import { getTokenLogoSync, getNativeMonLogo } from "@/services/api/tokenList"

const props = defineProps({
	nativeBalance: {
		type: String,
		default: "0",
	},
	nativeUsdValue: {
		type: Number,
		default: 0,
	},
	tokenBalances: {
		type: Array,
		default: () => [],
	},
	isLoading: {
		type: Boolean,
		default: false,
	},
	maxTokens: {
		type: Number,
		default: 4,
	},
})

const emit = defineEmits(["viewAllTokens"])

const isCollapsed = ref(false)

// Format native balance
const formattedNativeBalance = computed(() => {
	const value = parseFloat(props.nativeBalance)
	if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`
	if (value >= 1000) return `${(value / 1000).toFixed(2)}K`
	return value.toFixed(4)
})

// Format USD value
const formattedNativeUsd = computed(() => {
	const value = props.nativeUsdValue || 0
	if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
	if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`
	if (value < 0.01 && value > 0) return "<$0.01"
	return `$${value.toFixed(2)}`
})

// Visible tokens (first N)
const visibleTokens = computed(() => {
	return props.tokenBalances.slice(0, props.maxTokens)
})

// Hidden tokens count
const hiddenTokensCount = computed(() => {
	return Math.max(0, props.tokenBalances.length - props.maxTokens)
})

// Format token balance
const formatTokenBalance = (value, decimals = 18) => {
	if (!value) return "0"
	const dec = parseInt(decimals) || 18
	const num = Number(BigInt(value)) / Math.pow(10, dec)

	if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
	if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
	if (num < 0.0001 && num > 0) return "<0.0001"
	return num.toFixed(4)
}

// Calculate USD value for token
const calculateTokenUsd = (value, decimals = 18, exchangeRate) => {
	if (!value || !exchangeRate) return null
	const dec = parseInt(decimals) || 18
	const tokenAmount = Number(BigInt(value)) / Math.pow(10, dec)
	const usdValue = tokenAmount * parseFloat(exchangeRate)

	if (usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`
	if (usdValue >= 1000) return `$${(usdValue / 1000).toFixed(2)}K`
	if (usdValue < 0.01 && usdValue > 0) return "<$0.01"
	return `$${usdValue.toFixed(2)}`
}

const handleViewAll = () => {
	emit("viewAllTokens")
}

// Get token logo URL - prioritizes registry logo over API logo
const getTokenLogoUrl = (token) => {
	if (!token?.address_hash) return null
	const registryLogo = getTokenLogoSync(token.address_hash)
	if (registryLogo) return registryLogo
	return token.icon_url || null
}
</script>

<template>
	<Flex direction="column" gap="12" :class="$style.widget">
		<!-- Header -->
		<Flex @click="isCollapsed = !isCollapsed" align="center" justify="between" :class="$style.header">
			<Text size="12" weight="600" color="tertiary">Balance</Text>
			<Icon
				name="chevron"
				size="14"
				color="tertiary"
				:style="{
					transform: `rotate(${isCollapsed ? '0' : '180'}deg)`,
					transition: 'transform 300ms ease',
				}"
			/>
		</Flex>

		<!-- Content -->
		<Transition name="fastfade">
			<Flex v-if="!isCollapsed" direction="column" gap="12">
				<!-- Native Balance -->
				<Flex align="center" justify="between" :class="$style.balance_row">
					<Flex align="center" gap="8">
						<Flex align="center" justify="center" :class="$style.token_icon">
							<img
								v-if="getNativeMonLogo()"
								:src="getNativeMonLogo()"
								width="16"
								height="16"
								:class="$style.token_image"
							/>
							<Icon v-else name="mon" size="16" color="brand" />
						</Flex>
						<Text size="12" weight="600" color="secondary">MON</Text>
					</Flex>

					<Flex direction="column" align="end" gap="2">
						<Skeleton v-if="isLoading" w="60" h="14" />
						<Text v-else size="12" weight="600" color="primary">
							{{ formattedNativeBalance }}
						</Text>

						<Skeleton v-if="isLoading" w="40" h="12" />
						<Text v-else-if="nativeUsdValue > 0" size="11" weight="500" color="tertiary">
							{{ formattedNativeUsd }}
						</Text>
					</Flex>
				</Flex>

				<!-- Token Balances -->
				<Flex
					v-for="(balance, index) in visibleTokens"
					:key="balance.token?.address_hash || index"
					align="center"
					justify="between"
					:class="$style.balance_row"
				>
					<Flex align="center" gap="8">
						<Flex align="center" justify="center" :class="$style.token_icon">
							<img
								v-if="getTokenLogoUrl(balance.token)"
								:src="getTokenLogoUrl(balance.token)"
								width="16"
								height="16"
								:class="$style.token_image"
							/>
							<Icon v-else name="coins" size="14" color="tertiary" />
						</Flex>
						<Text size="12" weight="600" color="secondary">
							{{ balance.token?.symbol || "???" }}
						</Text>
					</Flex>

					<Flex direction="column" align="end" gap="2">
						<Text size="12" weight="600" color="primary">
							{{ formatTokenBalance(balance.value, balance.token?.decimals) }}
						</Text>

						<Text
							v-if="calculateTokenUsd(balance.value, balance.token?.decimals, balance.token?.exchange_rate)"
							size="11"
							weight="500"
							color="tertiary"
						>
							{{ calculateTokenUsd(balance.value, balance.token?.decimals, balance.token?.exchange_rate) }}
						</Text>
					</Flex>
				</Flex>

				<!-- View All Link -->
				<Flex v-if="hiddenTokensCount > 0" @click="handleViewAll" align="center" :class="$style.view_all">
					<Text size="11" weight="500" color="brand">+{{ hiddenTokensCount }} more tokens</Text>
					<Icon name="arrow-right" size="10" color="brand" />
				</Flex>
			</Flex>
		</Transition>
	</Flex>
</template>

<style module>
.widget {
	padding: 16px;
	border-bottom: 1px solid var(--op-5);
}

.header {
	cursor: pointer;

	&:hover {
		opacity: 0.8;
	}
}

.balance_row {
	padding: 4px 0;
}

.token_icon {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background: var(--op-5);
	flex-shrink: 0;
}

.token_image {
	width: 100%;
	height: 100%;
	border-radius: 50%;
	object-fit: cover;
}

.view_all {
	cursor: pointer;
	gap: 4px;
	padding: 4px 0;

	&:hover {
		opacity: 0.8;
	}
}
</style>
