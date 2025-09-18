<script setup>
import { formatEther } from 'viem'

// Components
import Button from '@/components/ui/Button.vue'
import ValidatorLogo from "@/components/ValidatorLogo.vue"

// Services
import { shortHex, comma } from "@/services/utils"
import { calculateValidatorAPY } from "@/services/api/staking"

// Props
const props = defineProps({
	validators: {
		type: Array,
		required: true
	},
	userDelegations: {
		type: Array,
		default: () => []
	},
	loading: {
		type: Boolean,
		default: false
	},
	totalNetworkStake: {
		type: String,
		default: '0'
	}
})

// Emits
const emit = defineEmits(['stake', 'manage'])

// Get user delegation for a validator
const getUserDelegation = (validatorId) => {
	return props.userDelegations.find(d => d.validatorId === validatorId)
}

// Calculate APY for validator
const getValidatorAPY = (validator) => {
	if (!props.totalNetworkStake || props.totalNetworkStake === '0') return 'N/A'
	const apy = calculateValidatorAPY(validator, props.totalNetworkStake)
	return apy > 0 ? `${apy.toFixed(2)}%` : 'N/A'
}

// Format stake with commas
const formatStake = (validator) => {
	const stake = validator.formattedConsensusStake || validator.formattedStake || '0'
	// Remove "MON" if it exists and get just the number
	const numberPart = stake.replace(' MON', '')
	// Parse and format with commas
	const parsed = parseFloat(numberPart)
	return parsed > 0 ? comma(parsed) : '0'
}

// Handle actions
const handleStake = (validator) => {
	emit('stake', validator)
}

const handleManage = (validator) => {
	emit('manage', validator)
}
</script>

<template>
	<div :class="[$style.table_container, loading && $style.loading]">
		<div :class="$style.table_scroller">
			<table :class="$style.validators_table">
				<thead>
					<tr>
						<th :class="$style.col_validator">
							<Text size="12" weight="600" color="tertiary" noWrap>Validator</Text>
						</th>
						<th :class="$style.col_status">
							<Text size="12" weight="600" color="tertiary" noWrap>Status</Text>
						</th>
						<th :class="$style.col_stake">
							<Text size="12" weight="600" color="tertiary" noWrap>Total Stake</Text>
						</th>
						<th :class="$style.col_commission">
							<Text size="12" weight="600" color="tertiary" noWrap>Commission</Text>
						</th>
						<th :class="$style.col_apy">
							<Text size="12" weight="600" color="tertiary" noWrap>Est. APY</Text>
						</th>
						<th :class="$style.col_delegation">
							<Text size="12" weight="600" color="tertiary" noWrap>Your Stake</Text>
						</th>
						<th :class="$style.col_actions">
							<Text size="12" weight="600" color="tertiary" noWrap>Actions</Text>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="validator in validators" :key="validator.valId" :class="$style.validator_row">
						<!-- Validator Info -->
						<td :class="$style.col_validator">
							<Flex align="center" gap="8" :class="$style.validator_info">
								<ValidatorLogo 
									:logo-url="validator.logoUrl"
									:validator-name="validator.name"
									size="mini"
								/>
								<Flex direction="column" gap="1">
									<Text size="12" weight="600" color="primary" :class="$style.validator_name">
										{{ validator.name !== 'unknown' ? validator.name : `Validator #${validator.valId || validator.staking?.precompile_validator_id}` }}
									</Text>
									<Text size="10" color="tertiary" mono :class="$style.validator_id">
										{{ shortHex(validator.secpPubkey?.replace('0x', '') || validator.authAddress || validator.valId) }}
									</Text>
								</Flex>
							</Flex>
						</td>
						
						<!-- Status -->
						<td :class="$style.col_status">
							<div :class="[$style.status_badge, validator.isActive ? $style.active : $style.inactive]">
								<div :class="$style.status_dot"></div>
								<Text size="11" weight="600" :class="$style.status_text">
									{{ validator.isActive ? 'Active' : 'Inactive' }}
								</Text>
							</div>
						</td>
						
						<!-- Total Stake -->
						<td :class="$style.col_stake">
							<Text size="13" weight="600" color="primary">
								{{ formatStake(validator) }} MON
							</Text>
						</td>
						
						<!-- Commission -->
						<td :class="$style.col_commission">
							<Text size="13" weight="600" color="secondary">
								{{ validator.formattedCommissionRate || 'N/A' }}
							</Text>
						</td>
						
						<!-- APY -->
						<td :class="$style.col_apy">
							<Text size="13" weight="600" color="green">
								{{ getValidatorAPY(validator) }}
							</Text>
						</td>
						
						<!-- User's Delegation -->
						<td :class="$style.col_delegation">
							<div v-if="getUserDelegation(validator.valId)" :class="$style.delegation_info">
								<Text size="13" weight="600" color="primary">
									{{ formatEther(BigInt(getUserDelegation(validator.valId).stake || '0')) }} MON
								</Text>
								<Text size="11" color="tertiary">
									Rewards: {{ formatEther(BigInt(getUserDelegation(validator.valId).rewards || '0')) }} MON
								</Text>
							</div>
							<Text v-else size="12" color="support">
								Not delegated
							</Text>
						</td>
						
						<!-- Actions -->
						<td :class="$style.col_actions">
							<Flex gap="8" align="center">
								<Button 
									size="small" 
									type="primary"
									:disabled="!validator.isActive"
									@click="handleStake(validator)"
								>
									Stake
								</Button>
								<Button 
									v-if="getUserDelegation(validator.valId)"
									size="small" 
									type="secondary"
									@click="handleManage(validator)"
								>
									Manage
								</Button>
							</Flex>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<style module lang="scss">
