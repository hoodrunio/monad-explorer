<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** UI */
import AmountInCurrency from "@/components/AmountInCurrency.vue"
import BookmarkButton from "@/components/BookmarkButton.vue"
import Button from "@/components/ui/Button.vue"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"
import Events from "@/components/shared/tables/Events.vue"

/** Shared Components */
import MessageTypeBadge from "@/components/shared/MessageTypeBadge.vue"
import MessagesTable from "@/components/modules/tx/MessagesTable.vue"
import TokenFlow from "@/components/modules/tx/TokenFlow.vue"

/** Services */
import { comma, shortHex } from "@/services/utils"
import { calculateSavings } from "@/services/utils/amounts"

/** Composables */
import { useTransactionMethods } from "@/composables/useTransactionMethods"
import { useMonUsdConverter } from "@/composables/useMonUsdConverter"

// API imports removed - using data directly from tx prop

/** Store */
import { useModalsStore } from "@/store/modals.store"
import { useCacheStore } from "@/store/cache.store"
const modalsStore = useModalsStore()
const cacheStore = useCacheStore()

const route = useRoute()
const router = useRouter()

const props = defineProps({
	tx: {
		type: Object,
		required: true,
	},
})

const preselectedTab = route.query.tab && ["transfers", "internal", "logs"].includes(route.query.tab) ? route.query.tab : "transfers"
const activeTab = ref(preselectedTab)

// USD Conversion
const { convertToUsd } = useMonUsdConverter()

// Use data directly from tx prop since API already includes everything
const tokenTransfers = computed(() => props.tx?.tokenTransfers || props.tx?.token_transfers || [])
const internalTransactions = computed(() => props.tx?.internalTransactions || [])

// Transaction method information
const { getMethodInfo, formatInputData } = useTransactionMethods()
const methodInfo = computed(() => {
	if (!props.tx) return null
	return getMethodInfo(props.tx)
})

// Reactive method information
const enhancedMethodName = computed(() => {
	if (!methodInfo.value) return props.tx?.methodName || null
	return methodInfo.value.methodName.value || props.tx?.methodName || null
})

const methodSignature = computed(() => {
	if (!methodInfo.value) return null
	return methodInfo.value.signature.value
})

const canDecodeInput = computed(() => {
	if (!methodInfo.value) return false
	return methodInfo.value.canDecode.value
})

const isLoadingMethod = computed(() => {
	if (!methodInfo.value) return false
	return methodInfo.value.isLoadingMethod.value
})

// Format input data for display
const formattedInput = computed(() => {
	if (!props.tx?.input) return null
	return formatInputData(props.tx.input, 80)
})

const hasInputData = computed(() => {
	return props.tx?.input && props.tx.input !== '0x' && props.tx.input.length > 2
})

// EVM transaction helper functions
const formatGasValue = (value) => {
	if (!value) return "0"
	return comma(value)
}

const formatMonValue = (value, decimals = 18) => {
	if (!value || value === "0") return "0"
	// Convert wei to MON (divide by 10^18)
	const monValue = parseInt(value) / Math.pow(10, 18)
	return monValue.toFixed(decimals)
}

const formatGwei = (value) => {
	if (!value || value === "0") return "0"
	// Convert wei to Gwei (divide by 10^9)
	const gweiValue = parseInt(value) / Math.pow(10, 9)
	return gweiValue.toFixed(2)
}

const getGasUsagePercent = (gasUsed, gasLimit) => {
	if (!gasLimit || gasLimit === "0") return 0
	return (parseInt(gasUsed) / parseInt(gasLimit)) * 100
}

const savings = computed(() => {
	return calculateSavings(props.tx?.maxFeePerGas, props.tx?.effectiveGasPrice, props.tx?.gasUsed)
})

