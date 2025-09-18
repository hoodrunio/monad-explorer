<script setup>
import { useStakingStore } from '~/store/staking.store'
import { formatEther, parseEther } from 'viem'

// UI Components
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import ValidatorLogo from '@/components/ValidatorLogo.vue'

const props = defineProps({
	validator: {
		type: Object,
		required: true
	},
	delegation: {
		type: Object,
		default: null
	}
})

const stakingStore = useStakingStore()

// State
const showStakeModal = ref(false)
const showUnstakeModal = ref(false)
const stakeAmount = ref('')
const unstakeAmount = ref('')
const error = ref('')

// Computed values
const isConnected = computed(() => stakingStore.isConnected)
const balance = computed(() => stakingStore.formattedBalance)
const availableBalance = computed(() => stakingStore.formattedAvailableBalance)
const isLoading = computed(() => stakingStore.loading.delegate || stakingStore.loading.undelegate)

const formattedStake = computed(() => {
	return props.delegation ? formatEther(BigInt(props.delegation.stake || '0')) : '0'
})

const formattedRewards = computed(() => {
	return props.delegation ? formatEther(BigInt(props.delegation.rewards || '0')) : '0'
})

const hasRewards = computed(() => {
	return props.delegation && BigInt(props.delegation.rewards || '0') > 0
})

const canUnstake = computed(() => {
	return props.delegation && BigInt(props.delegation.stake || '0') > 0
})

// Validate stake amount
const stakeAmountError = computed(() => {
	if (!stakeAmount.value) return ''
	
	const amount = parseFloat(stakeAmount.value)
	if (isNaN(amount) || amount <= 0) return 'Invalid amount'
	if (amount > parseFloat(availableBalance.value)) return 'Insufficient balance'
	
	return ''
})

// Validate unstake amount
const unstakeAmountError = computed(() => {
	if (!unstakeAmount.value) return ''
	
	const amount = parseFloat(unstakeAmount.value)
	if (isNaN(amount) || amount <= 0) return 'Invalid amount'
	if (amount > parseFloat(formattedStake.value)) return 'Insufficient staked amount'
	
	return ''
})

// Actions
async function handleStake() {
	if (!stakeAmount.value || stakeAmountError.value) return
	
	try {
		error.value = ''
		await stakingStore.delegate(props.validator.valId, stakeAmount.value)
		stakeAmount.value = ''
		showStakeModal.value = false
	} catch (err) {
		error.value = err.message || 'Failed to stake'
	}
}

async function handleUnstake() {
	if (!unstakeAmount.value || unstakeAmountError.value) return
	
	try {
		error.value = ''
		await stakingStore.undelegate(props.validator.valId, unstakeAmount.value)
		unstakeAmount.value = ''
		showUnstakeModal.value = false
	} catch (err) {
		error.value = err.message || 'Failed to unstake'
	}
}

async function handleCompound() {
	if (!props.delegation || !hasRewards.value) return
	
	try {
		error.value = ''
		await stakingStore.compound(props.validator.valId)
	} catch (err) {
		error.value = err.message || 'Failed to compound rewards'
	}
}

async function handleClaimRewards() {
	if (!props.delegation || !hasRewards.value) return
	
	try {
		error.value = ''
		await stakingStore.claimRewards(props.validator.valId)
	} catch (err) {
		error.value = err.message || 'Failed to claim rewards'
	}
}

function setMaxStake() {
	stakeAmount.value = availableBalance.value
}

function setMaxUnstake() {
	unstakeAmount.value = formattedStake.value
}
</script>

