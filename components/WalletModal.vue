<script setup>
import { injected, metaMask, walletConnect } from 'wagmi/connectors'
import { monadTestnet } from '~/config/chains'
import { useStakingStore } from '~/store/staking.store'
import { useWalletConnection } from '~/composables/useWalletConnection'
import { useNetworkValidation } from '~/composables/useNetworkValidation'
import {
	showSuccessNotification,
	showNetworkSwitchRequiredNotification,
} from '~/utils/notifications'

// UI Components
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'

// SVG Icons
import BrowserWalletIcon from '@/assets/logos/wallet-browser.svg?raw'
import MetaMaskIcon from '@/assets/logos/wallet-metamask.svg?raw'
import WalletConnectIcon from '@/assets/logos/wallet-connect.svg?raw'

// Props
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
		default: () => ({ smallScreen: true, largeScreen: true })
	}
})

const stakingStore = useStakingStore()

// Use wallet connection composable
const {
	account,
	balance,
	chainId,
	isConnecting,
	connectingWallet,
	isConnected,
	address,
	formattedAddress,
	formattedBalance,
	connectWallet: _connectWallet,
	disconnectWallet: _disconnectWallet,
	copyAddress: _copyAddress,
	initializeWatchers,
} = useWalletConnection()

// Use network validation composable
const {
	isCorrectNetwork,
	switchToMonadNetwork: _switchToMonadNetwork,
} = useNetworkValidation()

// UI state
const showAccountModal = ref(false)
const showConnectModal = ref(false)
const addressCopied = ref(false)

// Available connectors
const connectors = [
	{
		id: 'injected',
		name: 'Browser Wallet',
		description: 'Connect with browser extension',
		icon: BrowserWalletIcon,
		connector: injected()
	},
	{
		id: 'metamask',
		name: 'MetaMask',
		description: 'Connect with MetaMask',
		icon: MetaMaskIcon,
		connector: metaMask()
	},
	{
		id: 'walletconnect',
		name: 'WalletConnect',
		description: 'Scan with mobile wallet',
		icon: WalletConnectIcon,
		connector: walletConnect({
			projectId: useRuntimeConfig().public.WALLET_CONNECT_PROJECT_ID || 'demo-project-id'
		})
	}
]

// Responsive helpers
const getResponsiveValue = (prop, screenSize = 'largeScreen') => {
	if (typeof prop === 'object' && prop !== null) {
		return prop[screenSize] !== undefined ? prop[screenSize] : prop.largeScreen
	}
	return prop
}

// Initialize wallet watchers with staking store integration
function initializeWalletWatchers() {
	initializeWatchers({
		onAccountChange: (accountData) => {
			if (accountData.isConnected && accountData.address) {
				stakingStore.address = accountData.address
				stakingStore.isConnected = true
				// Let store fetch its own balance to avoid race condition
				stakingStore.fetchBalance()
				stakingStore.fetchUserStakingData()
			} else {
				stakingStore.resetUserData()
			}
		},
		onChainChange: (newChainId) => {
			const chainIdNum = typeof newChainId === 'string'
				? parseInt(newChainId, 16)
				: newChainId

			stakingStore.chainId = newChainId

			if (chainIdNum !== monadTestnet.id) {
				showNetworkSwitchRequiredNotification()
			}

			// Refetch balance after network switch
			if (stakingStore.isConnected && stakingStore.address) {
				stakingStore.fetchBalance()
			}
		}
	})

	// Set initial chainId to stakingStore
	stakingStore.chainId = chainId.value
}

// Connect wallet
async function connectWallet(connector) {
	const success = await _connectWallet(connector.connector, connector.name)

	if (success) {
		// Switch to Monad testnet if not already on it
		if (!isCorrectNetwork.value) {
			await _switchToMonadNetwork()
		}
		showConnectModal.value = false
	}
}

// Disconnect wallet
async function disconnectWallet() {
	await _disconnectWallet()
	stakingStore.resetUserData()
	showAccountModal.value = false
}

// Switch to Monad network (using composable)
async function switchToMonadNetwork() {
	await _switchToMonadNetwork()
}

