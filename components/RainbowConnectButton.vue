<script setup>
import { 
	connect, 
	disconnect, 
	getAccount, 
	switchChain, 
	getBalance,
	watchAccount,
	watchChainId,
	waitForTransactionReceipt
} from '@wagmi/core'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'
import { formatEther } from 'viem'
import { monadTestnet } from '~/config/chains'
import { useStakingStore } from '~/store/staking.store'

// UI Components
import Button from '@/components/ui/Button.vue'
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

// Props (RainbowKit-style)
const props = defineProps({
	label: {
		type: String,
		default: 'Connect Wallet'
	},
	accountStatus: {
		type: [String, Object],
		default: 'full' // 'full', 'avatar', 'address'
	},
	chainStatus: {
		type: [String, Object], 
		default: () => ({ smallScreen: 'icon', largeScreen: 'full' }) // 'full', 'icon', 'name', 'none'
	},
	showBalance: {
		type: [Boolean, Object],
		default: () => ({ smallScreen: false, largeScreen: true })
	}
})

const stakingStore = useStakingStore()
const { $wagmiConfig } = useNuxtApp()

// Reactive state
const isConnecting = ref(false)
const showAccountModal = ref(false)
const showConnectModal = ref(false)
const error = ref('')
const account = ref(null)
const balance = ref('0')
const chainId = ref(null)

// Available connectors (RainbowKit style)
const connectors = [
	{
		id: 'injected',
		name: 'Browser Wallet',
		icon: '🔗',
		connector: injected()
	},
	{
		id: 'metamask',
		name: 'MetaMask',
		icon: '🦊',
		connector: metaMask()
	},
	{
		id: 'walletconnect',
		name: 'WalletConnect',
		icon: '📱',
		connector: walletConnect({
			projectId: useRuntimeConfig().public.WALLET_CONNECT_PROJECT_ID || 'demo-project-id'
		})
	}
]

