<script setup>
const props = defineProps({
	stakingStats: {
		type: Object,
		default: null,
	},
	isLoading: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits(["viewStaking"])

const isCollapsed = ref(false)

// Check if user has any staking activity
const hasStakingActivity = computed(() => {
	if (!props.stakingStats) return false
	const stats = props.stakingStats
	return (
		stats.positions?.length > 0 ||
		BigInt(stats.total_delegated || "0") > 0n ||
		BigInt(stats.total_rewards_claimed || "0") > 0n
	)
})

// Format wei to MON
const formatMON = (weiValue) => {
	if (!weiValue) return "0"
	try {
		const wei = BigInt(weiValue)
		const mon = Number(wei) / 1e18

		if (mon >= 1000000) return `${(mon / 1000000).toFixed(2)}M`
		if (mon >= 1000) return `${(mon / 1000).toFixed(2)}K`
		if (mon < 0.0001 && mon > 0) return "<0.0001"
		return mon.toFixed(4)
	} catch {
		return "0"
	}
}

// Computed values
const totalDelegated = computed(() => formatMON(props.stakingStats?.total_delegated))
const totalRewardsClaimed = computed(() => formatMON(props.stakingStats?.total_rewards_claimed))
const totalUnclaimedRewards = computed(() => formatMON(props.stakingStats?.total_unclaimed_rewards))
const positionsCount = computed(() => props.stakingStats?.positions?.length || 0)
const eventCounts = computed(() => props.stakingStats?.event_counts || { delegate: 0, claim: 0 })

const handleViewStaking = () => {
	emit("viewStaking")
}
</script>

<template>
	<Flex v-if="hasStakingActivity || isLoading" direction="column" gap="12" :class="$style.widget">
		<!-- Header -->
		<Flex @click="isCollapsed = !isCollapsed" align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="6">
				<Icon name="coins" size="12" color="green" />
				<Text size="12" weight="600" color="tertiary">Staking</Text>
			</Flex>
			<Icon
				name="chevron"
				size="14"
				color="tertiary"
				:style="{
					transform: `rotate(${isCollapsed ? '0' : '180'}deg)`,
					transition: 'transform 300ms ease',
				}"
			/>
		</Flex>

		<!-- Content -->
		<Transition name="fastfade">
			<Flex v-if="!isCollapsed" direction="column" gap="12">
				<!-- Total Delegated -->
				<Flex align="center" justify="between" :class="$style.stat_row">
					<Text size="12" weight="500" color="tertiary">Total Delegated</Text>
					<Flex align="center" gap="4">
						<Skeleton v-if="isLoading" w="60" h="14" />
						<Text v-else size="12" weight="600" color="primary">{{ totalDelegated }}</Text>
						<Text v-if="!isLoading" size="11" weight="500" color="tertiary">MON</Text>
					</Flex>
				</Flex>

				<!-- Unclaimed Rewards -->
				<Flex align="center" justify="between" :class="$style.stat_row">
					<Text size="12" weight="500" color="tertiary">Unclaimed Rewards</Text>
					<Flex align="center" gap="4">
						<Skeleton v-if="isLoading" w="50" h="14" />
						<Text v-else size="12" weight="600" color="green">{{ totalUnclaimedRewards }}</Text>
						<Text v-if="!isLoading" size="11" weight="500" color="tertiary">MON</Text>
					</Flex>
				</Flex>

				<!-- Total Claimed -->
				<Flex align="center" justify="between" :class="$style.stat_row">
					<Text size="12" weight="500" color="tertiary">Total Claimed</Text>
					<Flex align="center" gap="4">
						<Skeleton v-if="isLoading" w="50" h="14" />
						<Text v-else size="12" weight="600" color="secondary">{{ totalRewardsClaimed }}</Text>
						<Text v-if="!isLoading" size="11" weight="500" color="tertiary">MON</Text>
					</Flex>
				</Flex>

				<!-- Validators Count -->
				<Flex align="center" justify="between" :class="$style.stat_row">
					<Text size="12" weight="500" color="tertiary">Validators</Text>
					<Skeleton v-if="isLoading" w="30" h="14" />
					<Text v-else size="12" weight="600" color="primary">{{ positionsCount }}</Text>
				</Flex>

				<!-- Event Summary -->
				<Flex align="center" justify="between" :class="$style.stat_row">
					<Text size="12" weight="500" color="tertiary">Activity</Text>
					<Flex v-if="isLoading" gap="8">
						<Skeleton w="40" h="14" />
						<Skeleton w="40" h="14" />
					</Flex>
					<Flex v-else align="center" gap="8">
						<Flex align="center" gap="4">
							<Text size="11" weight="500" color="green">{{ eventCounts.delegate }}</Text>
							<Text size="10" weight="500" color="tertiary">delegate</Text>
						</Flex>
						<Flex align="center" gap="4">
							<Text size="11" weight="500" color="blue">{{ eventCounts.claim }}</Text>
							<Text size="10" weight="500" color="tertiary">claim</Text>
						</Flex>
					</Flex>
				</Flex>

				<!-- View Staking Tab Link -->
				<Flex @click="handleViewStaking" align="center" :class="$style.view_all">
					<Text size="11" weight="500" color="brand">View staking activity</Text>
					<Icon name="arrow-right" size="10" color="brand" />
				</Flex>
			</Flex>
		</Transition>
	</Flex>
</template>

<style module>
.widget {
	padding: 16px;
	border-bottom: 1px solid var(--op-5);
}

.header {
	cursor: pointer;

	&:hover {
		opacity: 0.8;
	}
}

.stat_row {
	padding: 4px 0;
}

.view_all {
	cursor: pointer;
	gap: 4px;
	padding: 4px 0;

	&:hover {
		opacity: 0.8;
	}
}
</style>
