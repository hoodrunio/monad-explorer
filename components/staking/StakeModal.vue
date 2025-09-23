<script setup>
import { useStakingStore } from '~/store/staking.store'

// Components
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import ValidatorLogo from '@/components/ValidatorLogo.vue'

const props = defineProps({
	validator: {
		type: Object,
		default: null
	},
	show: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['close', 'success'])

const stakingStore = useStakingStore()

// State
const stakeAmount = ref('')
const loading = ref(false)
const error = ref('')

// Computed
const isConnected = computed(() => stakingStore.isConnected)
const availableBalance = computed(() => stakingStore.formattedAvailableBalance)
const maxAmount = computed(() => stakingStore.formattedAvailableBalance)

// Validation
const stakeAmountError = computed(() => {
	if (!stakeAmount.value) return ''
	
	const amount = parseFloat(stakeAmount.value)
	const maxBal = parseFloat(maxAmount.value)
	
	if (isNaN(amount) || amount <= 0) return 'Invalid amount'
	if (amount > maxBal) return 'Insufficient balance'
	
	return ''
})

const canStake = computed(() => {
	return stakeAmount.value && !stakeAmountError.value && !loading.value
})

// Actions
async function handleStake() {
	if (!canStake.value) return
	
	try {
		loading.value = true
		error.value = ''
		
		await stakingStore.delegate(props.validator.valId, stakeAmount.value)
		
		// Close this modal immediately after transaction starts
		handleClose()
		emit('success')
	} catch (err) {
		error.value = err.message || 'Failed to stake'
	} finally {
		loading.value = false
	}
}

function setMaxAmount() {
	stakeAmount.value = maxAmount.value
}

function handleClose() {
	stakeAmount.value = ''
	error.value = ''
	emit('close')
}

// Close on escape key
onMounted(() => {
	const handleKeydown = (e) => {
		if (e.key === 'Escape') handleClose()
	}
	document.addEventListener('keydown', handleKeydown)
	onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
})
</script>

<template>
	<div v-if="show && validator" class="modal-overlay" @click.self="handleClose">
		<div class="modal-content">
			<!-- Header -->
			<div class="modal-header">
				<div class="validator-info">
					<ValidatorLogo 
						:address="validator.secpPubkey?.replace('0x', '') || validator.authAddress"
						size="medium"
					/>
					<div class="validator-details">
						<h3>Stake to Validator #{{ validator.valId }}</h3>
						<div class="validator-meta">
							<span class="commission">{{ validator.formattedCommissionRate }}</span>
							<span class="status" :class="{ active: validator.isActive }">
								{{ validator.isActive ? 'Active' : 'Inactive' }}
							</span>
						</div>
					</div>
				</div>
				<button class="close-btn" @click="handleClose">×</button>
			</div>

			<!-- Content -->
			<div class="modal-body">
				<!-- Balance Info -->
				<div class="balance-info">
					<div class="balance-item">
						<span class="label">Available Balance:</span>
						<span class="value">{{ availableBalance }} MON</span>
					</div>
				</div>

				<!-- Warning for inactive validators -->
				<div v-if="!validator?.isActive" class="warning-message">
					⚠️ This validator is currently inactive and not participating in consensus. 
					Staking to inactive validators will not earn rewards until they become active again.
				</div>

				<!-- Stake Amount Input -->
				<div class="input-group">
					<label>Amount to Stake</label>
					<div class="input-wrapper">
						<Input
							v-model="stakeAmount"
							type="number"
							step="0.000001"
							placeholder="0.0"
							:error="stakeAmountError"
						/>
						<button class="max-btn" @click="setMaxAmount">MAX</button>
					</div>
				</div>

				<!-- Error Display -->
				<div v-if="error" class="error-message">
					{{ error }}
				</div>
			</div>

			<!-- Footer -->
			<div class="modal-footer">
				<Button 
					type="secondary"
					size="medium"
					@click="handleClose"
				>
					Cancel
				</Button>
				<Button 
					type="primary"
					size="medium"
					:loading="loading"
					:disabled="!canStake"
					@click="handleStake"
				>
					Stake {{ stakeAmount || '0' }} MON
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
	align-items: flex-start;
	justify-content: space-between;
	padding: 24px 24px 0;
	
	.validator-info {
		display: flex;
		align-items: center;
		gap: 16px;
		flex: 1;
		
		.validator-details {
			h3 {
				margin: 0 0 8px 0;
				font-size: 18px;
				font-weight: 600;
				color: var(--txt-primary);
			}
			
			.validator-meta {
				display: flex;
				align-items: center;
				gap: 12px;
				font-size: 12px;
				
				.commission {
					color: var(--txt-secondary);
				}
				
				.status {
					padding: 2px 8px;
					border-radius: 6px;
					background: var(--op-5);
					color: var(--txt-tertiary);
					
					&.active {
						background: var(--green);
						color: white;
					}
				}
			}
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
		
		&:hover {
			background: var(--op-5);
			color: var(--txt-primary);
		}
	}
}

.modal-body {
	padding: 24px;
	
	.balance-info {
		background: var(--op-5);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 24px;
		
		.balance-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			
			.label {
				color: var(--txt-secondary);
				font-size: 14px;
			}
			
			.value {
				color: var(--txt-primary);
				font-weight: 600;
				font-size: 14px;
			}
		}
	}
	
	.warning-message {
		background: rgba(255, 193, 7, 0.1);
		border: 1px solid rgba(255, 193, 7, 0.3);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 24px;
		color: var(--orange);
		font-weight: 500;
		font-size: 14px;
		line-height: 1.5;
	}
	
	.input-group {
		margin-bottom: 20px;
		
		label {
			display: block;
			margin-bottom: 8px;
			font-size: 14px;
			font-weight: 600;
			color: var(--txt-primary);
		}
		
		.input-wrapper {
			position: relative;
			
			.max-btn {
				position: absolute;
				right: 12px;
				top: 50%;
				transform: translateY(-50%);
				background: var(--green);
				color: white;
				border: none;
				padding: 4px 8px;
				border-radius: 6px;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				
				&:hover {
					background: var(--green-hover);
				}
			}
		}
	}
	
	.error-message {
		background: var(--error-bg);
		color: var(--error);
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 14px;
		margin-bottom: 20px;
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
</style>
