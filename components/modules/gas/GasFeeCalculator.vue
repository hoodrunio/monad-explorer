<script setup>
/** Services */
import { comma } from "@/services/utils"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

// Props from parent component
const props = defineProps({
	gasPrice: {
		type: Object,
		default: () => ({
			fast: null,
			median: null,
			slow: null,
		})
	},
	isLoading: {
		type: Boolean,
		default: false
	}
})

const inputEl = ref()
const isInputActive = ref(false)

const gasLimit = ref(null)
const handleGasLimitInput = () => {
	if (parseFloat(gasLimit.value.replace(/[^0-9.]/g, "")) > 5_665_140_000) {
		gasLimit.value = "5 665 140 000"
		return
	}
	gasLimit.value = comma(gasLimit.value.replace(/[^0-9.]/g, ""), " ")
}

const gasFee = computed(() => {
	if (!gasLimit.value || !props.gasPrice.fast) {
		return { fast: 0, median: 0, slow: 0 }
	}
	
	const gasLimitValue = parseFloat(gasLimit.value.replaceAll(" ", ""))
	const fast = Math.ceil(props.gasPrice.fast * gasLimitValue)
	const median = Math.ceil(props.gasPrice.median * gasLimitValue)
	const slow = Math.ceil(props.gasPrice.slow * gasLimitValue)

	return { fast, median, slow }
})

const formatGasPrice = (price) => {
	if (!price) return '—'
	return Number(price).toFixed(4).replace(/\.?0*$/, "")
}
</script>