// Copy address to clipboard
async function copyAddress() {
	const success = await _copyAddress()

	if (success) {
		addressCopied.value = true
		showSuccessNotification(
			'Address Copied',
			'Wallet address copied to clipboard',
			2000
		)
		setTimeout(() => {
			addressCopied.value = false
		}, 2000)
	}
}

// Initialize on mount
onMounted(() => {
	initializeWalletWatchers()
})
</script>

<template>
	<div :class="$style.walletModal">
		<!-- Connected State -->
		<div v-if="isConnected" :class="$style.connectedState">
			<button
				@click="showAccountModal = true"
				:class="$style.accountButton"
				aria-label="Open account modal"
			>
				<!-- Chain Status -->
				<div
					v-if="getResponsiveValue(chainStatus) !== 'none'"
					:class="$style.chainInfo"
				>
					<div :class="$style.chainIcon">
						<Icon name="link" size="14" />
					</div>
					<span
						v-if="getResponsiveValue(chainStatus) === 'name' || getResponsiveValue(chainStatus) === 'full'"
						:class="$style.chainName"
					>
						{{ isCorrectNetwork ? 'Monad' : 'Wrong Network' }}
					</span>
				</div>

				<!-- Account Info -->
				<div :class="$style.accountInfo">
					<!-- Balance -->
					<div
						v-if="getResponsiveValue(showBalance)"
						:class="$style.balance"
					>
						{{ formattedBalance }} MON
					</div>

					<!-- Account Status -->
					<div :class="$style.accountStatus">
						<div
							v-if="getResponsiveValue(accountStatus) === 'avatar' || getResponsiveValue(accountStatus) === 'full'"
							:class="$style.avatar"
						>
							<div :class="$style.avatarCircle">
								{{ account?.address?.slice(2, 4).toUpperCase() }}
							</div>
						</div>
						<span
							v-if="getResponsiveValue(accountStatus) === 'address' || getResponsiveValue(accountStatus) === 'full'"
							:class="$style.address"
						>
							{{ formattedAddress }}
						</span>
					</div>
				</div>

				<Icon name="arrow_down" size="12" :class="$style.dropdownArrow" />
			</button>
		</div>

		<!-- Disconnected State -->
		<div v-else :class="$style.disconnectedState">
			<Button
				@click="showConnectModal = true"
				:loading="isConnecting"
				:disabled="isConnecting"
				size="medium"
				type="primary"
				aria-label="Connect wallet"
			>
				{{ isConnecting ? 'Connecting...' : label }}
			</Button>
		</div>

		<!-- Connect Modal -->
		<Modal
			:show="showConnectModal"
			@onClose="showConnectModal = false"
			:width="400"
			:closable="!isConnecting"
			:blockClosing="isConnecting"
		>
			<div :class="$style.modalContent">
				<div :class="$style.modalHeader">
					<h3 :class="$style.modalTitle">Connect Wallet</h3>
					<p :class="$style.modalSubtitle">Choose your preferred wallet to connect</p>
				</div>

				<div :class="$style.connectorList">
					<button
						v-for="connector in connectors"
						:key="connector.id"
						@click="connectWallet(connector)"
						:disabled="isConnecting"
						:class="[
							$style.connectorCard,
							{ [$style.connecting]: connectingWallet === connector.id }
						]"
						:aria-label="`Connect with ${connector.name}`"
					>
						<div :class="$style.connectorIcon" v-html="connector.icon"></div>
						<div :class="$style.connectorContent">
							<span :class="$style.connectorName">{{ connector.name }}</span>
							<span :class="$style.connectorDescription">{{ connector.description }}</span>
						</div>
						<Icon
							v-if="connectingWallet === connector.id"
							name="loader"
							size="20"
							:class="$style.spinner"
						/>
						<Icon
							v-else
							name="arrow_right"
							size="16"
							:class="$style.arrow"
						/>
					</button>
				</div>

				<div :class="$style.modalFooter">
					<div :class="$style.networkBadge">
						<Icon name="link" size="12" />
						<span>Monad Testnet</span>
					</div>
				</div>
			</div>
		</Modal>

		<!-- Account Modal -->
		<Modal
			:show="showAccountModal"
			@onClose="showAccountModal = false"
			:width="380"
		>
			<div :class="$style.modalContent">
				<div :class="$style.accountModalHeader">
					<div :class="$style.accountAvatar">
						{{ account?.address?.slice(2, 4).toUpperCase() }}
					</div>
					<div :class="$style.accountDetails">
						<span :class="$style.accountLabel">Connected Account</span>
						<span :class="$style.accountAddress">{{ formattedAddress }}</span>
					</div>
				</div>

				<div :class="$style.accountFullAddress">
					<span :class="$style.fullAddressText">{{ account?.address }}</span>
					<button
						@click="copyAddress"
						:class="[$style.copyButton, { [$style.copied]: addressCopied }]"
						:aria-label="addressCopied ? 'Address copied' : 'Copy address'"
					>
						<Icon
							:name="addressCopied ? 'check' : 'copy'"
							size="14"
						/>
						{{ addressCopied ? 'Copied!' : 'Copy' }}
					</button>
				</div>

				<div :class="$style.accountStats">
					<div :class="$style.statCard">
						<div :class="$style.statLabel">
							<Icon name="coins" size="14" />
							<span>Balance</span>
						</div>
						<div :class="$style.statValue">
							{{ formattedBalance }} <span :class="$style.statUnit">MON</span>
						</div>
					</div>

					<div :class="$style.statCard">
						<div :class="$style.statLabel">
							<Icon name="link" size="14" />
							<span>Network</span>
						</div>
						<div :class="[$style.statValue, { [$style.correct]: isCorrectNetwork, [$style.incorrect]: !isCorrectNetwork }]">
							{{ isCorrectNetwork ? 'Monad Testnet' : 'Wrong Network' }}
						</div>
					</div>
				</div>

				<div v-if="!isCorrectNetwork" :class="$style.networkWarning">
					<Icon name="warning" size="16" />
					<span>You're on the wrong network</span>
					<Button
						size="mini"
						type="secondary"
						@click="switchToMonadNetwork"
					>
						Switch Network
					</Button>
				</div>

				<div :class="$style.modalActions">
					<Button
						@click="disconnectWallet"
						type="secondary"
						size="medium"
						:class="$style.disconnectButton"
						aria-label="Disconnect wallet"
					>
						<Icon name="logout" size="16" />
						Disconnect Wallet
					</Button>
				</div>
			</div>
		</Modal>
	</div>
