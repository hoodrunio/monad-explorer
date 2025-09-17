<script setup>
import { useStakingStore } from '~/store/staking.store'

// Components
import WalletConnect from '@/components/WalletConnect.vue'
import StakingOverview from '@/components/staking/StakingOverview.vue'

const route = useRoute()
const router = useRouter()
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

// Tab system similar to stats page
const tabs = ref([
	{
		name: "overview",
		visible: true,
	},
	{
		name: "validators", 
		visible: true,
	},
	{
		name: "dashboard",
		visible: true,
	},
])

const activeTab = ref(
	route.query.tab &&
		tabs.value
			.filter((t) => t.visible)
			.map((t) => t.name)
			.includes(route.query.tab)
		? route.query.tab
		: tabs.value[0].name,
)

const updateRouteQuery = () => {
	router.replace({
		query: {
			tab: activeTab.value,
		},
	})
}

// Navigation functions
const navigateToValidators = () => {
	router.push('/staking/validators')
}

const navigateToDashboard = () => {
	router.push('/staking/dashboard')
}

// Handle tab clicks manually
const handleTabClick = (tabName) => {
	if (tabName === 'validators') {
		navigateToValidators()
	} else if (tabName === 'dashboard') {
		navigateToDashboard()
	} else {
		activeTab.value = tabName
	}
}

// Watch for tab changes
watch(
	() => activeTab.value,
	(newTab) => {
		if (newTab === 'validators') {
			navigateToValidators()
		} else if (newTab === 'dashboard') {
			navigateToDashboard()
		} else {
			updateRouteQuery()
		}
	},
	{ immediate: false } // Prevent initial trigger
)

// Initialize staking data on mount
onMounted(() => {
	if (stakingStore.isConnected) {
		stakingStore.fetchUserStakingData()
	}
	updateRouteQuery()
})
</script>

<template>
	<Flex direction="column" gap="12" wide :class="$style.wrapper">
		<Breadcrumbs
			:items="[
				{ link: '/', name: 'Dashboard' },
				{ link: '/staking', name: 'Staking' },
			]"
			:class="$style.breadcrumbs"
		/>

		<Flex align="center" gap="8" :class="$style.header">
			<Icon name="validator" size="16" color="secondary" />
			<Text size="16" weight="600" color="primary">Monad Staking</Text>
		</Flex>

		<Flex align="center" justify="between" wide :class="$style.tabs_wrapper">
			<Flex align="center" gap="16">
				<Text
					v-for="t in tabs.filter((t) => t.visible)"
					:key="t.name"
					@click="handleTabClick(t.name)"
					size="14"
					color="tertiary"
					:class="[$style.tab, activeTab === t.name && $style.tab_active]"
				>
					{{ t.name.charAt(0).toUpperCase() + t.name.slice(1) }}
				</Text>
			</Flex>

			<Flex align="start" :class="$style.actions">
				<WalletConnect />
			</Flex>
		</Flex>

		<!-- Overview Tab Content -->
		<Flex v-if="activeTab === 'overview'" direction="column" gap="20">
			<StakingOverview />
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	max-width: calc(var(--base-width) + 48px);
	padding: 20px 24px 60px 24px;
}

.breadcrumbs {
	margin-bottom: 16px;
}

.header {
	margin-bottom: 16px;
}

.tabs_wrapper {
	position: relative;
}

.tabs_wrapper::after {
	content: "";
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 2px;
	background-color: var(--op-5);
}

.tab {
	padding-bottom: 12px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.tab:hover {
	color: var(--txt-secondary);
}

.tab_active {
	color: var(--txt-primary);
	border-bottom: solid 3px var(--txt-primary);
}

.actions {
	transform: translateY(-8px);
}

@media (max-width: 768px) {
	.wrapper {
		padding: 32px 12px;
	}

	.header {
		gap: 16px;
		height: initial;
		padding: 16px;
	}
	
	.tabs_wrapper {
		flex-direction: column;
		gap: 16px;
	}
	
	.actions {
		transform: none;
		align-self: flex-start;
	}
}
</style>