.table_container {
	&.loading {
		opacity: 0.6;
		pointer-events: none;
	}
}

.table_scroller {
	overflow-x: auto;
	border-radius: 12px;
	border: 1px solid var(--op-5);
}

.validators_table {
	width: 100%;
	border-collapse: collapse;
	background: var(--card-background);
	
	thead {
		background: var(--op-5);
		border-bottom: 1px solid var(--op-10);
		
		th {
			padding: 12px 16px;
			text-align: left;
			font-weight: 600;
			border-right: 1px solid var(--op-5);
			
			&:last-child {
				border-right: none;
			}
		}
	}
	
	tbody {
		tr {
			border-bottom: 1px solid var(--op-5);
			transition: background-color 0.2s ease;
			
			&:hover {
				background: var(--op-3);
			}
			
			&:last-child {
				border-bottom: none;
			}
		}
		
		td {
			padding: 16px;
			vertical-align: middle;
			border-right: 1px solid var(--op-5);
			
			&:last-child {
				border-right: none;
			}
		}
	}
}

// Column widths
.col_validator {
	min-width: 160px;
	width: 20%;
}

.col_status {
	min-width: 80px;
	width: 8%;
}

.col_stake {
	min-width: 120px;
	width: 18%;
}

.col_commission {
	min-width: 90px;
	width: 12%;
}

.col_apy {
	min-width: 90px;
	width: 12%;
}

.col_delegation {
	min-width: 140px;
	width: 18%;
}

.col_actions {
	min-width: 120px;
	width: 12%;
}

// Validator info styles
.validator_info {
	min-width: 0; // Allow flex shrinking
}

.validator_name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 140px;
}

.validator_id {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 140px;
}

// Status badge styles
.status_badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 3px 8px;
	border-radius: 8px;
	font-weight: 500;
	font-size: 10px;
	text-transform: uppercase;
	
	&.active {
		background: var(--op-5);
		color: var(--green);
		
		.status_dot {
			background: var(--green);
		}
	}
	
	&.inactive {
		background: var(--op-5);
		color: var(--txt-tertiary);
		
		.status_dot {
			background: var(--txt-tertiary);
		}
	}
}

.status_dot {
	width: 4px;
	height: 4px;
	border-radius: 50%;
	flex-shrink: 0;
}

.status_text {
	text-transform: uppercase;
}

// Delegation info styles
.delegation_info {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

// Responsive design
@media (max-width: 1024px) {
	.col_apy,
	.col_commission {
		display: none;
	}
}

@media (max-width: 768px) {
	.validators_table {
		font-size: 12px;
	}
	
	.col_delegation {
		display: none;
	}
	
	.col_validator {
		width: 35%;
		min-width: 140px;
	}
	
	.col_status {
		width: 15%;
	}
	
	.col_stake {
		width: 30%;
	}
	
	.col_actions {
		width: 20%;
	}
	
	.validator_name {
		max-width: 120px;
	}
	
	.validator_id {
		max-width: 120px;
	}
}

@media (max-width: 640px) {
	.validators_table {
		tbody td {
			padding: 12px 8px;
		}
		
		thead th {
			padding: 8px;
		}
	}
	
	.col_status {
		display: none;
	}
	
	.col_validator {
		width: 50%;
	}
	
	.col_stake {
		width: 25%;
	}
	
	.col_actions {
		width: 25%;
	}
}
</style>