const gasBarColor = computed(() => {
	if (!props.tx?.gasUsed || !props.tx?.gas) return "var(--grey)"
	let percent = getGasUsagePercent(props.tx.gasUsed, props.tx.gas)

	if (percent > 100) {
		return "var(--red)"
	} else if (percent < 30) {
		return "var(--orange)"
	} else if (percent < 60) {
		return "var(--yellow)"
	} else {
		return "var(--green)"
	}
})

// Transaction type helper
const getTransactionType = (tx) => {
	if (tx.isContractCreation) return "Contract Creation"
	if (tx.isContractInteraction) return "Contract Call"
	if (tx.toAddress) return "Transfer"
	return "Unknown"
}

watch(
	() => activeTab.value,
	() =>
		router.replace({
			query: {
				tab: activeTab.value,
			},
		}),
)

onMounted(() => {
	router.replace({
		query: {
			tab: activeTab.value,
		},
	})
	// No need for additional API calls since transaction data already includes 
	// tokenTransfers, decodedLogs, and internalTransactions
})

const handleViewRawTransaction = () => {
	cacheStore.current._target = "transaction"
	modalsStore.open("rawData")
}

const handleDecodeInput = () => {
	// Store transaction data and method signature in cache for the modal
	cacheStore.current.transaction = props.tx
	cacheStore.current.methodSignature = methodSignature.value
	
	// Open the input decode modal
	modalsStore.open("inputDecode")
}
</script>

