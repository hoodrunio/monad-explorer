<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** UI */
import Button from "@/components/ui/Button.vue"
import Tooltip from "@/components/ui/Tooltip.vue"
import AmountInCurrency from "@/components/AmountInCurrency.vue"

/** Services */
import { comma, formatBytes, shortHex, space } from "@/services/utils"

/** API */
import { fetchBlockTransactions } from "@/services/api/block"

/** Store */
import { useAppStore } from "@/store/app.store"
import { useNotificationsStore } from "@/store/notifications.store"
const appStore = useAppStore()
const notificationsStore = useNotificationsStore()

const blocks = computed(() => appStore.latestBlocks)
const lastBlock = computed(() => appStore.latestBlocks[0])
const lastHead = computed(() => appStore.lastHead)
const preview = reactive({
	block: blocks.value[0],
	transactions: [],
	isLoadingTransactions: false,
})

const autoSelect = ref(true)

// EVM block helper functions
const formatGasValue = (value) => {
	if (!value) return "0"
	return comma(value)
}

const formatMonValue = (value) => {
	if (!value || value === "0") return "0"
	// Convert wei to MON (divide by 10^18)
	const monValue = parseInt(value) / Math.pow(10, 18)
	return monValue.toFixed(6)
}

const getGasUsagePercent = (gasUsed, gasLimit) => {
	if (!gasLimit || gasLimit === "0") return 0
	return (parseInt(gasUsed) / parseInt(gasLimit)) * 100
}

const handleSelectBlock = (b, isUser) => {
	if (isUser) autoSelect.value = false

	if (preview.block.number === b.number) return

	preview.block = b
	getTransactionsByBlock()
}

const getTransactionsByBlock = async () => {
	if (!preview.block.number) return
	
	preview.isLoadingTransactions = true
	
	try {
		const { data } = await fetchBlockTransactions({
			number: preview.block.number,
			limit: 5,
			includeTokenTransfers: false,
		})
		
		// Process transactions to match expected format
		preview.transactions = (data.value.data?.transactions || []).map(tx => ({
			...tx,
			status: tx.status === 1 ? "success" : "failed",
		}))
	} catch (error) {
		console.error("Error fetching block transactions:", error)
		preview.transactions = []
	}
	
	preview.isLoadingTransactions = false
}

getTransactionsByBlock()

const blocksSnapshot = ref([])
const isPaused = ref(false)

const handlePause = () => {
	if (!lastHead?.value.synced) return

	isPaused.value = !isPaused.value
}

const showSidebar = ref(false)
const handleToggleSidebar = () => (showSidebar.value = !showSidebar.value)

watch(
	() => isPaused.value,
	() => {
		if (isPaused.value) {
			blocksSnapshot.value = [...blocks.value]
		} else {
			const newBlocksSincePause = blocks.value[0]?.number - blocksSnapshot.value[0]?.number

			if (newBlocksSincePause)
				notificationsStore.create({
					notification: {
						type: "info",
						icon: "block",
						title: `Received ${blocks.value[0]?.number - blocksSnapshot.value[0]?.number} new blocks since the pause`,
						description: "New blocks will be added to the timeline",
						autoDestroy: true,
					},
				})

			blocksSnapshot.value = []

			handleSelectBlock(lastBlock.value, false)
		}
	},
)

/** Auto-pause for unsynced head */
if (Object.keys(lastHead.value).length !== 0 && !lastHead?.value.synced) {
	handlePause()

	notificationsStore.create({
		notification: {
			type: "warning",
			icon: "pause",
			title: `The blocks timeline on pause`,
			description: "Due to the unsynced head",
			autoDestroy: false,
		},
	})
}

watch(
	() => preview.block,
	async () => {
		if (preview.block.transactionCount && showSidebar.value) {
			getTransactionsByBlock()
		}
	},
)

watch(
	() => lastBlock.value,
	() => {
		if (autoSelect.value && !isPaused.value) handleSelectBlock(lastBlock.value, false)
	},
)

watch(
	() => autoSelect.value,
	() => {
		if (autoSelect.value) handleSelectBlock(lastBlock.value, false)
	},
)
</script>

