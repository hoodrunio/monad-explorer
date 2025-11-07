<script setup>
import { computed } from 'vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/Icon.vue'
import { useRouter } from 'vue-router';

const props = defineProps({
	show: {
		type: Boolean,
		default: false
	},
	transaction: {
		type: Object,
		default: null
	}
})

const emit = defineEmits(['close'])

// Debug: Watch transaction changes
watch(() => props.transaction, (newTx) => {
	if (newTx) {
	}
}, { deep: true })

// Auto-polling for pending transactions
let pollingInterval = null

onMounted(() => {
	// Start polling if transaction is pending
	if (isPending.value && props.transaction?.hash) {
		startPolling()
	}
})

onUnmounted(() => {
	if (pollingInterval) {
		clearInterval(pollingInterval)
	}
})

// Watch for status changes to stop/start polling
watch(() => props.transaction?.status, (newStatus) => {
	if (newStatus === 'pending' && props.transaction?.hash) {
		startPolling()
	} else {
		stopPolling()
	}
})

function startPolling() {
	if (pollingInterval) return // Already polling
	
	pollingInterval = setInterval(() => {
		if (isPending.value && props.transaction?.hash) {
			checkTransactionStatus()
		} else {
			stopPolling()
		}
	}, 5000) // Check every 5 seconds
}

function stopPolling() {
	if (pollingInterval) {
		clearInterval(pollingInterval)
		pollingInterval = null
	}
}

// Computed properties
const isSuccess = computed(() => props.transaction?.status === 'success')
const isError = computed(() => props.transaction?.status === 'failed' || props.transaction?.status === 'error')
const isPending = computed(() => props.transaction?.status === 'pending')

const transactionTypeText = computed(() => {
	if (!props.transaction?.type) return 'Transaction'
	
	const typeMap = {
		delegate: 'Stake',
		undelegate: 'Unstake', 
		compound: 'Compound',
		claimRewards: 'Claim Rewards',
		withdraw: 'Withdraw'
	}
	
	return typeMap[props.transaction.type] || 'Transaction'
})

const statusText = computed(() => {
	if (isSuccess.value) return 'Successful'
	if (isError.value) return 'Failed'
	if (isPending.value) return 'Processing...'
	return 'Unknown'
})

const statusIcon = computed(() => {
	if (isSuccess.value) return 'check'
	if (isError.value) return 'close'
	if (isPending.value) return 'clock'
	return 'info'
})

const statusColor = computed(() => {
	if (isSuccess.value) return 'green'
	if (isError.value) return 'red'
	if (isPending.value) return 'yellow'
	return 'primary'
})

// Methods
function handleClose() {
	emit('close')
}


const router = useRouter();

function openExplorer() {
	if (props.transaction?.hash) {
		router.push(`/tx/${props.transaction.hash}`);
	}
}

function copyHash() {
	if (props.transaction?.hash) {
		navigator.clipboard.writeText(props.transaction.hash)
	}
}

async function checkTransactionStatus() {
	if (!props.transaction?.hash) return
	
	try {
		const { useStakingStore } = await import('~/store/staking.store')
		const { useModalsStore } = await import('~/store/modals.store')
		const { waitForTransactionReceipt } = await import('@wagmi/core')
		
		const stakingStore = useStakingStore()
		const modalsStore = useModalsStore()
		const { $wagmiConfig } = useNuxtApp()		
		const receipt = await waitForTransactionReceipt($wagmiConfig, { 
			hash: props.transaction.hash,
			timeout: 10000 // 10 seconds timeout for manual check
		})
		
		// Update transaction with receipt info
		const updatedTransaction = {
			...props.transaction,
			status: receipt.status === 'success' ? 'success' : 'failed',
			blockNumber: receipt.blockNumber,
			gasUsed: receipt.gasUsed
		}
		
		modalsStore.updateTransactionResult(updatedTransaction)
		
	} catch (error) {
		// Manual transaction check failed
	}
}

// Close on escape key (only if not pending)
onMounted(() => {
	const handleKeydown = (e) => {
		if (e.key === 'Escape' && !isPending.value) {
			handleClose()
		}
	}
	document.addEventListener('keydown', handleKeydown)
	onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
})
</script>

