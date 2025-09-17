<script setup>
import { connect, disconnect, getAccount, switchChain } from '@wagmi/core'
import { injected, metaMask } from '@wagmi/core/connectors'
import { monadTestnet } from '~/config/chains'
import { useStakingStore } from '~/store/staking.store'

// UI Components
import Button from '@/components/ui/Button.vue'
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

const stakingStore = useStakingStore()
const { $web3Config } = useNuxtApp()

// Reactive state
const isConnecting = ref(false)
const showDropdown = ref(false)
const error = ref('')

// Available connectors
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
	}
]

// Computed values
const account = computed(() => stakingStore.address)
const isConnected = computed(() => stakingStore.isConnected)
const balance = computed(() => stakingStore.formattedBalance)
const isCorrectNetwork = computed(() => stakingStore.isCorrectNetwork)

// Format address for display
const formattedAddress = computed(() => {
	if (!account.value) return ''
	return `${account.value.slice(0, 6)}...${account.value.slice(-4)}`
})

// Initialize wallet on mount
onMounted(() => {
	stakingStore.initializeWallet()
})

// Connect wallet
async function connectWallet(connector) {
	if (isConnecting.value) return
	
	isConnecting.value = true
	error.value = ''
	
	try {
		await connect($web3Config, {
			connector: connector.connector
		})
		
		// Switch to Monad testnet if not already on it
		if (!isCorrectNetwork.value) {
			await switchToMonadNetwork()
		}
		
		showDropdown.value = false
	} catch (err) {
		console.error('Failed to connect wallet:', err)
		error.value = err.message || 'Failed to connect wallet'
	} finally {
		isConnecting.value = false
	}
}

// Disconnect wallet
async function disconnectWallet() {
	try {
		await disconnect($web3Config)
		stakingStore.resetUserData()
	} catch (err) {
		console.error('Failed to disconnect wallet:', err)
	}
}

// Switch to Monad network
async function switchToMonadNetwork() {
	try {
		await switchChain($web3Config, {
			chainId: monadTestnet.id
		})
	} catch (err) {
		console.error('Failed to switch network:', err)
		error.value = 'Please switch to Monad Testnet manually'
	}
}

// Copy address to clipboard
async function copyAddress() {
	if (!account.value) return
	
	try {
		await navigator.clipboard.writeText(account.value)
		// You could add a toast notification here
	} catch (err) {
		console.error('Failed to copy address:', err)
	}
}
</script>

<template>
	<div class="wallet-connect">
		<!-- Connection Error -->
		<div v-if="error" class="error-banner">
			<div class="error-content">
				<span class="error-icon">⚠️</span>
				<span class="error-text">{{ error }}</span>
				<button @click="error = ''" class="error-close">×</button>
			</div>
		</div>

		<!-- Network Warning -->
		<div v-if="isConnected && !isCorrectNetwork" class="network-warning">
			<div class="warning-content">
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
		</div>

		<!-- Connected State -->
		<div v-if="isConnected" class="wallet-connected">
			<Dropdown v-model="showDropdown" :right="true">
				<div class="wallet-info">
					<div class="wallet-balance">
						<span class="balance-amount">{{ balance }} MON</span>
						<span class="balance-label">Balance</span>
					</div>
					<div class="wallet-address">
						{{ formattedAddress }}
					</div>
					<div class="dropdown-arrow">
						<svg width="12" height="8" viewBox="0 0 12 8" fill="none">
							<path d="M1 1L6 6L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
				</div>

				<template #body>
					<div class="wallet-dropdown">
						<div class="dropdown-header">
							<div class="account-info">
								<div class="account-address">{{ account }}</div>
								<button @click="copyAddress" class="copy-button">
									<span class="copy-icon">📋</span>
									Copy Address
								</button>
							</div>
						</div>
						
						<div class="dropdown-section">
							<div class="balance-detail">
								<span class="label">Balance:</span>
								<span class="value">{{ balance }} MON</span>
							</div>
							<div class="network-detail">
								<span class="label">Network:</span>
								<span class="value" :class="{ 'correct': isCorrectNetwork, 'incorrect': !isCorrectNetwork }">
									{{ isCorrectNetwork ? 'Monad Testnet' : 'Wrong Network' }}
								</span>
							</div>
						</div>

						<div class="dropdown-actions">
							<button @click="disconnectWallet" class="disconnect-button">
								Disconnect Wallet
							</button>
						</div>
					</div>
				</template>
			</Dropdown>
		</div>

		<!-- Disconnected State -->
		<div v-else class="wallet-disconnected">
			<Dropdown v-model="showDropdown" :right="true">
				<Button 
					:loading="isConnecting" 
					:disabled="isConnecting"
					size="medium"
					type="primary"
				>
					{{ isConnecting ? 'Connecting...' : 'Connect Wallet' }}
				</Button>

				<template #body>
					<div class="connector-dropdown">
						<div class="dropdown-header">
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
							>
								<span class="connector-icon">{{ connector.icon }}</span>
								<span class="connector-name">{{ connector.name }}</span>
							</button>
						</div>

						<div class="dropdown-footer">
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