<template>
	<Flex direction="column" :class="$style.wrapper">
		<Flex direction="column" gap="12" :class="$style.head">
			<Flex align="center" justify="between">
				<Text size="11" weight="600" color="primary">Gas Price Calculator</Text>

				<Tooltip position="center" side="left">
					<Icon name="help" size="12" color="tertiary" />

					<template #content>
						<Flex direction="column" gap="8">
							<Text align="left" height="140">
								Calculate transaction fees using current gas prices and your desired gas limit.
							</Text>

							<Flex align="center" gap="4">
								<Text mono weight="600" color="primary">Gas Fee</Text> <Icon name="equals" size="12" color="secondary" />
								<Text mono weight="600" color="primary">Gas Price</Text> <Icon name="close" size="12" color="secondary" />
								<Text mono weight="600" color="primary">Gas Limit</Text>
							</Flex>

							<Text align="left" height="140" color="tertiary">
								Fast, Standard (Median), and Slow represent different priority levels for your transaction.
							</Text>
						</Flex>
					</template>
				</Tooltip>
			</Flex>

			<Flex justify="between">
				<Flex direction="column" gap="6">
					<Flex align="center" gap="6">
						<Icon name="gas_fast" size="12" color="brand" />
						<Text size="11" weight="600" color="secondary">Fast</Text>
					</Flex>

					<Flex align="center" gap="6">
						<Skeleton v-if="isLoading" w="40" h="12" />
						<Text v-else size="12" weight="600" color="primary">
							{{ formatGasPrice(gasPrice.fast) }}
							<Text size="10" color="secondary">gwei</Text>
						</Text>
						<CopyButton v-if="!isLoading" :text="gasPrice.fast" size="10" />
					</Flex>
				</Flex>
				<Flex direction="column" gap="6">
					<Flex align="center" gap="6">
						<Icon name="gas_median" size="12" color="yellow" />
						<Text size="11" weight="600" color="secondary">Standard</Text>
					</Flex>

					<Flex align="center" gap="6">
						<Skeleton v-if="isLoading" w="40" h="12" />
						<Text v-else size="12" weight="600" color="primary">
							{{ formatGasPrice(gasPrice.median) }}
							<Text size="10" color="secondary">gwei</Text>
						</Text>
						<CopyButton v-if="!isLoading" :text="gasPrice.median" size="10" />
					</Flex>
				</Flex>
				<Flex direction="column" gap="6">
					<Flex align="center" gap="6">
						<Icon name="gas_slow" size="12" color="secondary" />
						<Text size="11" weight="600" color="secondary">Slow</Text>
					</Flex>

					<Flex align="center" gap="6">
						<Skeleton v-if="isLoading" w="40" h="12" />
						<Text v-else size="12" weight="600" color="primary">
							{{ formatGasPrice(gasPrice.slow) }}
							<Text size="10" color="secondary">gwei</Text>
						</Text>
						<CopyButton v-if="!isLoading" :text="gasPrice.slow" size="10" />
					</Flex>
				</Flex>
			</Flex>

			<Flex align="center" justify="center" :class="$style.multiply">
				<div />
				<Icon name="close" size="12" color="primary" />
				<div />
			</Flex>

			<Flex @click="inputEl.focus()" wide direction="column" gap="6" :class="[$style.gas_limit, isInputActive && $style.active]">
				<Text size="11" weight="600" color="tertiary" no-wrap>Gas Limit</Text>

				<input
					v-model="gasLimit"
					ref="inputEl"
					@input="handleGasLimitInput"
					@focus="isInputActive = true"
					@blur="isInputActive = false"
					placeholder="Enter gas limit (e.g., 21000 for simple transfer)"
					:class="$style.input_box"
				/>
			</Flex>
		</Flex>

		<Flex wide justify="center" :class="$style.mid"> <Icon name="equals" size="12" color="primary" /> </Flex>

		<Flex justify="between" :class="$style.bottom">
			<Flex direction="column" gap="6">
				<Text size="11" weight="600" color="tertiary">Fast Fee</Text>

				<Flex v-if="gasLimit && gasFee.fast" align="center" gap="6">
					<Text size="12" weight="600" color="primary">
						{{ comma(gasFee.fast, " ") }} <Text size="10" color="secondary">gwei</Text>
					</Text>
					<CopyButton :text="gasFee.fast" size="10" />
				</Flex>
				<Text v-else size="12" weight="600" color="tertiary"> 0 </Text>
			</Flex>
			<Flex direction="column" gap="6">
				<Text size="11" weight="600" color="tertiary">Standard Fee</Text>

				<Flex v-if="gasLimit && gasFee.median" align="center" gap="6">
					<Text size="12" weight="600" color="primary">
						{{ comma(gasFee.median, " ") }} <Text size="10" color="secondary">gwei</Text>
					</Text>
					<CopyButton :text="gasFee.median" size="10" />
				</Flex>
				<Text v-else size="12" weight="600" color="tertiary"> 0 </Text>
			</Flex>
			<Flex direction="column" gap="6">
				<Text size="11" weight="600" color="tertiary">Slow Fee</Text>

				<Flex v-if="gasLimit && gasFee.slow" align="center" gap="6">
					<Text size="12" weight="600" color="primary">
						{{ comma(gasFee.slow, " ") }} <Text size="10" color="secondary">gwei</Text>
					</Text>
					<CopyButton :text="gasFee.slow" size="10" />
				</Flex>
				<Text v-else size="12" weight="600" color="tertiary"> 0 </Text>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
}

.head {
	border-radius: 8px 8px 3px 3px;
	background: var(--op-5);

	padding: 10px;
}

.multiply {
	position: relative;
	height: 6px;

	padding: 10px 0 6px 0;

	& svg {
		position: absolute;
		top: 50%;
		box-sizing: content-box;

		transform: translateY(-50%);

		border-radius: 50%;
		background: var(--card-background);

		padding: 3px;
	}

	& div {
		width: 100%;
		height: 2px;

		background: var(--card-background);
	}
}

.mid {
	position: relative;
	height: 6px;

	& svg {
		position: absolute;
		top: 50%;
		box-sizing: content-box;

		transform: translateY(-50%);

		border-radius: 50%;
		background: var(--card-background);

		padding: 3px;
	}
}

.bottom {
	border-radius: 3px 3px 8px 8px;
	background: var(--op-5);

	padding: 10px;
	padding-top: 12px;
}

.gas_limit {
	border-radius: 5px;
	background: var(--card-background);
	cursor: text;

	padding: 8px;

	transition: box-shadow 0.2s ease;

	&:hover {
		box-shadow: 0 0 0 2px var(--op-5);
	}

	&.active {
		box-shadow: 0 0 0 2px var(--op-30);
	}
}

.input_box {
	width: 100%;

	font-size: 12px;
	font-weight: 600;
	color: var(--txt-primary);

	padding: 0;
}
</style>
