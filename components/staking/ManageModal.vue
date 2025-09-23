<script setup>
import { formatEther } from 'viem'
import { abbreviate } from '~/services/utils/amounts'
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
	delegation: {
		type: Object,
		default: null
	},
	withdrawals: {
		type: Array,
		default: () => []
	},
	show: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['close', 'success'])

const stakingStore = useStakingStore()

// State
const activeTab = ref('claim') // claim, compound, unstake, withdraw
const unstakeAmount = ref('')
const loading = ref(false)
const error = ref('')

// Computed
const stakedAmount = computed(() => abbreviate(parseFloat(formatEther(BigInt(props.delegation.stake || '0'))), 2) || '0')
const rewardsAmount = computed(() => abbreviate(parseFloat(formatEther(BigInt(props.delegation.rewards || '0'))), 2) || '0')
const hasRewards = computed(() => BigInt(props.delegation.rewards || '0') > 0)

// Validation for unstake
const unstakeAmountError = computed(() => {
	if (!unstakeAmount.value) return ''
	
	const amount = parseFloat(unstakeAmount.value)
	const maxStaked = parseFloat(stakedAmount.value)
	
	if (isNaN(amount) || amount <= 0) return 'Invalid amount'
	if (amount > maxStaked) return 'Insufficient staked amount'
	
	return ''
})

const canUnstake = computed(() => {
	return unstakeAmount.value && !unstakeAmountError.value && !loading.value
})

// Computed for withdrawals
const validatorWithdrawals = computed(() => {
	return props.withdrawals.filter(w => w.valId === props.validator?.valId) || []
})

const withdrawableWithdrawals = computed(() => {
	return validatorWithdrawals.value.filter(w => w.isWithdrawable) || []
})

const pendingWithdrawals = computed(() => {
	return validatorWithdrawals.value.filter(w => !w.isWithdrawable) || []
})

const totalWithdrawable = computed(() => {
	return withdrawableWithdrawals.value.reduce((total, w) => {
		return total + BigInt(w.amount || '0')
	}, BigInt('0'))
})

const formattedTotalWithdrawable = computed(() => {
	return abbreviate(parseFloat(formatEther(totalWithdrawable.value)), 2) || '0'
})

const hasWithdrawals = computed(() => {
	return validatorWithdrawals.value.length > 0
})

// Actions
async function handleClaimRewards() {
	if (!hasRewards.value) return
	
	try {
		loading.value = true
		error.value = ''
		
		await stakingStore.claimRewards(props.validator.valId)
		
		emit('success')
	} catch (err) {
		error.value = err.message || 'Failed to claim rewards'
	} finally {
		loading.value = false
	}
}

async function handleCompoundRewards() {
	if (!hasRewards.value) return
	
	try {
		loading.value = true
		error.value = ''
		
		await stakingStore.compound(props.validator.valId)
		
		emit('success')
	} catch (err) {
		error.value = err.message || 'Failed to compound rewards'
	} finally {
		loading.value = false
	}
}

async function handleUnstake() {
	if (!canUnstake.value) return
	
	try {
		loading.value = true
		error.value = ''
		
		// Generate next available withdrawId
		const nextWithdrawId = Math.max(1, ...validatorWithdrawals.value.map(w => w.withdrawId), 0) + 1
		await stakingStore.undelegate(props.validator.valId, unstakeAmount.value, nextWithdrawId)
		
		// Close this modal immediately after transaction starts
		handleClose()
		emit('success')
	} catch (err) {
		error.value = err.message || 'Failed to unstake'
	} finally {
		loading.value = false
	}
}

async function handleWithdraw() {
	if (!hasWithdrawals.value || withdrawableWithdrawals.value.length === 0) return
	
	try {
		loading.value = true
		error.value = ''
		
		// Process all withdrawable requests
		for (const withdrawal of withdrawableWithdrawals.value) {
			await stakingStore.withdraw(withdrawal.valId, withdrawal.withdrawId)
		}
		
		emit('success')
	} catch (err) {
		error.value = err.message || 'Failed to withdraw'
	} finally {
		loading.value = false
	}
}

function setMaxUnstake() {
	unstakeAmount.value = stakedAmount.value
}