<template>
	<div class="staking-card">
		<!-- Validator Info -->
		<div class="validator-header">
			<div class="validator-info">
				<ValidatorLogo 
					:address="validator.secpPubkey?.replace('0x', '') || validator.authAddress"
					size="medium"
					class="validator-logo"
				/>
				<div class="validator-details">
					<div class="validator-name">
						Validator #{{ validator.valId }}
					</div>
					<div class="validator-meta">
						<span class="commission">{{ validator.formattedCommissionRate }}</span>
						<span class="stake">{{ validator.formattedConsensusStake }} MON</span>
						<span class="status" :class="{ active: validator.isActive }">
							{{ validator.isActive ? 'Active' : 'Inactive' }}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- User's Delegation Info -->
		<div v-if="delegation" class="delegation-info">
			<div class="delegation-stats">
				<div class="stat-item">
					<span class="stat-label">Your Stake</span>
					<span class="stat-value">{{ formattedStake }} MON</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Rewards</span>
					<span class="stat-value rewards">{{ formattedRewards }} MON</span>
				</div>
			</div>

			<!-- Reward Actions -->
			<div v-if="hasRewards" class="reward-actions">
				<Button 
					size="small" 
					type="secondary"
					:loading="stakingStore.loading.compound"
					@click="handleCompound"
				>
					Compound
				</Button>
				<Button 
					size="small" 
					type="primary"
					:loading="stakingStore.loading.claimRewards"
					@click="handleClaimRewards"
				>
					Claim
				</Button>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="action-buttons">
			<Button 
				v-if="!isConnected"
				size="medium"
				type="primary"
				wide
				disabled
			>
				Connect Wallet to Stake
			</Button>
			<template v-else>
				<Button 
					size="medium"
					type="primary"
					:disabled="!validator.isActive"
					@click="showStakeModal = true"
				>
					Stake
				</Button>
				<Button 
					v-if="canUnstake"
					size="medium"
					type="secondary"
					@click="showUnstakeModal = true"
				>
					Unstake
				</Button>
			</template>
		</div>

		<!-- Error Display -->
		<div v-if="error" class="error-message">
			{{ error }}
		</div>

		<!-- Stake Modal -->
		<div v-if="showStakeModal" class="modal-overlay" @click.self="showStakeModal = false">
			<div class="modal">
				<div class="modal-header">
					<h3>Stake to Validator #{{ validator.valId }}</h3>
					<button @click="showStakeModal = false" class="close-button">×</button>
				</div>
				
				<div class="modal-body">
					<div class="balance-info">
						<span>Available Balance: {{ availableBalance }} MON</span>
						<button @click="setMaxStake" class="max-button">MAX</button>
					</div>
					
					<Input 
						v-model="stakeAmount"
						type="number"
						placeholder="Amount to stake"
						:error="stakeAmountError"
					/>
					
					<div class="modal-info">
						<p>• Staked tokens will be active in the next epoch</p>
						<p>• Commission rate: {{ validator.formattedCommissionRate }}</p>
						<p>• You can unstake at any time with 1 epoch delay</p>
					</div>
				</div>
				
				<div class="modal-footer">
					<Button 
						type="secondary" 
						@click="showStakeModal = false"
						:disabled="isLoading"
					>
						Cancel
					</Button>
					<Button 
						type="primary"
						:loading="stakingStore.loading.delegate"
						:disabled="!stakeAmount || !!stakeAmountError"
						@click="handleStake"
					>
						Stake MON
					</Button>
				</div>
			</div>
		</div>

		<!-- Unstake Modal -->
		<div v-if="showUnstakeModal" class="modal-overlay" @click.self="showUnstakeModal = false">
			<div class="modal">
				<div class="modal-header">
					<h3>Unstake from Validator #{{ validator.valId }}</h3>
					<button @click="showUnstakeModal = false" class="close-button">×</button>
				</div>
				
				<div class="modal-body">
					<div class="balance-info">
						<span>Staked Amount: {{ formattedStake }} MON</span>
						<button @click="setMaxUnstake" class="max-button">MAX</button>
					</div>
					
					<Input 
						v-model="unstakeAmount"
						type="number"
						placeholder="Amount to unstake"
						:error="unstakeAmountError"
					/>
					
					<div class="modal-info warning">
						<p>⚠️ Unstaking has a 1 epoch (~5.5 hours) withdrawal delay</p>
						<p>• Your tokens will be inactive immediately</p>
						<p>• You can withdraw after the delay period</p>
						<p>• Rewards will stop accumulating</p>
					</div>
				</div>
				
				<div class="modal-footer">
					<Button 
						type="secondary" 
						@click="showUnstakeModal = false"
						:disabled="isLoading"
					>
						Cancel
					</Button>
					<Button 
						type="primary"
						:loading="stakingStore.loading.undelegate"
						:disabled="!unstakeAmount || !!unstakeAmountError"
						@click="handleUnstake"
					>
						Unstake MON
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.staking-card {
	background: var(--card-background);
	border: 1px solid var(--op-5);
	border-radius: 16px;
	padding: 20px;
	transition: all 0.2s ease;
	
	&:hover {
		box-shadow: 0 2px 8px var(--op-10);
	}
}

