<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** Services */
import { comma } from "@/services/utils"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

/** API */
import { fetchEpochInfo } from "@/services/api/epoch"

const epochData = ref(null)
const isInited = ref(false)

let epochProgressInterval = null
let delayInterval = null
let refreshInterval = null

const epochInterval = ref(0)
const estimatedTimeToNextEpoch = ref(0)

const delay = ref(0)
const isDelayed = ref(false)

const epochProgress = ref(0)
const fillOffset = computed(() => {
	if (!epochData.value) return 0

	const progress = epochData.value.progress.progressPercentage
	return Math.min(progress, 100)
})

const init = async () => {
	try {
		const { data } = await fetchEpochInfo()
		epochData.value = data.value?.data || data.value
		
		if (!epochData.value) return

		epochInterval.value = epochData.value.epochInterval
		
		// Clear existing intervals
		clearInterval(epochProgressInterval)
		clearInterval(delayInterval)

		// Check if we're in epoch delay period using the new API field
		if (epochData.value.inEpochDelayPeriod && epochData.value.delayPeriod) {
			isDelayed.value = true
			// Use roundsElapsed from delayPeriod object
			delay.value = epochData.value.delayPeriod.roundsElapsed || 0
			delayInterval = setInterval(() => {
				delay.value += 1
			}, 1_000)
		} else {
			isDelayed.value = false
			delay.value = 0
			
			const { estimatedTimeToNextEpoch: timeEstimate } = epochData.value.progress
			estimatedTimeToNextEpoch.value = timeEstimate.hours * 3600 + timeEstimate.minutes * 60 + timeEstimate.seconds
			
			epochProgress.value = estimatedTimeToNextEpoch.value
			startEpochProgress()
		}

		isInited.value = true
	} catch (error) {
	}
}

onMounted(async () => {
	await init()
	
	// Refresh epoch data every 10 seconds
	refreshInterval = setInterval(async () => {
		await init()
	}, 10_000)
})

const startEpochProgress = () => {
	epochProgressInterval = setInterval(() => {
		epochProgress.value -= 1

		if (epochProgress.value <= 0) {
			isDelayed.value = true
			clearInterval(epochProgressInterval)

			delayInterval = setInterval(() => {
				delay.value += 1
			}, 1_000)
		}
	}, 1_000)
}

const formatTime = (seconds) => {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = seconds % 60

	if (hours > 0) {
		return `${hours}h ${minutes}m`
	} else if (minutes > 0) {
		return `${minutes}m ${secs}s`
	} else {
		return `${secs}s`
	}
}

onBeforeUnmount(() => {
	clearInterval(epochProgressInterval)
	clearInterval(delayInterval)
	clearInterval(refreshInterval)
})
</script>

