<script setup>
import { useStakingStore } from '~/store/staking.store'

// Components
import WalletConnect from '@/components/WalletConnect.vue'
import StakingOverview from '@/components/staking/StakingOverview.vue'

const stakingStore = useStakingStore()

// SEO
useHead({
	title: "Staking - Monad Explorer",
	link: [
		{
			rel: "canonical",
			href: "/staking",
		},
	],
	meta: [
		{
			name: "description",
			content: "Stake your MON tokens to earn rewards and help secure the Monad network. View staking statistics, manage delegations, and explore validators.",
		},
		{
			name: "keywords",
			content: "monad, staking, validators, delegation, rewards, MON, blockchain, consensus",
		},
		{
			property: "og:title",
			content: "Monad Staking - Earn Rewards by Securing the Network",
		},
		{
			property: "og:description",
			content: "Stake your MON tokens with trusted validators to earn rewards while helping secure the Monad blockchain network.",
		},
		{
			property: "og:type",
			content: "website",
		},
	],
})

// Initialize staking data on mount
onMounted(() => {
	if (stakingStore.isConnected) {
		stakingStore.fetchUserStakingData()
	}
})
</script>

<template>
	<div class="staking-page">
		<!-- Navigation Header -->
		<div class="page-header">
			<div class="header-content">
				<div class="header-nav">
					<NuxtLink to="/" class="home-link">
						← Explorer
					</NuxtLink>
					<div class="nav-divider">/</div>
					<span class="current-page">Staking</span>
				</div>
				<div class="header-actions">
					<WalletConnect />
				</div>
			</div>
		</div>

		<!-- Main Content -->
		<div class="page-content">
			<StakingOverview />
		</div>
	</div>
</template>

<style module lang="scss">
.staking-page {
	min-height: 100vh;
	background: var(--page-background, #f8f9fa);
}

.page-header {
	background: var(--card-background, #ffffff);
	border-bottom: 1px solid var(--border-color, #e1e5e9);
	padding: 16px 0;
	position: sticky;
	top: 0;
	z-index: 100;
	
	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		
		@media (max-width: 768px) {
			padding: 0 16px;
		}
	}
	
	.header-nav {
		display: flex;
		align-items: center;
		gap: 8px;
		
		.home-link {
			color: var(--primary-color, #007bff);
			text-decoration: none;
			font-weight: 500;
			transition: opacity 0.2s ease;
			
			&:hover {
				opacity: 0.8;
			}
		}
		
		.nav-divider {
			color: var(--text-tertiary, #d1d5db);
		}
		
		.current-page {
			color: var(--text-primary, #000);
			font-weight: 600;
		}
	}
}

.page-content {
	padding: 24px 0;
	
	@media (max-width: 768px) {
		padding: 16px 0;
	}
}
</style>