<template>
	<Flex wide direction="column" gap="4">
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="timeline" size="14" color="primary" />
				<Text size="13" weight="600" color="primary">Blocks Timeline</Text>
			</Flex>

			<Flex align="center" gap="8">
				<Tooltip position="end">
					<Button @click="handlePause" type="tertiary" size="mini" :disabled="!lastHead?.synced">
						<Icon :name="isPaused ? 'resume' : 'pause'" size="14" color="secondary" />
						{{ isPaused ? "Resume" : "Pause" }}
					</Button>

					<template v-if="lastHead?.synced" #content>
						<Flex align="start" direction="column" gap="6">
							<Text>Stop receiving new blocks</Text>
							<Text color="tertiary">Resuming will update the list of recent blocks</Text>
						</Flex>
					</template>
					<template v-else #content> Can't resume yet, wait for a synced head </template>
				</Tooltip>

				<Tooltip position="end">
					<Button @click="autoSelect = !autoSelect" type="tertiary" size="mini">
						<Icon :name="!autoSelect ? 'unselect' : 'select'" size="14" :color="autoSelect ? 'primary' : 'light-orange'" />
					</Button>

					<template #content>
						<Flex direction="column" gap="6">
							<Flex align="center">
								<Text color="secondary">Auto-select new block is </Text>&nbsp;
								<Text :color="autoSelect ? 'green' : 'light-orange'">{{ autoSelect ? "On" : "Off" }}</Text>
							</Flex>

							<Text align="left" color="tertiary" height="140" style="max-width: 250px"
								>When enabled - the last received block will be selected automatically</Text
							>
						</Flex>
					</template>
				</Tooltip>

				<Tooltip position="end">
					<Button @click="handleToggleSidebar" type="tertiary" size="mini">
						<Icon name="sidebar" size="14" color="secondary" :class="[$style.sidebar_icon, showSidebar && $style.rotate]" />
					</Button>

					<template #content> {{ showSidebar ? "Hide" : "Show" }} sidebar </template>
				</Tooltip>
			</Flex>
		</Flex>

		<Flex gap="4" :class="$style.content">
			<Flex direction="column" gap="16" wide :class="$style.table">
				<Flex v-if="!isPaused" align="center" justify="center" gap="6" :class="$style.status">
					<Icon name="block" size="12" color="secondary" :class="$style.block_icon" />
					<Text size="12" weight="600" color="secondary">Receiving new blocks</Text>
				</Flex>
				<Flex v-else align="center" justify="center" gap="6" :class="$style.status">
					<Icon name="pause" size="12" color="secondary" />
					<Text size="12" weight="600" color="secondary">Receiving new blocks on pause</Text>
				</Flex>

				<div :class="$style.table_scroller">
					<table>
						<thead>
							<tr>
								<th><Text size="12" weight="600" color="tertiary">Block Number</Text></th>
								<th><Text size="12" weight="600" color="tertiary">Time</Text></th>
								<th><Text size="12" weight="600" color="tertiary">Txs</Text></th>
								<th><Text size="12" weight="600" color="tertiary">Gas Used</Text></th>
								<th><Text size="12" weight="600" color="tertiary">Size</Text></th>
							</tr>
						</thead>

						<tbody>
							<tr
								v-for="block in !isPaused ? blocks.slice(0, 15) : blocksSnapshot"
								@click="handleSelectBlock(block, true)"
								:class="preview.block.timestamp === block.timestamp && $style.active"
							>
								<td style="width: 1px">
									<NuxtLink :to="`/block/${block.number}`">
										<Outline>
											<Flex align="center" gap="6">
												<Icon name="block" size="14" color="primary" />
												<Text size="13" weight="600" color="primary" tabular>{{ comma(block.number) }}</Text>
											</Flex>
										</Outline>
									</NuxtLink>
								</td>
								<td>
									<Flex align="center">
										<Text size="12" weight="600" color="primary">
											{{ DateTime.fromISO(block.timestamp).toRelative({ locale: "en", style: "short" }) }}
										</Text>
									</Flex>
								</td>
								<td>
									<Flex align="center">
										<Text size="13" weight="600" color="primary">
											{{ block.transactionCount }}
										</Text>
									</Flex>
								</td>
								<td>
									<Flex align="center" gap="4">
										<Text size="13" weight="600" color="primary">
											{{ getGasUsagePercent(block.gasUsed, block.gasLimit).toFixed(1) }}%
										</Text>
										<Text size="12" weight="600" color="tertiary">
											({{ formatGasValue(block.gasUsed) }})
										</Text>
									</Flex>
								</td>
								<td>
									<Flex align="center">
										<Text size="13" weight="600" color="primary">
											{{ formatBytes(block.size, 0) }}
										</Text>
									</Flex>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<Button link="/blocks" type="secondary" size="small" :class="$style.buttons">
					<Icon name="table" size="12" color="secondary" />
					<Text size="12" weight="600" color="primary">View all blocks</Text>
				</Button>
			</Flex>

			<Flex v-if="showSidebar" direction="column" :class="[$style.preview]">
				<Flex wide direction="column" gap="12" :class="$style.top">
					<Flex align="center" justify="between" wide>
						<Flex align="center" gap="6">
							<Icon name="block" size="14" color="secondary" />

							<Flex align="center" gap="4">
								<Text size="12" weight="600" color="secondary"> Number </Text>
								<Text size="12" weight="600" color="primary">{{ comma(preview.block.number) }}</Text>
							</Flex>
						</Flex>

						<Text size="12" weight="600" color="tertiary">
							{{ DateTime.fromISO(preview.block.timestamp).setLocale("en").toFormat("ff") }}
						</Text>
					</Flex>

					<Flex align="center" justify="between" :class="$style.timing">
						<Text size="12" weight="600" color="secondary" :class="$style.fixed_width">
							{{ DateTime.fromISO(preview.block.timestamp).setLocale("en").toFormat("TT") }}
						</Text>

						<div v-for="dot in 5" class="dot" />

						<Flex align="center" gap="6" :class="$style.fixed_width">
							<Icon name="zap" size="12" color="secondary" />
							<Text size="12" weight="600" color="primary">
								{{ getGasUsagePercent(preview.block.gasUsed, preview.block.gasLimit).toFixed(1) }}%
							</Text>
						</Flex>

						<div v-for="dot in 5" class="dot" />

						<Text size="12" weight="600" color="secondary" align="right" :class="$style.fixed_width">
							{{ formatGasValue(preview.block.gasUsed) }}
						</Text>
					</Flex>
				</Flex>

				<Flex direction="column" gap="24" :class="$style.main">
					<Flex direction="column" gap="8" :class="$style.key_value">
						<Text size="12" weight="600" color="tertiary">Hash</Text>
						<BadgeValue :text="preview.block.hash" />
					</Flex>

					<Flex v-if="preview.block.parentHash" direction="column" gap="8" :class="$style.key_value">
						<Text size="12" weight="600" color="tertiary">Parent Hash</Text>
						<BadgeValue :text="preview.block.parentHash" />
					</Flex>

					<Flex direction="column" gap="12">
						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Transactions</Text>

							<Text v-if="preview.block.transactionCount > 5" size="12" weight="600" color="secondary">
								5 <Text color="tertiary">of {{ comma(preview.block.transactionCount) }}</Text>
							</Text>
							<Text v-else size="12" weight="600" color="secondary">
								{{ preview.block.transactionCount }}
							</Text>
						</Flex>

						<Text
							v-if="preview.isLoadingTransactions"
							size="12"
							weight="600"
							color="tertiary"
							align="center"
							:class="$style.empty_state"
						>
							Loading transactions..
						</Text>
						<Flex v-else-if="preview.block.transactionCount" direction="column" gap="8">
							<NuxtLink v-for="transaction in preview.transactions.slice(0, 5)" :to="`/tx/${transaction.hash}`">
								<Outline wide height="32" padding="8" radius="6">
									<Flex justify="between" align="center" wide>
										<Flex align="center" gap="8">
											<Icon
												:name="transaction.status === 'success' ? 'check-circle' : 'close-circle'"
												size="12"
												:color="transaction.status === 'success' ? 'green' : 'red'"
											/>

											<Text size="13" weight="600" color="primary" mono>{{ transaction.hash.slice(0, 6) }}</Text>

											<Flex align="center" gap="3">
												<div v-for="dot in 3" class="dot" />
											</Flex>

											<Text size="13" weight="600" color="primary" mono>
												{{ transaction.hash.slice(transaction.hash.length - 4, transaction.hash.length) }}
											</Text>
										</Flex>

										<Flex align="center" gap="6">
											<Text size="12" height="160" weight="600" color="tertiary" :class="$style.transaction_type">
												{{ transaction.isContractCreation ? "Create" : 
													transaction.isContractInteraction ? "Call" : "Transfer" }}
											</Text>
											<Text size="12" weight="600" color="primary">
												{{ formatGasValue(transaction.gasUsed) }}
											</Text>
										</Flex>
									</Flex>
								</Outline>
							</NuxtLink>

							<Flex v-if="preview.block.transactionCount > 5" align="center" gap="6">
								<Icon name="help" size="12" color="tertiary" />
								<Text size="12" weight="500" color="tertiary">{{ preview.block.transactionCount - 5 }} more.</Text>
								<Text size="12" weight="500" color="support"> View all transactions on the block page </Text>
							</Flex>
						</Flex>
						<Text v-else size="12" weight="600" color="tertiary" align="center" :class="$style.empty_state">
							No transactions
						</Text>
					</Flex>

					<Flex direction="column" gap="16">
						<Text size="12" weight="600" color="secondary">Details</Text>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Gas Used</Text>
							<Text size="12" weight="600" color="secondary">{{ formatGasValue(preview.block.gasUsed) }}</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Gas Limit</Text>
							<Text size="12" weight="600" color="secondary">{{ formatGasValue(preview.block.gasLimit) }}</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Base Fee</Text>
							<Text size="12" weight="600" color="secondary">{{ formatGasValue(preview.block.baseFeePerGas) }} wei</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="tertiary">Block Size</Text>
							<Text size="12" weight="600" color="secondary">{{ formatBytes(preview.block.size) }}</Text>
						</Flex>
					</Flex>
				</Flex>

				<Flex :class="$style.bottom">
					<Button :link="`/block/${preview.block.number}`" type="secondary" size="small" wide>
						<Icon name="block" size="12" color="secondary" />
						<Text size="12" weight="600" color="primary">View Block {{ comma(preview.block.number) }}</Text>
					</Button>
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