.validator-header {
	margin-bottom: 16px;
	
	.validator-info {
		.validator-name {
			font-size: 18px;
			font-weight: 600;
			color: var(--txt-primary);
			margin-bottom: 8px;
		}
		
		.validator-details {
			display: flex;
			gap: 12px;
			font-size: 13px;
			
			.commission {
				color: var(--txt-secondary);
				
				&::before {
					content: 'Commission: ';
				}
			}
			
			.stake {
				color: var(--txt-secondary);
				
				&::before {
					content: 'Stake: ';
				}
			}
			
			.status {
				padding: 2px 8px;
				border-radius: 12px;
				font-weight: 500;
				font-size: 11px;
				text-transform: uppercase;
				background: var(--op-5);
				color: var(--red);
				
				&.active {
					background: var(--op-5);
					color: var(--green);
				}
			}
		}
	}
}

.delegation-info {
	background: var(--op-5);
	border-radius: 12px;
	padding: 16px;
	margin-bottom: 16px;
	
	.delegation-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin-bottom: 12px;
		
		.stat-item {
			.stat-label {
				display: block;
				font-size: 12px;
				color: var(--txt-secondary);
				margin-bottom: 4px;
			}
			
			.stat-value {
				display: block;
				font-size: 16px;
				font-weight: 600;
				color: var(--txt-primary);
				
				&.rewards {
					color: var(--green);
				}
			}
		}
	}
	
	.reward-actions {
		display: flex;
		gap: 8px;
	}
}

.action-buttons {
	display: flex;
	gap: 12px;
	
	@media (max-width: 640px) {
		flex-direction: column;
	}
}

.error-message {
	margin-top: 12px;
	padding: 8px 12px;
	background: var(--op-5);
	color: var(--red);
	border-radius: 8px;
	font-size: 13px;
}

.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	padding: 20px;
}

.modal {
	background: var(--card-background);
	border-radius: 16px;
	max-width: 480px;
	width: 100%;
	max-height: 90vh;
	overflow-y: auto;
	
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--op-5);
		
		h3 {
			margin: 0;
			font-size: 18px;
			font-weight: 600;
			color: var(--txt-primary);
		}
		
		.close-button {
			background: none;
			border: none;
			font-size: 24px;
			color: var(--txt-secondary);
			cursor: pointer;
			padding: 0;
			width: 32px;
			height: 32px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			
			&:hover {
				background: var(--op-5);
			}
		}
	}
	
	.modal-body {
		padding: 24px;
		
		.balance-info {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 16px;
			font-size: 14px;
			color: var(--txt-secondary);
			
			.max-button {
				background: var(--brand);
				color: var(--txt-white);
				border: none;
				padding: 4px 8px;
				border-radius: 4px;
				font-size: 11px;
				font-weight: 600;
				cursor: pointer;
				
				&:hover {
					opacity: 0.9;
				}
			}
		}
		
		.modal-info {
			margin-top: 16px;
			padding: 12px;
			background: var(--op-5);
			border-radius: 8px;
			font-size: 13px;
			line-height: 1.5;
			
			&.warning {
				background: var(--op-5);
				border-left: 3px solid var(--orange);
			}
			
			p {
				margin: 0 0 4px 0;
				
				&:last-child {
					margin-bottom: 0;
				}
			}
		}
	}
	
	.modal-footer {
		display: flex;
		gap: 12px;
		padding: 20px 24px;
		border-top: 1px solid var(--op-5);
		
		> * {
			flex: 1;
		}
	}
}
</style>