<template>
	<div :class="$style.wrapper">
		<Flex justify="between">
			<Flex direction="column" gap="10">
				<Flex align="center" gap="4">
					<Text size="16" weight="600" color="primary"> Epoch </Text>

					<Text v-if="epochData" size="16" weight="600" color="brand"> {{ comma(epochData.currentEpoch) }}</Text>
					<Skeleton v-else w="60" h="12" />
				</Flex>

				<Flex align="center" gap="6">
					<Icon name="time" size="12" color="tertiary" :class="$style.time_icon" />
					<Text size="12" weight="500" color="tertiary">Next epoch in</Text>
				</Flex>
			</Flex>

			<Tooltip>
				<Flex direction="column" gap="12" align="end" justify="end">
					<Text v-if="epochData" size="14" weight="600" color="primary"> 
						{{ comma(epochData.epochInterval) }} blocks
					</Text>
					<Skeleton v-else w="32" h="14" />

					<Flex align="center" gap="4">
						<Text size="12" weight="500" color="tertiary"> Epoch Interval </Text>
						<Icon name="help" size="12" color="tertiary" />
					</Flex>
				</Flex>

				<template #content> Number of blocks per epoch </template>
			</Tooltip>
		</Flex>

		<Flex align="center" justify="center" :class="$style.bar">
			<Transition name="fade">
				<svg width="200%" height="28" :class="$style.lines">
					<pattern id="diagonalHatch2" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
						<line x1="0" y1="0" x2="0" y2="20" style="stroke: var(--op-10); stroke-width: 15" />
					</pattern>
					<rect x="0" y="0" width="100%" height="100%" fill="url(#diagonalHatch2)"></rect>
				</svg>
			</Transition>

			<Flex v-if="!isDelayed && epochData" align="center" justify="between" wide>
				<Icon name="block" size="16" color="primary" />

				<div v-for="item in 14" :key="item" :class="$style.dot" />

				<Flex justify="end" :class="$style.timer">
					<Text size="13" weight="600" color="primary">
						{{ formatTime(epochProgress) }}
					</Text>
				</Flex>
			</Flex>
			<Flex v-else-if="isDelayed" align="center" gap="4">
				<Text size="13" weight="600" color="secondary">Delayed by </Text>
				<Text size="13" weight="600" color="primary">{{ formatTime(delay) }}</Text>
			</Flex>
			<Flex v-else align="center" justify="center">
				<Skeleton w="100" h="16" />
			</Flex>

			<div v-if="!isDelayed && epochData" :style="{ transform: `scaleX(${fillOffset / 100})` }" :class="$style.fill"></div>
			<div v-else-if="isDelayed" :class="[$style.fill, $style.delayed]" />
		</Flex>

		<Flex v-if="epochData" direction="column" gap="6" style="margin-top: 8px;">
			<Flex align="center" justify="between">
				<Text size="12" weight="500" color="tertiary">
					{{ comma(epochData.progress.blocksCompleted) }} / {{ comma(epochData.epochInterval) }} blocks
				</Text>
				<Text size="12" weight="500" color="brand">
					{{ epochData.progress.progressPercentage.toFixed(2) }}%
				</Text>
			</Flex>
			
			<Flex align="center" justify="between">
				<Text size="12" weight="500" color="tertiary">
					Current Block: {{ comma(epochData.currentBlock) }}
				</Text>
				<Text size="12" weight="500" color="secondary">
					Next: {{ comma(epochData.progress.epochEndBlock + 1) }}
				</Text>
			</Flex>
			
			<Flex v-if="epochData.inEpochDelayPeriod && epochData.delayPeriod" align="center" justify="between" style="margin-top: 4px; padding-top: 10px; border-top: 1px solid var(--op-5);">
				<Text size="12" weight="500" color="tertiary">
					Delay Rounds: {{ comma(epochData.delayPeriod.roundsElapsed) }} / {{ comma(epochData.delayPeriod.totalDelayRounds) }}
				</Text>
				<Text size="12" weight="500" color="orange">
					{{ epochData.delayPeriod.progressPercentage.toFixed(2) }}%
				</Text>
			</Flex>
		</Flex>
	</div>
</template>

<style module>
.wrapper {
	display: flex;
	justify-content: space-between;
	flex-direction: column;

	min-height: 122px;

	border-radius: 12px;
	background: var(--card-background);

	padding: 16px;

	transition: all 0.2s ease;

	&:hover {
		box-shadow: inset 0 0 0 2px var(--op-5);
	}

	&:focus-visible {
		box-shadow: inset 0 0 0 2px var(--op-8);
	}

	&:active {
		box-shadow: inset 0 0 0 2px var(--op-10);
	}
}

.bar {
	position: relative;
	height: 28px;
	z-index: 0;

	box-shadow: 0 0 0 2px var(--op-5);
	border-radius: 6px;
	background: var(--block-progress-background);
	overflow: hidden;

	padding: 0 8px;

	.lines {
		position: absolute;

		top: 0;
		left: 0;
		bottom: 0;

		transform: translateX(-50%);

		animation: lines-movement 25s linear infinite;
	}
}

@keyframes lines-movement {
	0% {
		transform: translateX(-50%);
	}

	50% {
		transform: translateX(0%);
	}

	100% {
		transform: translateX(-50%);
	}
}

.dot {
	width: 4px;
	height: 4px;

	border-radius: 50%;
	background: var(--op-30);
}

.timer {
	width: 60px;
}

.fill {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;

	width: 100%;

	background: var(--neutral-mint);

	z-index: -1;

	will-change: transform;
	transition: all 0.9s ease;
	transform-origin: left;

	&.delayed {
		background: var(--op-10);
	}
}

.time_icon {
	animation: rotation 1.5s ease infinite;
}

@keyframes rotation {
	0% {
		transform: rotate(0deg);
	}

	20% {
		transform: rotate(180deg);
	}

	30% {
		transform: rotate(-30deg);
	}

	50% {
		transform: rotate(0deg);
	}

	100% {
		transform: rotate(0deg);
	}
}
</style> 