.status {
	background: linear-gradient(var(--op-8), var(--op-5));
	border-radius: 6px;

	overflow: hidden;
	padding: 8px;

	margin: 16px 16px 0 16px;
}

.block_icon {
	animation: blink 3s ease infinite;
}

@keyframes blink {
	0% {
		transform: translateY(-200%) scale(0.8);
		opacity: 0;
	}

	30% {
		transform: translateY(0) scale(1);
		opacity: 1;
	}

	60% {
		transform: translateY(0) scale(1);
		opacity: 1;
	}

	100% {
		transform: translateY(180%) scale(0.8);
		opacity: 0;
	}
}

.table {
	width: 100%;
	min-width: 0;

	border-radius: 4px 4px 4px 8px;
	background: var(--card-background);

	& table {
		width: 100%;
		height: fit-content;

		border-spacing: 0px;

		& tbody {
			& tr {
				cursor: pointer;
				opacity: 0.5;

				transition: all 0.07s ease;

				&.active {
					opacity: 1;

					background: var(--op-3);

					& td:last-child {
						border-right: 2px solid var(--op-30);
					}
				}

				&:hover {
					opacity: 1;

					background: var(--op-5);
				}
			}
		}

		& tr th {
			text-align: left;
			padding: 0;
			padding-bottom: 8px;
			padding-right: 24px;

			&:first-child {
				padding-left: 16px;
			}

			& span {
				display: flex;
			}
		}

		& tr td {
			padding: 0;
			padding-right: 16px;
			padding-top: 8px;
			padding-bottom: 8px;

			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;

			border-right: 2px solid transparent;

			&:first-child {
				padding-left: 16px;
			}
		}
	}
}