</template>

<style module lang="scss">
.walletModal {
	position: relative;
}

.connectedState {
	.accountButton {
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

	.chainInfo {
		display: flex;
		align-items: center;
		gap: 6px;
		padding-right: 12px;
		border-right: 1px solid var(--op-5);

		.chainIcon {
			display: flex;
			align-items: center;
			justify-content: center;
			fill: var(--txt-secondary);
		}

		.chainName {
			font-size: 13px;
			font-weight: 500;
			color: var(--txt-secondary);
		}
	}

	.accountInfo {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;

		.balance {
			font-size: 13px;
			font-weight: 600;
			color: var(--txt-primary);
		}

		.accountStatus {
			display: flex;
			align-items: center;
			gap: 8px;

			.avatar {
				.avatarCircle {
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
			}

			.address {
				font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
				font-size: 13px;
				font-weight: 500;
				color: var(--txt-primary);
			}
		}
	}

	.dropdownArrow {
		fill: var(--txt-tertiary);
		transition: transform 0.2s ease;
	}
}

.modalContent {
	padding: 8px;
}

.modalHeader {
	text-align: center;
	padding: 16px 0 24px;

	.modalTitle {
		margin: 0 0 8px 0;
		font-size: 20px;
		font-weight: 700;
		color: var(--txt-primary);
	}

	.modalSubtitle {
		margin: 0;
		font-size: 14px;
		color: var(--txt-secondary);
		line-height: 1.5;
	}
}

.connectorList {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 0 0 16px;

	.connectorCard {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px;
		background: var(--card-background);
		border: 2px solid var(--op-5);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		font: inherit;

		&:hover:not(:disabled) {
			background: var(--op-5);
			border-color: var(--brand);
			transform: translateX(4px);
		}

		&:active:not(:disabled) {
			transform: translateX(2px);
		}

		&:focus-visible {
			outline: 2px solid var(--brand);
			outline-offset: 2px;
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		&.connecting {
			border-color: var(--brand);
			background: var(--op-5);
		}

		.connectorIcon {
			width: 40px;
			height: 40px;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;

			:global(svg) {
				width: 100%;
				height: 100%;
			}
		}

		.connectorContent {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 4px;

			.connectorName {
				font-size: 15px;
				font-weight: 600;
				color: var(--txt-primary);
			}

			.connectorDescription {
				font-size: 12px;
				color: var(--txt-tertiary);
			}
		}

		.spinner {
			fill: var(--brand);
			animation: spin 1s linear infinite;
		}

		.arrow {
			fill: var(--txt-tertiary);
			transition: transform 0.2s ease;
		}

		&:hover .arrow {
			transform: translateX(4px);
		}
	}
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.modalFooter {
	padding: 16px 0 8px;
	border-top: 1px solid var(--op-5);
	display: flex;
	justify-content: center;

	.networkBadge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		background: var(--op-5);
		border-radius: 20px;
		font-size: 12px;
		font-weight: 600;
		color: var(--txt-secondary);
		fill: var(--txt-secondary);
	}
}

.accountModalHeader {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px;
	background: var(--op-5);
	border-radius: 12px;
	margin-bottom: 16px;

	.accountAvatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		font-weight: 700;
		letter-spacing: 1px;
		flex-shrink: 0;
	}

	.accountDetails {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
		min-width: 0;

		.accountLabel {
			font-size: 12px;
			color: var(--txt-tertiary);
			font-weight: 500;
		}

		.accountAddress {
			font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
			font-size: 15px;
			font-weight: 600;
			color: var(--txt-primary);
		}
	}
}

.accountFullAddress {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px;
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 8px;
	margin-bottom: 16px;

	.fullAddressText {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 11px;
		color: var(--txt-secondary);
		word-break: break-all;
		flex: 1;
		line-height: 1.6;
	}

	.copyButton {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--op-5);
		border: 1px solid var(--op-10);
		border-radius: 6px;
		color: var(--txt-secondary);
		cursor: pointer;
		font-size: 12px;
		font-weight: 600;
		transition: all 0.2s ease;
		flex-shrink: 0;
		fill: var(--txt-secondary);

		&:hover {
			background: var(--op-10);
			color: var(--txt-primary);
			fill: var(--txt-primary);
		}

		&:focus-visible {
			outline: 2px solid var(--brand);
			outline-offset: 2px;
		}

		&.copied {
			background: var(--green);
			color: white;
			fill: white;
			border-color: var(--green);
		}
	}
}

.accountStats {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
	margin-bottom: 16px;

	.statCard {
		padding: 16px;
		background: var(--card-background);
		border: 1px solid var(--op-5);
		border-radius: 10px;

		.statLabel {
			display: flex;
			align-items: center;
			gap: 6px;
			font-size: 12px;
			color: var(--txt-tertiary);
			margin-bottom: 8px;
			fill: var(--txt-tertiary);
		}

		.statValue {
			font-size: 15px;
			font-weight: 700;
			color: var(--txt-primary);
			word-break: break-word;

			.statUnit {
				font-size: 12px;
				font-weight: 600;
				color: var(--txt-secondary);
			}

			&.correct {
				color: var(--green);
			}

			&.incorrect {
				color: var(--red);
			}
		}
	}
}

.networkWarning {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	background: rgba(255, 152, 0, 0.1);
	border: 1px solid var(--yellow);
	border-radius: 8px;
	margin-bottom: 16px;
	fill: var(--yellow);

	span {
		flex: 1;
		font-size: 13px;
		font-weight: 600;
		color: var(--yellow);
	}
}

.modalActions {
	.disconnectButton {
		width: 100%;
		justify-content: center;
		gap: 8px;
	}
}

// Responsive behavior
@media (max-width: 768px) {
	.connectedState .accountButton {
		.chainInfo .chainName {
			display: none;
		}

		.chainInfo {
			padding-right: 8px;
		}

		.accountInfo {
			gap: 8px;
		}
	}

	.accountStats {
		grid-template-columns: 1fr;
	}
}

// Very small screens
@media (max-width: 400px) {
	.accountFullAddress {
		flex-direction: column;
		align-items: stretch;

		.copyButton {
			width: 100%;
			justify-content: center;
		}
	}
}
</style>