<template>
	<Flex direction="column" gap="4">
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="tx" size="14" color="primary" />
				<Text as="h1" size="13" weight="600" color="primary">
					Transaction <Text v-if="tx?.hash" color="secondary">{{ tx.hash.slice(0, 6) }} ••• {{ tx.hash.slice(-4) }}</Text>
				</Text>
				<CopyButton v-if="tx?.hash" :text="tx.hash" size="12" />
			</Flex>

			<Flex align="center" gap="12">
				<BookmarkButton v-if="tx?.hash" type="transaction" :id="tx.hash" />

				<div class="divider_v" />

				<Dropdown>
					<Button type="secondary" size="mini">
						<Icon name="dots" size="16" color="primary" />
					</Button>

					<template #popup>
						<DropdownItem @click="handleViewRawTransaction"> View Raw Transaction </DropdownItem>
					</template>
				</Dropdown>
			</Flex>
		</Flex>

		<Flex gap="4" :class="$style.content">
			<Flex direction="column" :class="$style.data">
				<Flex direction="column" gap="24" :class="$style.main">
					<Flex v-if="tx" align="center" gap="40">
						<Flex direction="column" gap="10" :class="$style.key_value">
							<Text size="12" weight="600" color="secondary">Status</Text>

							<Flex align="center" gap="6">
								<Icon
									:name="(tx.status === 'ok' || tx.status === 1) ? 'check-circle' : 'close-circle'"
									size="14"
									:color="(tx.status === 'ok' || tx.status === 1) ? 'green' : 'red'"
								/>
								<Text size="13" weight="600" color="primary" style="text-transform: capitalize">
									{{ (tx.status === 'ok' || tx.status === 1) ? "Success" : "Failed" }}
								</Text>
							</Flex>
						</Flex>

						<Flex direction="column" gap="10" :class="$style.key_value">
							<Text size="12" weight="600" color="secondary">Time</Text>
							<Text v-if="tx.timestamp" size="13" weight="600" color="primary">
								{{ DateTime.fromISO(tx.timestamp).setLocale("en").toFormat("ff") }}
							</Text>
						</Flex>
					</Flex>

					<Flex v-if="tx.error || tx.revertReason" direction="column" gap="6">
						<Text size="12" weight="600" color="secondary">Error Message</Text>

						<Text size="12" height="140" weight="600" color="tertiary" mono selectable>
							{{ tx.error || tx.revertReason }}
						</Text>
					</Flex>

					<Flex direction="column" gap="10" :class="$style.key_value">
						<Text size="12" weight="600" color="secondary">Type</Text>
						<Text size="13" weight="600" color="primary">{{ getTransactionType(tx) }}</Text>
					</Flex>

					<Flex direction="column" gap="10" :class="$style.key_value">
						<Text size="12" weight="600" color="secondary">Block</Text>

						<NuxtLink :to="`/block/${tx.blockNumber}`">
							<Outline>
								<Flex align="center" gap="6">
									<Icon name="block" size="14" color="tertiary" />
									<Text size="13" weight="600" color="primary">{{ comma(tx.blockNumber) }}</Text>
								</Flex>
							</Outline>
						</NuxtLink>
					</Flex>

					<Flex direction="column" gap="8" :class="$style.key_value">
						<Text size="12" weight="600" color="secondary">Hash</Text>
						<BadgeValue :text="tx.hash" />
					</Flex>

					<Flex direction="column" gap="10" :class="$style.key_value">
						<Text size="12" weight="600" color="secondary">From Address</Text>
						<BadgeValue :text="tx.fromAddress" />
					</Flex>

					<Flex v-if="tx.toAddress" direction="column" gap="10" :class="$style.key_value">
						<Text size="12" weight="600" color="secondary">To Address</Text>
						<BadgeValue :text="tx.toAddress" />
					</Flex>

					<Flex direction="column" gap="10" :class="$style.key_value">
						<Text size="12" weight="600" color="secondary">Value</Text>
						<Flex direction="column" gap="4">
							<Text size="13" weight="600" color="primary">{{ formatMonValue(tx.value, 18) }} MON</Text>
							<Text v-if="tx.value && tx.value !== '0' && convertToUsd(tx.value)" size="11" weight="600" color="green">
								{{ convertToUsd(tx.value) }}
							</Text>
						</Flex>
					</Flex>

					<Flex v-if="tx?.gasUsed && tx?.gas" direction="column" gap="10">
						<Text size="12" weight="600" color="secondary">Gas Used</Text>

						<div :class="$style.gas_bar">
							<div
								:style="{
									width: `${getGasUsagePercent(tx.gasUsed, tx.gas) > 100 ? 100 : getGasUsagePercent(tx.gasUsed, tx.gas)}%`,
									background: gasBarColor,
									boxShadow: `0 0 6px ${gasBarColor}`,
								}"
								:class="$style.gas_used"
							/>
						</div>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="secondary">{{ getGasUsagePercent(tx.gasUsed, tx.gas).toFixed(2) }}%</Text>
							<Text size="12" weight="600" color="tertiary">{{ formatGasValue(tx.gasUsed) }} / {{ formatGasValue(tx.gas) }}</Text>
						</Flex>
					</Flex>

					<!-- Burnt & Savings Section -->
					<Flex v-if="tx.burntFee || savings !== '0'" direction="column" gap="16">
						<Text size="12" weight="600" color="secondary">Burnt & Savings</Text>

						<Flex align="start" justify="between" gap="16">
							<!-- Burnt Fee -->
							<Flex direction="column" gap="6" style="flex: 1">
								<Flex align="center" gap="4">
									<Icon name="burn" size="12" color="orange" />
									<Text size="12" weight="600" color="tertiary">Burnt Fee</Text>
								</Flex>
								<Flex direction="column" gap="4">
									<Text size="13" weight="600" color="primary">{{ formatMonValue(tx.burntFee, 6) }} MON</Text>
									<Text v-if="tx.burntFee && tx.burntFee !== '0' && convertToUsd(tx.burntFee)" size="11" weight="600" color="tertiary">
										{{ convertToUsd(tx.burntFee) }}
									</Text>
								</Flex>
							</Flex>

							<!-- Savings -->
							<Flex direction="column" gap="6" style="flex: 1">
								<Flex align="center" gap="4">
									<Icon name="coins" size="12" color="green" />
									<Text size="12" weight="600" color="tertiary">Savings</Text>
								</Flex>
								<Flex direction="column" gap="4">
									<Text size="13" weight="600" color="green">{{ formatMonValue(savings, 6) }} MON</Text>
									<Text v-if="savings && savings !== '0' && convertToUsd(savings)" size="11" weight="600" color="green">
										{{ convertToUsd(savings) }}
									</Text>
								</Flex>
							</Flex>
						</Flex>
					</Flex>

					<Flex direction="column" gap="16">
						<Text size="12" weight="600" color="secondary">Details</Text>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Transaction Index</Text>
							<Text size="12" weight="600" color="secondary">{{ tx.transactionIndex }}</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Gas Price</Text>
							<Text size="12" weight="600" color="secondary">{{ formatGwei(tx.gasPrice) }} Gwei</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Effective Gas Price</Text>
							<Text size="12" weight="600" color="secondary">{{ formatGwei(tx.effectiveGasPrice) }} Gwei</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Transaction Fee</Text>
							<Text size="12" weight="600" color="secondary">{{ formatMonValue(tx.transactionFee, 6) }} MON</Text>
						</Flex>

						<Flex v-if="enhancedMethodName || tx.methodName" direction="column" gap="6">
							<Text size="12" weight="600" color="tertiary">Method</Text>
							<Flex align="center" justify="between">
								<Text size="12" weight="600" color="secondary">
									{{ enhancedMethodName || tx.methodName }}
									<Text v-if="isLoadingMethod" size="12" color="support"> (loading...)</Text>
								</Text>
								<Flex v-if="canDecodeInput" align="center" gap="4">
									<Icon name="code" size="12" color="green" />
									<Text size="11" weight="500" color="green">Decodable</Text>
								</Flex>
							</Flex>
							<Text v-if="methodSignature" size="11" weight="500" color="tertiary" mono>
								{{ methodSignature }}
							</Text>
						</Flex>

						<Flex v-if="tx.methodID" align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Method ID</Text>
							<Text size="12" weight="600" color="secondary" mono>{{ tx.methodID }}</Text>
						</Flex>

						<Flex v-if="hasInputData" direction="column" gap="6">
							<Flex align="center" justify="between">
								<Text size="12" weight="600" color="tertiary">Input Data</Text>
								<Flex align="center" gap="4">
									<CopyButton :text="tx.input" size="12" />
									<Button v-if="canDecodeInput" type="secondary" size="mini" @click="handleDecodeInput">
										<Icon name="code" size="12" />
										<Text size="11" weight="600">Decode</Text>
									</Button>
								</Flex>
							</Flex>
							<Text size="11" weight="500" color="tertiary" mono selectable :class="$style.input_data">
								{{ formattedInput }}
							</Text>
						</Flex>

						<Flex v-if="tokenTransfers.length" align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Token Transfers</Text>
							<Text size="12" weight="600" color="secondary">{{ tokenTransfers.length }}</Text>
						</Flex>

						<Flex v-if="tx.decodedLogs && tx.decodedLogs.length" align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Logs</Text>
							<Text size="12" weight="600" color="secondary">{{ tx.decodedLogs.length }}</Text>
						</Flex>

						<Flex v-if="internalTransactions.length" align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Internal Transactions</Text>
							<Text size="12" weight="600" color="secondary">{{ internalTransactions.length }}</Text>
						</Flex>
					</Flex>
				</Flex>
			</Flex>

			<Flex direction="column" gap="4" wide :class="$style.events_wrapper">
				<Flex align="center" justify="between" :class="$style.tabs_wrapper">
					<Flex gap="4" :class="$style.tabs">
						<Flex
							@click="activeTab = 'transfers'"
							align="center"
							gap="6"
							:class="[$style.tab, activeTab === 'transfers' && $style.active]"
						>
							<Icon name="coins" size="12" color="secondary" />
							<Text size="13" weight="600">Token Transfers</Text>
						</Flex>

						<Flex
							@click="activeTab = 'internal'"
							align="center"
							gap="6"
							:class="[$style.tab, activeTab === 'internal' && $style.active]"
						>
							<Icon name="hash" size="12" color="secondary" />
							<Text size="13" weight="600">Internal Txs</Text>
						</Flex>

						<Flex
							@click="activeTab = 'logs'"
							align="center"
							gap="6"
							:class="[$style.tab, activeTab === 'logs' && $style.active]"
						>
							<Icon name="zap" size="12" color="secondary" />
							<Text size="13" weight="600">Logs</Text>
						</Flex>
					</Flex>
				</Flex>

				<Flex v-if="activeTab === 'transfers'" :class="$style.inner">
					<Flex v-if="tokenTransfers.length" direction="column" gap="16" :class="$style.content_padding">
						<!-- Sankey Flow Visualization -->
						<TokenFlow :transfers="tokenTransfers" />

						<!-- Detailed Transfer List -->
						<Flex direction="column" gap="8">
							<Flex align="center" gap="6">
								<Icon name="list" size="12" color="tertiary" />
								<Text size="12" weight="600" color="secondary">Transfer Details</Text>
							</Flex>
							<Flex direction="column" gap="12">
								<div v-for="transfer in tokenTransfers" :key="transfer.log_index || transfer.transaction_hash" :class="$style.transfer_item">
									<Flex align="center" justify="between" wide>
										<Flex direction="column" gap="4">
											<Text size="12" weight="600" color="secondary">{{ transfer.token?.type || 'Token' }} Transfer</Text>
											<Flex align="center" gap="8">
												<Text size="13" weight="600" color="primary" mono>{{ shortHex(transfer.from?.hash || transfer.from) }}</Text>
												<Icon name="arrow-narrow-right" size="12" color="tertiary" />
												<Text size="13" weight="600" color="primary" mono>{{ shortHex(transfer.to?.hash || transfer.to) }}</Text>
											</Flex>
										</Flex>
										<Flex direction="column" gap="4" align="end">
											<Flex align="center" gap="4">
												<Text size="13" weight="600" color="primary">{{ formatMonValue(transfer.total?.value || transfer.value, 6) }}</Text>
												<Text size="13" weight="600" color="brand">{{ transfer.token?.symbol }}</Text>
											</Flex>
											<Text size="12" weight="600" color="tertiary" mono>{{ shortHex(transfer.token?.address_hash) }}</Text>
										</Flex>
									</Flex>
								</div>
							</Flex>
						</Flex>
					</Flex>
					<Flex v-else direction="column" align="center" justify="center" gap="8" :class="$style.empty_state">
						<Icon name="coins" size="24" color="support" />
						<Text size="13" weight="600" color="secondary">No token transfers</Text>
					</Flex>
				</Flex>

				<Flex v-if="activeTab === 'internal'" :class="$style.inner">
					<Flex v-if="internalTransactions.length" direction="column" gap="12" :class="$style.content_padding">
						<div v-for="internal in internalTransactions" :class="$style.transfer_item">
							<Flex align="center" justify="between" wide>
								<Flex direction="column" gap="4">
									<Text size="12" weight="600" color="secondary">{{ internal.type || 'CALL' }}</Text>
									<Flex align="center" gap="8">
										<Text size="13" weight="600" color="primary" mono>{{ shortHex(internal.from?.hash || internal.from) }}</Text>
										<Icon name="arrow-narrow-right" size="12" color="tertiary" />
										<Text size="13" weight="600" color="primary" mono>{{ shortHex(internal.to?.hash || internal.to) }}</Text>
									</Flex>
								</Flex>
								<Flex direction="column" gap="4" align="end">
									<Text size="13" weight="600" color="primary">{{ formatMonValue(internal.value, 18) }} MON</Text>
									<Text size="12" weight="600" color="tertiary">Gas: {{ formatGasValue(internal.gas_limit || internal.gas) }}</Text>
								</Flex>
							</Flex>
						</div>
					</Flex>
					<Flex v-else direction="column" align="center" justify="center" gap="8" :class="$style.empty_state">
						<Icon name="hash" size="24" color="support" />
						<Text size="13" weight="600" color="secondary">No internal transactions</Text>
					</Flex>
				</Flex>

				<Flex v-if="activeTab === 'logs'" :class="$style.inner">
					<Events :tx="tx" />
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.header {
	height: 40px;

	border-radius: 8px 8px 4px 4px;
	background: var(--card-background);

	padding: 0 12px;
}