.preview {
	min-width: 384px;

	border-radius: 4px 4px 8px 4px;
	background: var(--card-background);

	.top {
		padding: 16px;
	}

	.timing {
		height: 28px;

		border-radius: 6px;
		background: linear-gradient(var(--op-8), var(--op-3));
		box-shadow: inset 0 0 0 1px var(--op-5);

		padding: 0 8px;

		.fixed_width {
			width: 60px;
		}
	}

	.main {
		max-height: 690px;
		overflow-y: auto;
		flex: 1;

		border-bottom: 1px solid var(--op-5);

		padding: 16px;
	}

	.bottom {
		padding: 16px;

		& a {
			width: 100%;
		}
	}
}

.buttons {
	margin: 0 16px 16px 16px;
}

.table_scroller {
	overflow-x: auto;
}

.key_value {
	max-width: 100%;
}

.empty_state {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 32px;

	border-radius: 6px;
	background: var(--op-5);

	padding: 0 8px;
}

.transaction_type {
	text-overflow: ellipsis;
	overflow: hidden;
	max-width: 60px;
}

.sidebar_icon {
	transform: rotate(180deg);

	&.rotate {
		transform: rotate(0deg);
	}
}

@media (max-width: 1024px) {
	.content {
		flex-direction: column-reverse;
	}

	.main {
		display: none;
	}

	.preview {
		border-radius: 4px;
	}

	.table {
		flex: 1;
		border-radius: 4px 4px 8px 8px;
	}

	.sidebar_icon {
		transform: rotate(90deg);

		&.rotate {
			transform: rotate(270deg);
		}
	}
}

@media (max-width: 500px) {
	.preview {
		min-width: initial;
	}
}
</style>
