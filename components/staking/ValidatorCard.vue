<script setup>
import { formatEther } from 'viem'
import { calculateValidatorAPY } from '~/services/api/staking'

// UI Components  
import Button from '@/components/ui/Button.vue'
import ValidatorLogo from '@/components/ValidatorLogo.vue'

const props = defineProps({
	validator: {
		type: Object,
		required: true
	},
	userDelegation: {
		type: Object,
		default: null
	},
	totalNetworkStake: {
		type: String,
		default: '0'
	}
})

const emit = defineEmits(['stake', 'manage'])

// Computed values
const hasUserDelegation = computed(() => {
	return props.userDelegation && BigInt(props.userDelegation.stake || '0') > 0
})

const userStakeFormatted = computed(() => {
	if (!props.userDelegation) return '0'
	return formatEther(BigInt(props.userDelegation.stake || '0'))
})

const userRewardsFormatted = computed(() => {
	if (!props.userDelegation) return '0'
	return formatEther(BigInt(props.userDelegation.rewards || '0'))
})

const estimatedAPY = computed(() => {
	if (!props.totalNetworkStake || props.totalNetworkStake === '0') return 0
	return calculateValidatorAPY(props.validator, props.totalNetworkStake)
})

const statusColor = computed(() => {
	if (props.validator.isActive) return 'success'
	if (BigInt(props.validator.stake || '0') > 0) return 'warning'
	return 'error'
})

const statusText = computed(() => {
	if (props.validator.isActive) return 'Active'
	if (BigInt(props.validator.stake || '0') > 0) return 'Inactive'
	return 'Not Eligible'
})
</script>

