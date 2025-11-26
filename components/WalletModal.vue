<script setup>
import { useAppKitAccount } from '@reown/appkit/vue'
import { watchAccount, watchChainId } from '@wagmi/core'
import { formatEther } from 'viem'
import { useStakingStore } from '~/store/staking.store'
import { monadTestnet, monadMainnet } from '~/config/chains'
import { isMainnet } from '~/services/utils/general'
import { showNetworkSwitchRequiredNotification } from '~/utils/notifications'
import Button from '@/components/ui/Button.vue'

// Props for customization
const props = defineProps({
	label: {
		type: String,
		default: 'Connect Wallet'
	},
	showBalance: {
		type: [Boolean, Object],
		default: () => ({ smallScreen: true, largeScreen: true })
	},
	size: {
		type: String,
		default: 'md',
		validator: (value) => ['md', 'sm'].includes(value)
	}
})

const { $wagmiConfig, $appKitModal } = useNuxtApp()
const stakingStore = useStakingStore()

// Modal instance
const modal = ref(null)

// AppKit account (client-side only) - initialized at top level for proper reactivity
const appKitAccount = useAppKitAccount()

// Computed properties derived from AppKit state with fallback to staking store
const address = computed(() => appKitAccount.address?.value || stakingStore.address || null)
const isConnected = computed(() => appKitAccount.isConnected?.value || stakingStore.isConnected || false)

// Helper for responsive props
const getResponsiveValue = (prop, screenSize = 'largeScreen') => {
	if (typeof prop === 'object' && prop !== null) {
		return prop[screenSize] !== undefined ? prop[screenSize] : prop.largeScreen
	}
	return prop
}

// Determine if balance should be shown
const shouldShowBalance = computed(() => getResponsiveValue(props.showBalance))

// Formatted address
const formattedAddress = computed(() => {
	if (!address.value) return ''
	return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
})

// Balance display
const formattedBalance = computed(() => {
	if (!stakingStore.balance) return '0.0000'
	try {
		const value = parseFloat(formatEther(BigInt(stakingStore.balance)))
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 4,
		}).format(value)
	} catch {
		return '0.0000'
	}
})

// Target chain based on environment (mainnet or testnet)
const targetChain = computed(() => isMainnet() ? monadMainnet : monadTestnet)

// Network check
const isCorrectNetwork = computed(() => {
	return stakingStore.chainId === targetChain.value.id
})

// Open AppKit modal
function openModal() {
	modal.value?.open()
}

// Initialize modal and watchers
onMounted(() => {
	// Set modal instance from plugin
	modal.value = $appKitModal

	// Watch for Wagmi account changes (for staking store sync)
	const unwatchAccount = watchAccount($wagmiConfig, {
		onChange(account) {
			if (account.isConnected && account.address) {
				// Update staking store
				stakingStore.address = account.address
				stakingStore.isConnected = true
				stakingStore.chainId = account.chainId

				// Fetch staking data
				stakingStore.fetchBalance()
				stakingStore.fetchUserStakingData()
			} else {
				// Reset staking data on disconnect
				stakingStore.resetUserData()
			}
		}
	})

	// Watch for chain/network changes
	const unwatchChain = watchChainId($wagmiConfig, {
		onChange(chainId) {
			if (chainId) {
				stakingStore.chainId = chainId

				// Show notification if wrong network
				if (chainId !== targetChain.value.id) {
					showNetworkSwitchRequiredNotification()
				}

				// Refetch balance on network change
				if (stakingStore.isConnected && stakingStore.address) {
					stakingStore.fetchBalance()
				}
			}
		}
	})

	// Cleanup watchers on unmount
	onUnmounted(() => {
		unwatchAccount?.()
		unwatchChain?.()
	})
})
</script>

<template>
	<div :class="$style.walletModal">
		<!-- Connected State -->
		<button
			v-if="isConnected"
			@click="openModal"
			:class="$style.connectedButton"
			aria-label="Open wallet menu"
		>
			<!-- Balance -->
			<div v-if="shouldShowBalance" :class="$style.balance">
				{{ formattedBalance }} MON
			</div>

			<!-- Address -->
			<div :class="$style.address">
				<div :class="$style.avatar">
					{{ address?.slice(2, 4).toUpperCase() }}
				</div>
				<span>{{ formattedAddress }}</span>
			</div>

			<!-- Network indicator -->
			<div :class="[$style.networkDot, { [$style.wrong]: !isCorrectNetwork }]" />
		</button>

		<!-- Disconnected State -->
		<Button
			v-else
			@click="openModal"
			:size="size === 'sm' ? 'mini' : 'medium'"
			type="primary"
			aria-label="Connect wallet"
		>
			{{ label }}
		</Button>
	</div>
</template>

<style module lang="scss">
.walletModal {
	position: relative;
	display: inline-block;
}

.connectedButton {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 16px;
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 12px;
	cursor: pointer;
	transition: all 0.2s ease;
	min-height: 44px;
	font: inherit;

	&:hover {
		border-color: var(--brand);
		background: var(--op-5);
		transform: translateY(-1px);
	}

	&:active {
		transform: translateY(0);
	}

	&:focus-visible {
		outline: 2px solid var(--brand);
		outline-offset: 2px;
	}
}

.balance {
	font-size: 13px;
	font-weight: 600;
	color: var(--txt-primary);
	padding-right: 12px;
	border-right: 1px solid var(--op-5);
}

.address {
	display: flex;
	align-items: center;
	gap: 8px;

	span {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 13px;
		font-weight: 500;
		color: var(--txt-primary);
	}
}

.avatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.5px;
}

.networkDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--green);
	flex-shrink: 0;

	&.wrong {
		background: var(--red);
	}
}

// Responsive adjustments
@media (max-width: 768px) {
	.connectedButton {
		gap: 8px;
		padding: 8px 12px;
	}

	.balance {
		display: none;
	}
}
</style>
