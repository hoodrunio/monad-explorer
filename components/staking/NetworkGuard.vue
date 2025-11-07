<script setup>
import { useStakingStore } from '~/store/staking.store'
import { useNetworkValidation } from '~/composables/useNetworkValidation'
import Button from '@/components/ui/Button.vue'

const stakingStore = useStakingStore()
const { isCorrectNetwork, switchToMonadNetwork } = useNetworkValidation()

const isSwitching = ref(false)

async function handleSwitchNetwork() {
	if (isSwitching.value) return

	isSwitching.value = true
	try {
		await switchToMonadNetwork()
	} finally {
		// Small delay to show the button state
		setTimeout(() => {
			isSwitching.value = false
		}, 1000)
	}
}
</script>

<template>
	<Transition name="slide-down">
		<div v-if="stakingStore.isConnected && !isCorrectNetwork" :class="$style.networkGuard">
			<div :class="$style.container">
				<div :class="$style.icon">
					<Icon name="warning" size="24" />
				</div>

				<div :class="$style.content">
					<h3 :class="$style.title">Wrong Network Detected</h3>
					<p :class="$style.description">
						You're currently connected to the wrong network. Please switch to Monad Testnet to use staking features.
					</p>
				</div>

				<div :class="$style.actions">
					<Button
						@click="handleSwitchNetwork"
						:loading="isSwitching"
						:disabled="isSwitching"
						type="primary"
						size="medium"
						aria-label="Switch to Monad Testnet"
					>
						<Icon v-if="!isSwitching" name="refresh" size="16" />
						{{ isSwitching ? 'Switching...' : 'Switch to Monad Testnet' }}
					</Button>
				</div>
			</div>
		</div>
	</Transition>
</template>

<style module lang="scss">
.networkGuard {
	background: linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 193, 7, 0.1) 100%);
	border: 2px solid var(--yellow);
	border-radius: 16px;
	padding: 24px;
	margin-bottom: 24px;
	box-shadow: 0 4px 12px rgba(255, 152, 0, 0.1);
	animation: pulse-warning 2s ease-in-out infinite;
}

@keyframes pulse-warning {
	0%, 100% {
		box-shadow: 0 4px 12px rgba(255, 152, 0, 0.1);
	}
	50% {
		box-shadow: 0 4px 20px rgba(255, 152, 0, 0.2);
	}
}

.container {
	display: flex;
	align-items: center;
	gap: 20px;

	@media (max-width: 768px) {
		flex-direction: column;
		text-align: center;
		gap: 16px;
	}
}

.icon {
	flex-shrink: 0;
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 152, 0, 0.2);
	border-radius: 12px;
	fill: var(--yellow);
	animation: bounce-warning 1s ease-in-out infinite;

	@media (max-width: 768px) {
		width: 56px;
		height: 56px;
	}
}

@keyframes bounce-warning {
	0%, 100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-4px);
	}
}

.content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6px;

	@media (max-width: 768px) {
		align-items: center;
	}
}

.title {
	margin: 0;
	font-size: 18px;
	font-weight: 700;
	color: var(--yellow);
	line-height: 1.3;

	@media (max-width: 768px) {
		font-size: 16px;
	}
}

.description {
	margin: 0;
	font-size: 14px;
	line-height: 1.6;
	color: var(--txt-secondary);

	@media (max-width: 768px) {
		font-size: 13px;
	}
}

.actions {
	flex-shrink: 0;

	@media (max-width: 768px) {
		width: 100%;

		:global(button) {
			width: 100%;
			justify-content: center;
		}
	}
}

// Transition animations
.slide-down-enter-active,
.slide-down-leave-active {
	transition: all 0.3s ease;
}

.slide-down-enter-from {
	opacity: 0;
	transform: translateY(-20px);
}

.slide-down-leave-to {
	opacity: 0;
	transform: translateY(-10px);
}
</style>