<style module lang="scss">
.wallet-connect {
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
	
	.error-content {
		display: flex;
		align-items: center;
		gap: 8px;
		max-width: 1200px;
		margin: 0 auto;
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
	
	.warning-content {
		display: flex;
		align-items: center;
		gap: 12px;
		max-width: 1200px;
		margin: 0 auto;
	}
	
	.warning-icon {
		font-size: 16px;
	}
	
	.warning-text {
		flex: 1;
		font-weight: 500;
	}
}

.wallet-connected {
	.wallet-info {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		background: var(--card-background, #ffffff);
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		
		&:hover {
			border-color: var(--primary-color, #007bff);
		}
	}
	
	.wallet-balance {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		
		.balance-amount {
			font-weight: 600;
			color: var(--text-primary, #000);
			font-size: 14px;
		}
		
		.balance-label {
			font-size: 12px;
			color: var(--text-secondary, #666);
		}
	}
	
	.wallet-address {
		font-family: 'Source Code Pro', monospace;
		font-size: 14px;
		color: var(--text-primary, #000);
		font-weight: 500;
	}
	
	.dropdown-arrow {
		color: var(--text-secondary, #666);
		transition: transform 0.2s ease;
	}
}

.wallet-dropdown {
	min-width: 280px;
	
	.dropdown-header {
		padding: 16px;
		border-bottom: 1px solid var(--border-color, #e1e5e9);
		
		.account-info {
			.account-address {
				font-family: 'Source Code Pro', monospace;
				font-size: 12px;
				color: var(--text-secondary, #666);
				word-break: break-all;
				margin-bottom: 8px;
			}
			
			.copy-button {
				display: flex;
				align-items: center;
				gap: 6px;
				background: none;
				border: none;
				color: var(--primary-color, #007bff);
				cursor: pointer;
				font-size: 12px;
				padding: 4px 0;
				
				&:hover {
					text-decoration: underline;
				}
				
				.copy-icon {
					font-size: 12px;
				}
			}
		}
	}
	
	.dropdown-section {
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-color, #e1e5e9);
		
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
				color: var(--text-secondary, #666);
			}
			
			.value {
				font-size: 13px;
				font-weight: 500;
				
				&.correct {
					color: var(--success-color, #28a745);
				}
				
				&.incorrect {
					color: var(--error-color, #dc3545);
				}
			}
		}
	}
	
	.dropdown-actions {
		padding: 12px 16px;
		
		.disconnect-button {
			width: 100%;
			padding: 8px 16px;
			background: var(--error-color, #dc3545);
			color: white;
			border: none;
			border-radius: 8px;
			font-size: 13px;
			font-weight: 500;
			cursor: pointer;
			transition: background-color 0.2s ease;
			
			&:hover {
				background: var(--error-color-dark, #c82333);
			}
		}
	}
}

.connector-dropdown {
	min-width: 240px;
	
	.dropdown-header {
		padding: 16px;
		border-bottom: 1px solid var(--border-color, #e1e5e9);
		
		h3 {
			margin: 0 0 4px 0;
			font-size: 16px;
			font-weight: 600;
			color: var(--text-primary, #000);
		}
		
		p {
			margin: 0;
			font-size: 13px;
			color: var(--text-secondary, #666);
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
				background: var(--hover-color, #f8f9fa);
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
				color: var(--text-primary, #000);
			}
		}
	}
	
	.dropdown-footer {
		padding: 12px 16px;
		border-top: 1px solid var(--border-color, #e1e5e9);
		
		.network-info {
			margin: 0;
			font-size: 12px;
			color: var(--text-secondary, #666);
			text-align: center;
		}
	}
}
</style>