.content {
	display: grid;
	grid-template-columns: 384px 1fr;
}

.data {
	max-width: 384px;

	border-radius: 4px 4px 4px 8px;
	background: var(--card-background);

	.main {
		min-width: 384px;

		padding: 16px;

		& .key_value {
			max-width: 100%;
		}
	}
}

.gas_bar {
	width: 100%;
	height: 6px;

	border-radius: 50px;
	background: linear-gradient(var(--op-10), var(--op-5));

	& .gas_used {
		height: 6px;

		border-radius: 50px;
	}
}

.badge {
	border-radius: 5px;
	background: var(--op-5);
	box-shadow: inset 0 0 0 1px var(--op-10);

	padding: 4px 6px;
}

.events_wrapper {
	min-width: 0;
}

.tabs_wrapper {
	min-height: 44px;
	overflow-x: auto;

	border-radius: 4px;
	background: var(--card-background);

	padding: 0 8px;
}

.tabs_wrapper::-webkit-scrollbar {
	display: none;
}

.tab {
	height: 28px;

	cursor: pointer;
	border-radius: 6px;

	padding: 0 8px;

	transition: all 0.1s ease;

	& span {
		color: var(--txt-tertiary);

		transition: all 0.1s ease;
	}

	&:hover {
		& span {
			color: var(--txt-secondary);
		}
	}
}