<template>
	<div class="validator-card" :class="{ 'has-delegation': hasUserDelegation }">
		<!-- Validator Header -->
		<div class="validator-header">
			<div class="validator-info">
				<ValidatorLogo 
					:address="validator.authAddress" 
					:size="40"
					class="validator-avatar"
				/>
				<div class="validator-details">
					<div class="validator-name">
						Validator #{{ validator.valId }}
					</div>
					<div class="validator-address">
						{{ validator.authAddress.slice(0, 8) }}...{{ validator.authAddress.slice(-6) }}
					</div>
				</div>
			</div>
			<div class="validator-status">
				<span class="status-badge" :class="statusColor">
					{{ statusText }}
				</span>
			</div>
		</div>

		<!-- Validator Stats -->
		<div class="validator-stats">
			<div class="stat-grid">
				<div class="stat-item">
					<span class="stat-label">Total Stake</span>
					<span class="stat-value">{{ validator.formattedConsensusStake || validator.formattedStake }} MON</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Commission</span>
					<span class="stat-value commission">{{ validator.formattedCommissionRate }}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Est. APY</span>
					<span class="stat-value apy">{{ estimatedAPY.toFixed(2) }}%</span>
				</div>
			</div>
		</div>

		<!-- User Delegation (if exists) -->
		<div v-if="hasUserDelegation" class="user-delegation">
			<div class="delegation-header">
				<span class="delegation-title">Your Delegation</span>
			</div>
			<div class="delegation-stats">
				<div class="delegation-item">
					<span class="delegation-label">Staked</span>
					<span class="delegation-value">{{ userStakeFormatted }} MON</span>
				</div>
				<div class="delegation-item">
					<span class="delegation-label">Rewards</span>
					<span class="delegation-value rewards">{{ userRewardsFormatted }} MON</span>
				</div>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="validator-actions">
			<Button 
				v-if="!hasUserDelegation"
				size="medium"
				type="primary"
				:disabled="!validator.isActive"
				@click="$emit('stake', validator)"
				wide
			>
				{{ validator.isActive ? 'Stake' : 'Validator Inactive' }}
			</Button>
			<template v-else>
				<Button 
					size="medium"
					type="secondary"
					@click="$emit('manage', validator)"
				>
					Manage
				</Button>
				<Button 
					size="medium"
					type="primary"
					:disabled="!validator.isActive"
					@click="$emit('stake', validator)"
				>
					Stake More
				</Button>
			</template>
		</div>

		<!-- Performance Indicators -->
		<div class="performance-indicators">
			<div class="indicator-item">
				<span class="indicator-dot" :class="validator.isActive ? 'active' : 'inactive'"></span>
				<span class="indicator-text">
					{{ validator.isActive ? 'Participating in consensus' : 'Not in active set' }}
				</span>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.validator-card {
	background: var(--card-background, #ffffff);
	border: 1px solid var(--border-color, #e1e5e9);
	border-radius: 16px;
	padding: 24px;
	transition: all 0.2s ease;
	position: relative;
	
	&:hover {
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}
	
	&.has-delegation {
		border-color: var(--primary-color, #007bff);
		
		&::before {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: 3px;
			background: linear-gradient(90deg, var(--primary-color, #007bff), var(--primary-light, #4dabf7));
			border-radius: 16px 16px 0 0;
		}
	}
}

.validator-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20px;
	
	.validator-info {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		
		.validator-avatar {
			flex-shrink: 0;
		}
		
		.validator-details {
			.validator-name {
				font-size: 16px;
				font-weight: 600;
				color: var(--text-primary, #000);
				margin-bottom: 4px;
			}
			
			.validator-address {
				font-size: 12px;
				font-family: 'Source Code Pro', monospace;
				color: var(--text-secondary, #666);
			}
		}
	}
	
	.validator-status {
		.status-badge {
			padding: 4px 8px;
			border-radius: 12px;
			font-size: 11px;
			font-weight: 600;
			text-transform: uppercase;
			
			&.success {
				background: var(--success-background, #d4edda);
				color: var(--success-color, #155724);
			}
			
			&.warning {
				background: var(--warning-background, #fff3cd);
				color: var(--warning-color, #856404);
			}
			
			&.error {
				background: var(--error-background, #f8d7da);
				color: var(--error-color, #721c24);
			}
		}
	}
}

.validator-stats {
	margin-bottom: 20px;
	
	.stat-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 16px;
		
		@media (max-width: 480px) {
			grid-template-columns: 1fr;
			gap: 12px;
		}
		
		.stat-item {
			text-align: center;
			
			.stat-label {
				display: block;
				font-size: 12px;
				color: var(--text-secondary, #666);
				margin-bottom: 4px;
			}
			
			.stat-value {
				display: block;
				font-size: 14px;
				font-weight: 600;
				color: var(--text-primary, #000);
				
				&.commission {
					color: var(--warning-color, #f59e0b);
				}
				
				&.apy {
					color: var(--success-color, #10b981);
				}
			}
		}
	}
}

.user-delegation {
	background: var(--primary-background, #f0f8ff);
	border-radius: 12px;
	padding: 16px;
	margin-bottom: 20px;
	
	.delegation-header {
		margin-bottom: 12px;
		
		.delegation-title {
			font-size: 14px;
			font-weight: 600;
			color: var(--primary-color, #007bff);
		}
	}
	
	.delegation-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		
		.delegation-item {
			.delegation-label {
				display: block;
				font-size: 12px;
				color: var(--text-secondary, #666);
				margin-bottom: 4px;
			}
			
			.delegation-value {
				display: block;
				font-size: 14px;
				font-weight: 600;
				color: var(--text-primary, #000);
				
				&.rewards {
					color: var(--success-color, #10b981);
				}
			}
		}
	}
}

.validator-actions {
	display: flex;
	gap: 12px;
	margin-bottom: 16px;
	
	@media (max-width: 480px) {
		flex-direction: column;
	}
}

.performance-indicators {
	.indicator-item {
		display: flex;
		align-items: center;
		gap: 8px;
		
		.indicator-dot {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			
			&.active {
				background: var(--success-color, #10b981);
				box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
			}
			
			&.inactive {
				background: var(--text-tertiary, #d1d5db);
			}
		}
		
		.indicator-text {
			font-size: 12px;
			color: var(--text-secondary, #666);
		}
	}
}
</style>