// Computed values
const isConnected = computed(() => account.value?.isConnected || false)
const isCorrectNetwork = computed(() => {
	if (!chainId.value) return false
	// MetaMask returns chainId as hex string, convert to number for comparison
	const currentChainIdNum = typeof chainId.value === 'string' 
		? parseInt(chainId.value, 16) 
		: chainId.value
	return currentChainIdNum === monadTestnet.id
})
const formattedAddress = computed(() => {
	if (!account.value?.address) return ''
	const addr = account.value.address
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`
})
const formattedBalance = computed(() => {
	try {
		return parseFloat(formatEther(BigInt(balance.value || '0'))).toFixed(4)
	} catch {
		return '0.0000'
	}
})

// Responsive helpers
const getResponsiveValue = (prop, screenSize = 'largeScreen') => {
	if (typeof prop === 'object' && prop !== null) {
		return prop[screenSize] !== undefined ? prop[screenSize] : prop.largeScreen
	}
	return prop
}

// Initialize wallet watchers
function initializeWatchers() {
	if (!$wagmiConfig) return
	
	// Watch account changes
	watchAccount($wagmiConfig, {
		onChange: (accountData) => {
			account.value = accountData
			if (accountData.isConnected && accountData.address) {
				fetchBalance()
				stakingStore.address = accountData.address
				stakingStore.isConnected = true
				stakingStore.fetchUserStakingData()
			} else {
				stakingStore.resetUserData()
			}
		}
	})
	
	// Watch chain changes
	watchChainId($wagmiConfig, {
		onChange: (newChainId) => {
			chainId.value = newChainId
			stakingStore.chainId = newChainId
			// Convert hex chainId to number for comparison
			const chainIdNum = typeof newChainId === 'string' 
				? parseInt(newChainId, 16) 
				: newChainId
			stakingStore.isCorrectNetwork = chainIdNum === monadTestnet.id
		}
	})
	
	// Get initial state
	const initialAccount = getAccount($wagmiConfig)
	account.value = initialAccount
	
	// Get initial chain ID
	const currentChainId = $wagmiConfig.state.chainId
	chainId.value = currentChainId
	
	// Set initial staking store chain state
	if (currentChainId) {
		stakingStore.chainId = currentChainId
		const chainIdNum = typeof currentChainId === 'string' 
			? parseInt(currentChainId, 16) 
			: currentChainId
		stakingStore.isCorrectNetwork = chainIdNum === monadTestnet.id
	}
	
	if (initialAccount.isConnected) {
		fetchBalance()
		stakingStore.address = initialAccount.address
		stakingStore.isConnected = true
	}
}

// Fetch balance
async function fetchBalance() {
	if (!account.value?.address || !$wagmiConfig) return
	
	try {
		const balanceData = await getBalance($wagmiConfig, {
			address: account.value.address,
			chainId: monadTestnet.id,
		})
		balance.value = balanceData.value.toString()
		stakingStore.balance = balanceData.value.toString()
	} catch (err) {
		console.error('Failed to fetch balance:', err)
	}
}

// Connect wallet
async function connectWallet(connector) {
	if (isConnecting.value || !$wagmiConfig) return
	
	isConnecting.value = true
	error.value = ''
	
	try {
		await connect($wagmiConfig, {
			connector: connector.connector
		})
		
		// Switch to Monad testnet if not already on it
		if (!isCorrectNetwork.value) {
			await switchToMonadNetwork()
		}
		
		showConnectModal.value = false
	} catch (err) {
		console.error('Failed to connect wallet:', err)
		error.value = err.message || 'Failed to connect wallet'
	} finally {
		isConnecting.value = false
	}
}

// Disconnect wallet
async function disconnectWallet() {
	if (!$wagmiConfig) return
	
	try {
		await disconnect($wagmiConfig)
		stakingStore.resetUserData()
		showAccountModal.value = false
	} catch (err) {
		console.error('Failed to disconnect wallet:', err)
	}
}

// Switch to Monad network
async function switchToMonadNetwork() {
	if (!$wagmiConfig) return
	
	try {
		// First try to switch to the chain
		await switchChain($wagmiConfig, {
			chainId: monadTestnet.id
		})
	} catch (switchError) {
		// If switching fails, try to add the chain first
		if (switchError.code === 4902 || switchError.message.includes('Unrecognized chain ID')) {
			try {
				const chainParams = {
					chainId: `0x${monadTestnet.id.toString(16)}`, // Convert to hex
					chainName: monadTestnet.name,
					nativeCurrency: monadTestnet.nativeCurrency,
					rpcUrls: [monadTestnet.rpcUrls.default.http[0]],
					blockExplorerUrls: [monadTestnet.blockExplorers.default.url],
				}
				
				// Check if MetaMask is available
				if (!window.ethereum) {
					error.value = 'MetaMask not found. Please install MetaMask.'
					return
				}
				
				// Add the chain to MetaMask
				await window.ethereum.request({
					method: 'wallet_addEthereumChain',
					params: [chainParams]
				})
				
				// After adding, try to switch again
				await switchChain($wagmiConfig, {
					chainId: monadTestnet.id
				})
			} catch (addError) {
				console.error('Failed to add/switch network:', addError)
				error.value = 'Failed to add Monad Testnet. Please add it manually in your wallet.'
			}
		} else {
			console.error('Failed to switch network:', switchError)
			error.value = 'Please switch to Monad Testnet manually'
		}
	}
}

// Copy address to clipboard
async function copyAddress() {
	if (!account.value?.address) return
	
	try {
		await navigator.clipboard.writeText(account.value.address)
		// Could show toast notification here
	} catch (err) {
		console.error('Failed to copy address:', err)
	}
}

// Initialize on mount
onMounted(() => {
	initializeWatchers()
})

// State tracking for UI purposes only
// Actual dropdown state is managed by DropdownContainer
</script>

<template>
	<div class="rainbow-connect-button">
		<!-- Connection Error -->
		<div v-if="error" class="error-banner">
			<span class="error-icon">⚠️</span>
			<span class="error-text">{{ error }}</span>
			<button @click="error = ''" class="error-close">×</button>
		</div>

		<!-- Network Warning -->
		<div v-if="isConnected && !isCorrectNetwork" class="network-warning">
			<span class="warning-icon">🔄</span>
			<span class="warning-text">Wrong network detected</span>
			<Button 
				size="small" 
				type="secondary" 
				@click="switchToMonadNetwork"
			>
				Switch to Monad
			</Button>
		</div>

		<!-- Connected State -->
		<div v-if="isConnected" class="connected-state">
			<Dropdown position="end" @onClose="showAccountModal = false" @onOpen="showAccountModal = true">
				<template #trigger>
					<div class="account-button">
						<!-- Chain Status -->
						<div 
							v-if="getResponsiveValue(chainStatus) !== 'none'" 
							class="chain-info"
							:class="{
								'show-icon': getResponsiveValue(chainStatus).includes('icon'),
								'show-name': getResponsiveValue(chainStatus).includes('name') || getResponsiveValue(chainStatus) === 'full'
							}"
						>
							<div class="chain-icon">🔗</div>
							<span v-if="getResponsiveValue(chainStatus) === 'name' || getResponsiveValue(chainStatus) === 'full'" class="chain-name">
								{{ isCorrectNetwork ? 'Monad' : 'Wrong Network' }}
							</span>
						</div>

						<!-- Account Info -->
						<div class="account-info">
							<!-- Balance -->
							<div 
								v-if="getResponsiveValue(showBalance)" 
								class="balance"
							>
								{{ formattedBalance }} MON
							</div>

							<!-- Account Status -->
							<div class="account-status">
								<div 
									v-if="getResponsiveValue(accountStatus) === 'avatar' || getResponsiveValue(accountStatus) === 'full'"
									class="avatar"
								>
									<div class="avatar-circle">{{ account?.address?.slice(2, 4).toUpperCase() }}</div>
								</div>
								<span 
									v-if="getResponsiveValue(accountStatus) === 'address' || getResponsiveValue(accountStatus) === 'full'"
									class="address"
								>
									{{ formattedAddress }}
								</span>
							</div>
						</div>

						<div class="dropdown-arrow">▼</div>
					</div>
				</template>

				<template #popup>
					<div class="account-modal">
						<div class="modal-header">
							<div class="account-details">
								<div class="full-address">{{ account.address }}</div>
								<button @click="copyAddress" class="copy-button" tabindex="1">
									📋 Copy Address
								</button>
							</div>
						</div>
						
						<div class="modal-section">
							<div class="balance-detail">
								<span class="label">Balance:</span>
								<span class="value">{{ formattedBalance }} MON</span>
							</div>
							<div class="network-detail">
								<span class="label">Network:</span>
								<span class="value" :class="{ 'correct': isCorrectNetwork, 'incorrect': !isCorrectNetwork }">
									{{ isCorrectNetwork ? 'Monad Testnet' : 'Wrong Network' }}
								</span>
							</div>
						</div>

						<div class="modal-actions">
							<button @click="disconnectWallet" class="disconnect-button" tabindex="1">
								Disconnect
							</button>
						</div>
					</div>
				</template>
			</Dropdown>
		</div>

		<!-- Disconnected State -->
		<div v-else class="disconnected-state">
			<Dropdown position="end" @onClose="showConnectModal = false" @onOpen="showConnectModal = true">
				<template #trigger>
					<Button 
						:loading="isConnecting" 
						:disabled="isConnecting"
						size="medium"
						type="primary"
					>
						{{ isConnecting ? 'Connecting...' : label }}
					</Button>
				</template>

				<template #popup>
					<div class="connect-modal">
						<div class="modal-header">
							<h3>Connect Wallet</h3>
							<p>Choose how you'd like to connect</p>
						</div>
						
						<div class="connector-list">
							<button 
								v-for="connector in connectors"
								:key="connector.id"
								@click="connectWallet(connector)"
								:disabled="isConnecting"
								class="connector-item"
								tabindex="1"
							>
								<span class="connector-icon">{{ connector.icon }}</span>
								<span class="connector-name">{{ connector.name }}</span>
							</button>
						</div>

						<div class="modal-footer">
							<p class="network-info">
								Will connect to Monad Testnet
							</p>
						</div>
					</div>
				</template>
			</Dropdown>
		</div>
	</div>
</template>

<style scoped lang="scss">
.rainbow-connect-button {
	position: relative;
}

.error-banner {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 1000;
	background: linear-gradient(135deg, #ff6b6b, #ee5a52);
	padding: 12px 16px;
	color: white;
	display: flex;
	align-items: center;
	gap: 8px;
}

.error-icon {
	font-size: 16px;
}

.error-text {
	flex: 1;
	font-weight: 500;
}

.error-close {
	background: none;
	border: none;
	color: white;
	font-size: 20px;
	cursor: pointer;
	padding: 0;
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	
	&:hover {
		opacity: 0.8;
	}
}

.network-warning {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 999;
	background: linear-gradient(135deg, #ffa726, #ff9800);
	padding: 12px 16px;
	color: white;
	display: flex;
	align-items: center;
	gap: 12px;
	
	.warning-icon {
		font-size: 16px;
	}
	
	.warning-text {
		flex: 1;
		font-weight: 500;
	}
}

.connected-state {
	.account-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: var(--card-background);
		border: 1px solid var(--op-5);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		min-height: 40px;
		
		&:hover {
			border-color: var(--brand);
		}
	}
	
	.chain-info {
		display: flex;
		align-items: center;
		gap: 4px;
		
		.chain-icon {
			width: 16px;
			height: 16px;
			font-size: 12px;
		}
		
		.chain-name {
			font-size: 12px;
			font-weight: 500;
			color: var(--txt-secondary);
		}
	}
	
	.account-info {
		display: flex;
		align-items: center;
		gap: 8px;
		
		.balance {
			font-size: 12px;
			font-weight: 600;
			color: var(--txt-primary);
		}
		
		.account-status {
			display: flex;
			align-items: center;
			gap: 6px;
			
			.avatar {
				.avatar-circle {
					width: 24px;
					height: 24px;
					border-radius: 50%;
					background: linear-gradient(135deg, #667eea, #764ba2);
					color: white;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 10px;
					font-weight: 600;
				}
			}
			
			.address {
				font-family: 'Source Code Pro', monospace;
				font-size: 13px;
				font-weight: 500;
				color: var(--txt-primary);
			}
		}
	}
	
	.dropdown-arrow {
		font-size: 10px;
		color: var(--txt-secondary);
		transition: transform 0.2s ease;
	}
}

.account-modal,
.connect-modal {
	min-width: 280px;
	
	.modal-header {
		padding: 16px;
		border-bottom: 1px solid var(--op-5);
		
		.account-details {
			.full-address {
				font-family: 'Source Code Pro', monospace;
				font-size: 12px;
				color: var(--txt-secondary);
				word-break: break-all;
				margin-bottom: 8px;
			}
			
			.copy-button {
				display: flex;
				align-items: center;
				gap: 6px;
				background: none;
				border: none;
				color: var(--brand);
				cursor: pointer;
				font-size: 12px;
				padding: 4px 0;
				
				&:hover {
					text-decoration: underline;
				}
			}
		}
		
		h3 {
			margin: 0 0 4px 0;
			font-size: 16px;
			font-weight: 600;
			color: var(--txt-primary);
		}
		
		p {
			margin: 0;
			font-size: 13px;
			color: var(--txt-secondary);
		}
	}
	
	.modal-section {
		padding: 12px 16px;
		border-bottom: 1px solid var(--op-5);
		
		.balance-detail,
		.network-detail {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 8px;
			
			&:last-child {
				margin-bottom: 0;
			}
			
			.label {
				font-size: 13px;
				color: var(--txt-secondary);
			}
			
			.value {
				font-size: 13px;
				font-weight: 500;
				
				&.correct {
					color: var(--green);
				}
				
				&.incorrect {
					color: var(--red);
				}
			}
		}
	}
	
	.modal-actions {
		padding: 12px 16px;
		
		.disconnect-button {
			width: 100%;
			padding: 8px 16px;
			background: var(--red);
			color: var(--txt-white);
			border: none;
			border-radius: 8px;
			font-size: 13px;
			font-weight: 500;
			cursor: pointer;
			transition: background-color 0.2s ease;
			
			&:hover {
				background: var(--dark-red);
			}
		}
	}
	
	.connector-list {
		padding: 8px;
		
		.connector-item {
			width: 100%;
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 12px;
			background: none;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			transition: background-color 0.2s ease;
			
			&:hover:not(:disabled) {
				background: var(--op-5);
			}
			
			&:disabled {
				opacity: 0.6;
				cursor: not-allowed;
			}
			
			.connector-icon {
				font-size: 20px;
			}
			
			.connector-name {
				font-size: 14px;
				font-weight: 500;
				color: var(--txt-primary);
			}
		}
	}
	
	.modal-footer {
		padding: 12px 16px;
		border-top: 1px solid var(--op-5);
		
		.network-info {
			margin: 0;
			font-size: 12px;
			color: var(--txt-secondary);
			text-align: center;
		}
	}
}

// Responsive behavior
@media (max-width: 768px) {
	.connected-state .account-button {
		.chain-info .chain-name,
		.account-info .balance {
			display: none;
		}
	}
}
</style>