.tab.active {
	background: var(--op-8);

	& span {
		color: var(--txt-primary);
	}
}

.inner {
	height: 100%;

	border-radius: 4px 4px 8px 4px;
	background: var(--card-background);
}

.content_padding {
	padding: 16px;
}

.transfer_item {
	padding: 12px;
	border-radius: 6px;
	background: var(--op-5);
	border: 1px solid var(--op-8);
}

.empty_state {
	flex: 1;
	padding: 32px 16px;
}

.events {
	padding: 16px;
}

.transaction_types {
	width: fit-content;

	border-radius: 50px;
	background: var(--op-5);
	border: 1px solid var(--op-5);

	padding: 6px 10px;
	margin-bottom: 8px;
}

.event {
	height: 36px;

	cursor: pointer;

	& .left {
		height: 100%;

		& div {
			width: 2px;
			height: 100%;
			background: var(--op-5);
		}
	}

	& .left.first {
		& div {
			&:first-child {
				background: transparent;
			}
		}
	}

	& .left.last {
		& div {
			&:last-child {
				background: transparent;
			}
		}
	}

	& .right {
		min-width: 0;
		height: 100%;

		border-bottom: 1px solid var(--op-5);

		& .text {
			display: inline-block;
			color: var(--txt-tertiary);

			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;

			& > * {
				margin-right: 4px;
			}

			& .tooltip {
				display: inline-block;
			}
		}
	}
}

.memo {
	text-overflow: ellipsis;
	overflow: hidden;
}

.input_data {
	word-break: break-all;
	line-height: 1.4;
	padding: 8px;
	border-radius: 4px;
	background: var(--op-5);
	border: 1px solid var(--op-8);
}

@media (max-width: 800px) {
	.content {
		grid-template-columns: 1fr;
	}

	.data {
		max-width: initial;
		min-width: 0;

		border-radius: 4px;
	}
}

@media (max-width: 550px) {
	.header {
		height: initial;
		flex-direction: column;
		gap: 12px;

		padding: 12px 0;
	}
}

@media (max-width: 500px) {
	.data {
		.main {
			min-width: initial;
		}
	}
}

@media (max-width: 400px) {
	.tabs_wrapper {
		overflow-x: auto;

		&::-webkit-scrollbar {
			display: none;
		}
	}
}
</style>