function handleClose() {
	activeTab.value = 'claim'
	unstakeAmount.value = ''
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
	<div v-if="show && validator && delegation" class="modal-overlay" @click.self="handleClose">
		<div class="modal-content">
			<!-- Header -->
			<div class="modal-header">
				<div class="validator-info">
					<ValidatorLogo 
						:address="validator.secpPubkey?.replace('0x', '') || validator.authAddress"
						size="medium"
					/>
					<div class="validator-details">
						<h3>Manage Validator #{{ validator.valId }}</h3>
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

			<!-- Tabs -->
			<div class="modal-tabs">
				<button 
					class="tab-btn"
					:class="{ active: activeTab === 'claim' }"
					@click="activeTab = 'claim'"
				>
					Claim Rewards
				</button>
				<button 
					class="tab-btn"
					:class="{ active: activeTab === 'compound' }"
					@click="activeTab = 'compound'"
				>
					Compound
				</button>
				<button 
					class="tab-btn"
					:class="{ active: activeTab === 'unstake' }"
					@click="activeTab = 'unstake'"
				>
					Unstake
				</button>
				<button 
					v-if="hasWithdrawals"
					class="tab-btn"
					:class="{ active: activeTab === 'withdraw' }"
					@click="activeTab = 'withdraw'"
				>
					Withdraw
				</button>
			</div>

			<!-- Content -->
			<div class="modal-body">
				<!-- Delegation Info -->
				<div class="delegation-info">
					<div class="info-item">
						<span class="label">Your Stake:</span>
						<span class="value">{{ stakedAmount }} MON</span>
					</div>
					<div class="info-item">
						<span class="label">Pending Rewards:</span>
						<span class="value" :class="{ highlight: hasRewards }">{{ rewardsAmount }} MON</span>
					</div>
				</div>

				<!-- Claim Rewards Tab -->
				<div v-if="activeTab === 'claim'" class="tab-content">
					<p class="tab-description">
						Claim your pending rewards and receive them in your wallet.
					</p>
					<Button 
						type="primary"
						size="large"
						wide
						:loading="loading"
						:disabled="!hasRewards"
						@click="handleClaimRewards"
					>
						Claim {{ rewardsAmount }} MON
					</Button>
				</div>

				<!-- Compound Tab -->
				<div v-if="activeTab === 'compound'" class="tab-content">
					<p class="tab-description">
						Add your pending rewards to your stake to earn more rewards.
					</p>
					<Button 
						type="primary"
						size="large"
						wide
						:loading="loading"
						:disabled="!hasRewards"
						@click="handleCompoundRewards"
					>
						Compound {{ rewardsAmount }} MON
					</Button>
				</div>

				<!-- Unstake Tab -->
				<div v-if="activeTab === 'unstake'" class="tab-content">
					<p class="tab-description">
						Unstake your tokens. There's a withdrawal delay of 1 epoch before you can claim them.
					</p>
					
					<div class="input-group">
						<label>Amount to Unstake</label>
						<div class="input-wrapper">
							<Input
								v-model="unstakeAmount"
								type="number"
								step="0.000001"
								placeholder="0.0"
								:error="unstakeAmountError"
							/>
							<button class="max-btn" @click="setMaxUnstake">MAX</button>
						</div>
					</div>

					<Button 
						type="secondary"
						size="large"
						wide
						:loading="loading"
						:disabled="!canUnstake"
						@click="handleUnstake"
					>
						Unstake {{ unstakeAmount || '0' }} MON
					</Button>
				</div>

				<!-- Withdraw Tab -->
				<div v-if="activeTab === 'withdraw'" class="tab-content">
					<p class="tab-description">
						Withdraw your unstaked tokens that have completed the withdrawal delay period.
					</p>

					<!-- Withdrawable Amount -->
					<div v-if="withdrawableWithdrawals.length > 0" class="withdrawable-section">
						<div class="withdrawable-amount">
							<div class="amount-display">
								<span class="amount">{{ formattedTotalWithdrawable }} MON</span>
								<span class="label">Ready to Withdraw</span>
							</div>
						</div>

						<div class="withdrawal-list">
							<div v-for="withdrawal in withdrawableWithdrawals" :key="`${withdrawal.valId}-${withdrawal.withdrawId}`" class="withdrawal-item">
								<div class="withdrawal-info">
									<span class="amount">{{ withdrawal.formattedAmount }} MON</span>
									<span class="id">Request #{{ withdrawal.withdrawId }}</span>
								</div>
								<span class="status ready">Ready</span>
							</div>
						</div>

						<Button 
							type="primary"
							size="large"
							wide
							:loading="loading"
							@click="handleWithdraw"
						>
							Withdraw {{ formattedTotalWithdrawable }} MON
						</Button>
					</div>

					<!-- Pending Withdrawals -->
					<div v-if="pendingWithdrawals.length > 0" class="pending-section">
						<h4>Pending Withdrawals</h4>
						<p class="pending-description">These withdrawals are still in the delay period.</p>

						<div class="withdrawal-list">
							<div v-for="withdrawal in pendingWithdrawals" :key="`${withdrawal.valId}-${withdrawal.withdrawId}`" class="withdrawal-item">
								<div class="withdrawal-info">
									<span class="amount">{{ withdrawal.formattedAmount }} MON</span>
									<span class="id">Request #{{ withdrawal.withdrawId }}</span>
								</div>
								<span class="status pending">
									Epoch {{ withdrawal.withdrawableEpoch }}
								</span>
							</div>
						</div>
					</div>

					<!-- No Withdrawals -->
					<div v-if="!hasWithdrawals" class="no-withdrawals">
						<p>You don't have any pending withdrawals for this validator.</p>
					</div>
				</div>

				<!-- Error Display -->
				<div v-if="error" class="error-message">
					{{ error }}
				</div>
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
	max-width: 520px;
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

.modal-tabs {
	display: flex;
	border-bottom: 1px solid var(--op-10);
	
	.tab-btn {
		flex: 1;
		padding: 16px 24px;
		background: none;
		border: none;
		font-size: 14px;
		font-weight: 600;
		color: var(--txt-secondary);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
		
		&:hover {
			color: var(--txt-primary);
			background: var(--op-5);
		}
		
		&.active {
			color: var(--green);
			border-bottom-color: var(--green);
		}
	}
}

.modal-body {
	padding: 24px;
	
	.delegation-info {
		background: var(--op-5);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 24px;
		
		.info-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			
			&:not(:last-child) {
				margin-bottom: 8px;
			}
			
			.label {
				color: var(--txt-secondary);
				font-size: 14px;
			}
			
			.value {
				color: var(--txt-primary);
				font-weight: 600;
				font-size: 14px;
				
				&.highlight {
					color: var(--green);
				}
			}
		}
	}
	
	.tab-content {
		.tab-description {
			color: var(--txt-secondary);
			font-size: 14px;
			line-height: 1.5;
			margin: 0 0 24px 0;
		}
		
		.input-group {
			margin-bottom: 24px;
			
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
	}
	
	.error-message {
		background: var(--error-bg);
		color: var(--error);
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 14px;
		margin-top: 16px;
	}
	
	.withdrawable-section {
		.withdrawable-amount {
			background: var(--green-bg);
			border-radius: 12px;
			padding: 20px;
			margin-bottom: 16px;
			text-align: center;
			
			.amount-display {
				.amount {
					display: block;
					font-size: 24px;
					font-weight: 700;
					color: var(--green);
					margin-bottom: 4px;
				}
				
				.label {
					font-size: 14px;
					color: var(--txt-secondary);
				}
			}
		}
	}
	
	.pending-section {
		margin-top: 24px;
		
		h4 {
			margin: 0 0 8px 0;
			font-size: 16px;
			font-weight: 600;
			color: var(--txt-primary);
		}
		
		.pending-description {
			margin: 0 0 16px 0;
			font-size: 14px;
			color: var(--txt-secondary);
		}
	}
	
	.withdrawal-list {
		margin-bottom: 24px;
		
		.withdrawal-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 12px 16px;
			background: var(--op-5);
			border-radius: 8px;
			
			&:not(:last-child) {
				margin-bottom: 8px;
			}
			
			.withdrawal-info {
				display: flex;
				flex-direction: column;
				gap: 4px;
				
				.amount {
					font-weight: 600;
					color: var(--txt-primary);
				}
				
				.id {
					font-size: 12px;
					color: var(--txt-tertiary);
				}
			}
			
			.status {
				font-size: 12px;
				font-weight: 600;
				padding: 4px 8px;
				border-radius: 6px;
				
				&.ready {
					background: var(--green);
					color: white;
				}
				
				&.pending {
					background: var(--yellow-bg);
					color: var(--yellow);
				}
			}
		}
	}
	
	.no-withdrawals {
		text-align: center;
		padding: 40px 20px;
		
		p {
			margin: 0;
			color: var(--txt-secondary);
			font-size: 14px;
		}
	}
}
</style>
