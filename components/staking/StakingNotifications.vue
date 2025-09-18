<script setup>
import { useStakingStore } from '~/store/staking.store'

const stakingStore = useStakingStore()

// Computed notifications
const notifications = computed(() => {
	const items = []
	
	// Wallet connection status
	if (!stakingStore.isConnected) {
		items.push({
			type: 'warning',
			title: 'Wallet Not Connected',
			message: 'Connect your wallet to start staking',
			action: 'connect',
		})
	} else if (!stakingStore.isCorrectNetwork) {
		items.push({
			type: 'error',
			title: 'Wrong Network',
			message: 'Please switch to Monad Testnet',
			action: 'switch-network',
		})
	}
	
	// Pending transactions
	if (stakingStore.pendingTransactions.length > 0) {
		items.push({
			type: 'info',
			title: 'Transactions Pending',
			message: `${stakingStore.pendingTransactions.length} transaction(s) being processed`,
			action: 'view-transactions',
		})
	}
	
	// Withdrawable amounts
	if (stakingStore.hasPendingWithdrawals && stakingStore.withdrawableAmount > 0) {
		items.push({
			type: 'success',
			title: 'Funds Ready to Withdraw',
			message: `${stakingStore.formattedWithdrawableAmount} MON available`,
			action: 'withdraw',
		})
	}
	
	// High rewards available
	const rewardAmount = parseFloat(stakingStore.formattedRewards)
	if (rewardAmount > 1) {
		items.push({
			type: 'info',
			title: 'Rewards Available',
			message: `${stakingStore.formattedRewards} MON in pending rewards`,
			action: 'claim-rewards',
		})
	}
	
	// Epoch boundary warning
	if (stakingStore.inBoundary) {
		items.push({
			type: 'warning',
			title: 'Boundary Period Active',
			message: 'New delegations will be active in 2 epochs (~11 hours)',
			action: null,
		})
	}
	
	return items
})

// Handle notification actions
const emit = defineEmits(['action'])

function handleAction(action) {
	emit('action', action)
}
</script>

<template>
	<div v-if="notifications.length > 0" class="staking-notifications">
		<div 
			v-for="(notification, index) in notifications"
			:key="index"
			class="notification"
			:class="notification.type"
		>
			<div class="notification-icon">
				<span v-if="notification.type === 'success'">✅</span>
				<span v-else-if="notification.type === 'warning'">⚠️</span>
				<span v-else-if="notification.type === 'error'">❌</span>
				<span v-else>ℹ️</span>
			</div>
			
			<div class="notification-content">
				<div class="notification-title">{{ notification.title }}</div>
				<div class="notification-message">{{ notification.message }}</div>
			</div>
			
			<div v-if="notification.action" class="notification-action">
				<button 
					@click="handleAction(notification.action)"
					class="action-button"
				>
					<span v-if="notification.action === 'connect'">Connect</span>
					<span v-else-if="notification.action === 'switch-network'">Switch</span>
					<span v-else-if="notification.action === 'withdraw'">Withdraw</span>
					<span v-else-if="notification.action === 'claim-rewards'">Claim</span>
					<span v-else-if="notification.action === 'view-transactions'">View</span>
					<span v-else>Action</span>
				</button>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.staking-notifications {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-bottom: 24px;
}

.notification {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 16px;
	border-radius: 12px;
	border: 1px solid;
	background: var(--card-background, #ffffff);
	
	&.success {
		border-color: var(--success-color, #10b981);
		background: var(--success-background, #f0fdf4);
	}
	
	&.warning {
		border-color: var(--warning-color, #f59e0b);
		background: var(--warning-background, #fffbeb);
	}
	
	&.error {
		border-color: var(--error-color, #ef4444);
		background: var(--error-background, #fef2f2);
	}
	
	&.info {
		border-color: var(--info-color, #3b82f6);
		background: var(--info-background, #eff6ff);
	}
}

.notification-icon {
	font-size: 20px;
	flex-shrink: 0;
}

.notification-content {
	flex: 1;
	
	.notification-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #000);
		margin-bottom: 4px;
	}
	
	.notification-message {
		font-size: 13px;
		color: var(--text-secondary, #666);
		line-height: 1.4;
	}
}

.notification-action {
	.action-button {
		background: var(--primary-color, #007bff);
		color: white;
		border: none;
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
		
		&:hover {
			background: var(--primary-color-dark, #0056b3);
		}
	}
}
</style>