<template>
	<div v-if="show && transaction" class="modal-overlay" @click.self="!isPending && handleClose()">
		<div class="modal-content">
			<!-- Header -->
			<div class="modal-header">
				<div class="status-indicator" :class="statusColor">
					<Icon :name="statusIcon" size="32" :color="statusColor" />
				</div>
				<button class="close-btn" :disabled="isPending" @click="!isPending && handleClose()">×</button>
			</div>

			<!-- Content -->
			<div class="modal-body">
				<div class="status-section">
					<h3>{{ transactionTypeText }} {{ statusText }}</h3>
					<p class="status-description">
						<template v-if="isSuccess">
							Your {{ transactionTypeText.toLowerCase() }} transaction has been confirmed on the blockchain.
						</template>
						<template v-else-if="isError">
							Your {{ transactionTypeText.toLowerCase() }} transaction failed. {{ transaction.error || 'Please try again.' }}
						</template>
						<template v-else-if="isPending">
							Your {{ transactionTypeText.toLowerCase() }} transaction is being processed. Please wait for blockchain confirmation.
						</template>
					</p>
					
					<!-- Loading indicator for pending transactions -->
					<div v-if="isPending" class="loading-indicator">
						<div class="spinner"></div>
						<span>Waiting for confirmation...</span>
						<button v-if="transaction.hash" class="refresh-btn" @click="checkTransactionStatus">
							<Icon name="refresh" size="16" />
						</button>
					</div>
				</div>

				<!-- Transaction Details -->
				<div class="transaction-details">
					<div v-if="transaction.amount" class="detail-item">
						<span class="label">Amount:</span>
						<span class="value">{{ transaction.amount }} MON</span>
					</div>
					
					<div v-if="transaction.valId" class="detail-item">
						<span class="label">Validator ID:</span>
						<span class="value">#{{ transaction.valId }}</span>
					</div>
					
					<div v-if="transaction.hash" class="detail-item">
						<span class="label">Transaction Hash:</span>
						<div class="hash-container">
							<span class="hash">{{ transaction.hash.slice(0, 10) }}...{{ transaction.hash.slice(-8) }}</span>
							<button class="copy-btn" @click="copyHash" title="Copy hash">
								<Icon name="copy" size="14" />
							</button>
						</div>
					</div>
					
					<div v-if="transaction.blockNumber && !isPending" class="detail-item">
						<span class="label">Block:</span>
						<span class="value">#{{ transaction.blockNumber }}</span>
					</div>
					
					<div v-if="transaction.gasUsed && !isPending" class="detail-item">
						<span class="label">Gas Used:</span>
						<span class="value">{{ Number(transaction.gasUsed).toLocaleString() }}</span>
					</div>
				</div>

				<!-- Additional Info for Unstake -->
				<div v-if="transaction.type === 'undelegate' && isSuccess" class="info-section">
					<div class="info-box">
						<Icon name="info" size="16" color="primary" />
						<div class="info-text">
							<p><strong>Withdrawal Delay:</strong> Your tokens are now unstaking and will be available for withdrawal after 1 epoch (~5.5 hours).</p>
							<p>You can check your pending withdrawals in the dashboard.</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="modal-footer">
				<Button 
					v-if="transaction.hash"
					type="secondary"
					size="medium"
					@click="openExplorer"
				>
					<Icon name="external-link" size="16" />
					View in Explorer
				</Button>
				<Button 
					type="primary"
					size="medium"
					@click="handleClose"
				>
					{{ isPending ? 'Close' : 'Done' }}
				</Button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.7);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	padding: 20px;
}

.modal-content {
	background: var(--card-background);
	border-radius: 16px;
	width: 100%;
	max-width: 480px;
	max-height: 90vh;
	overflow-y: auto;
	box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24px 24px 0;
	
	.status-indicator {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		
		&.green {
			background: var(--green-bg);
		}
		
		&.red {
			background: var(--error-bg);
		}
		
		&.yellow {
			background: var(--yellow-bg);
		}
		
		&.primary {
			background: var(--op-10);
		}
	}
	
	.close-btn {
		background: none;
		border: none;
		font-size: 24px;
		color: var(--txt-tertiary);
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		
		&:hover:not(:disabled) {
			background: var(--op-5);
			color: var(--txt-primary);
		}
		
		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
}

.modal-body {
	padding: 24px;
	
	.status-section {
		text-align: center;
		margin-bottom: 32px;
		
		h3 {
			margin: 0 0 8px 0;
			font-size: 20px;
			font-weight: 600;
			color: var(--txt-primary);
		}
		
		.status-description {
			margin: 0;
			color: var(--txt-secondary);
			font-size: 14px;
			line-height: 1.5;
		}
		
		.loading-indicator {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 12px;
			margin-top: 20px;
			padding: 16px;
			background: var(--op-5);
			border-radius: 8px;
			
			span {
				color: var(--txt-secondary);
				font-size: 14px;
			}
			
			.spinner {
				width: 20px;
				height: 20px;
				border: 2px solid var(--op-10);
				border-top: 2px solid var(--primary);
				border-radius: 50%;
				animation: spin 1s linear infinite;
			}
			
			.refresh-btn {
				background: none;
				border: 1px solid var(--op-10);
				color: var(--txt-secondary);
				padding: 8px;
				border-radius: 6px;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				transition: all 0.2s;
				
				&:hover {
					background: var(--op-5);
					color: var(--txt-primary);
					border-color: var(--op-20);
				}
			}
		}
	}
	
	.transaction-details {
		background: var(--op-5);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 24px;
		
		.detail-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			
			&:not(:last-child) {
				margin-bottom: 12px;
			}
			
			.label {
				color: var(--txt-secondary);
				font-size: 14px;
			}
			
			.value {
				color: var(--txt-primary);
				font-weight: 600;
				font-size: 14px;
			}
			
			.hash-container {
				display: flex;
				align-items: center;
				gap: 8px;
				
				.hash {
					color: var(--txt-primary);
					font-weight: 600;
					font-size: 14px;
					font-family: var(--font-mono);
				}
				
				.copy-btn {
					background: none;
					border: none;
					color: var(--txt-tertiary);
					cursor: pointer;
					padding: 4px;
					border-radius: 4px;
					display: flex;
					align-items: center;
					justify-content: center;
					
					&:hover {
						background: var(--op-10);
						color: var(--txt-primary);
					}
				}
			}
		}
	}
	
	.info-section {
		.info-box {
			display: flex;
			gap: 12px;
			padding: 16px;
			background: var(--op-5);
			border-radius: 12px;
			border-left: 4px solid var(--primary);
			
			.info-text {
				flex: 1;
				
				p {
					margin: 0;
					font-size: 14px;
					line-height: 1.5;
					color: var(--txt-secondary);
					
					&:not(:last-child) {
						margin-bottom: 8px;
					}
					
					strong {
						color: var(--txt-primary);
					}
				}
			}
		}
	}
}

.modal-footer {
	display: flex;
	gap: 12px;
	padding: 0 24px 24px;
	
	button {
		flex: 1;
	}
}

/* Animation for pending state */
.status-indicator.yellow .icon {
	animation: spin 2s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
