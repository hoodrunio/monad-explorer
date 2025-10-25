<script setup>
/** Components */
import ConsensusHeader from "@/components/modules/consensus/ConsensusHeader.vue"
import ConsensusQuorumCard from "@/components/modules/consensus/ConsensusQuorumCard.vue"
import ConsensusSummaryTiles from "@/components/modules/consensus/ConsensusSummaryTiles.vue"
import ConsensusVotesTable from "@/components/modules/consensus/ConsensusVotesTable.vue"
import ConsensusMissingTable from "@/components/modules/consensus/ConsensusMissingTable.vue"
import ConsensusHistoryChart from "@/components/modules/consensus/ConsensusHistoryChart.vue"

/** Composables */
import { useConsensusLatest, useConsensusQuorum } from "@/composables/useConsensusPolling"

/** API */
import { preloadGithubValidatorData } from "@/services/api/github"

const { data: latestData } = useConsensusLatest()
const { data: quorumData } = useConsensusQuorum()

// Track epoch changes for toast notifications
const previousEpoch = ref(null)
const showEpochChangeToast = ref(false)
const newEpoch = ref(null)

watch(
	() => latestData.value?.epoch,
	(newVal, oldVal) => {
		if (oldVal !== null && newVal !== oldVal && newVal !== null) {
			previousEpoch.value = oldVal
			newEpoch.value = newVal
			showEpochChangeToast.value = true

			// Auto-hide toast after 5 seconds
			setTimeout(() => {
				showEpochChangeToast.value = false
			}, 5000)
		}
	}
)

// Track quorum reached for banner
const showQuorumBanner = ref(false)
const quorumReachedRound = ref(null)

watch(
	() => quorumData.value?.is_quorum_reached,
	(newVal, oldVal) => {
		if (newVal && !oldVal) {
			quorumReachedRound.value = latestData.value?.round
			showQuorumBanner.value = true

			// Auto-hide banner after 10 seconds
			setTimeout(() => {
				showQuorumBanner.value = false
			}, 10000)
		}
	}
)

const dismissEpochToast = () => {
	showEpochChangeToast.value = false
}

const dismissQuorumBanner = () => {
	showQuorumBanner.value = false
}

// Preload GitHub validator data to prevent multiple API calls
preloadGithubValidatorData().catch(error => {
	console.warn("Failed to preload GitHub validator data:", error)
})

useHead({
	title: "Consensus - Monad Explorer",
	link: [
		{
			rel: "canonical",
			href: "/consensus",
		},
	],
	meta: [
		{
			name: "description",
			content:
				"Real-time consensus monitoring for the Monad network. View quorum progress, validator participation, signatures, and consensus history.",
		},
	],
})
</script>

<template>
	<Flex direction="column" wide :class="$style.wrapper">
		<!-- Breadcrumbs -->
		<Flex align="end" justify="between" :class="$style.breadcrumbs">
			<Breadcrumbs
				:items="[
					{ link: '/', name: 'Dashboard' },
					{ link: '/consensus', name: 'Consensus' },
				]"
			/>
		</Flex>

		<!-- Page Title -->
		<Flex align="center" gap="8" :class="$style.page_header">
			<Icon name="activity" size="16" color="secondary" />
			<Text as="h1" size="14" weight="600" color="primary">Network Consensus</Text>
		</Flex>

		<!-- Epoch Change Toast -->
		<Transition name="slide-down">
			<Flex v-if="showEpochChangeToast" align="center" justify="between" :class="$style.toast_epoch">
				<Flex align="center" gap="8">
					<Icon name="time" size="14" color="blue" />
					<Text size="12" weight="600" color="blue">
						Epoch switched to {{ newEpoch }}
					</Text>
				</Flex>
				<button @click="dismissEpochToast" :class="$style.toast_close">
					<Icon name="close" size="12" color="blue" />
				</button>
			</Flex>
		</Transition>

		<!-- Quorum Reached Banner -->
		<Transition name="slide-down">
			<Flex v-if="showQuorumBanner" align="center" justify="between" :class="$style.banner_quorum">
				<Flex align="center" gap="8">
					<Icon name="check" size="14" color="green" />
					<Text size="13" weight="600" color="green">
						Quorum achieved on round #{{ quorumReachedRound }}
					</Text>
				</Flex>
				<button @click="dismissQuorumBanner" :class="$style.banner_close">
					<Icon name="close" size="12" color="green" />
				</button>
			</Flex>
		</Transition>

		<!-- Main Content -->
		<Flex direction="column" gap="20" wide>
			<!-- Section 1: Header -->
			<ConsensusHeader />

			<!-- Section 2: Quorum Card -->
			<ConsensusQuorumCard />

			<!-- Section 3: Summary Tiles -->
			<ConsensusSummaryTiles />

			<!-- Section 4: Who Signed Table -->
			<ConsensusVotesTable />

			<!-- Section 5: Who is Missing Table -->
			<ConsensusMissingTable />

			<!-- Section 6: History Chart -->
			<ConsensusHistoryChart />
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	padding: 20px 24px 60px 24px;
}

.breadcrumbs {
	margin-bottom: 16px;
}

.page_header {
	height: 46px;
	border-radius: 8px 8px 4px 4px;
	background: var(--card-background);
	padding: 0 16px;
	margin-bottom: 16px;
}

.toast_epoch {
	padding: 12px 16px;
	border-radius: 8px;
	background: rgba(59, 130, 246, 0.1);
	border: 1px solid rgba(59, 130, 246, 0.3);
	margin-bottom: 16px;
}

.toast_close {
	padding: 4px;
	border: none;
	background: transparent;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	transition: background-color 0.2s ease;
}

.toast_close:hover {
	background-color: rgba(59, 130, 246, 0.1);
}

.banner_quorum {
	padding: 14px 20px;
	border-radius: 8px;
	background: rgba(34, 197, 94, 0.1);
	border: 1px solid rgba(34, 197, 94, 0.3);
	margin-bottom: 16px;
}

.banner_close {
	padding: 4px;
	border: none;
	background: transparent;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	transition: background-color 0.2s ease;
}

.banner_close:hover {
	background-color: rgba(34, 197, 94, 0.1);
}

/* Animations */
.slide-down-enter-active,
.slide-down-leave-active {
	transition: all 0.3s ease;
}

.slide-down-enter-from {
	opacity: 0;
	transform: translateY(-10px);
}

.slide-down-leave-to {
	opacity: 0;
	transform: translateY(-10px);
}

@media (max-width: 768px) {
	.wrapper {
		padding: 20px 16px 60px 16px;
	}

	.page_header {
		padding: 0 12px;
	}

	.toast_epoch,
	.banner_quorum {
		padding: 10px 12px;
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 20px 12px 60px 12px;
	}

	.page_header {
		padding: 0 10px;
	}

	.toast_epoch,
	.banner_quorum {
		padding: 8px 10px;
	}
}
</style>
