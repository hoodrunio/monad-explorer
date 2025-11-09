<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"
import Button from "@/components/ui/Button.vue"

/** Services */
import { mon, splitAddress } from "@/services/utils"

/** API */
// Note: Events/logs are now accessed directly from transaction data
// No separate API calls needed for new Indexer API

/** Store */
import { useModalsStore } from "@/store/modals.store"
import { useCacheStore } from "@/store/cache.store"
const modalsStore = useModalsStore()
const cacheStore = useCacheStore()

const props = defineProps({
	block: {
		type: Object,
	},
	tx: {
		type: Object,
	},
})

const isLoading = ref(false)
const events = ref([])
const totalEventsCount = ref(0)
const expandedEventIndex = ref(null)

const EventIconMapping = {
	message: "message",
	coin_received: "coins_down",
	coin_spent: "coins_up",
	transfer: "arrow-circle-right-up",
	withdraw_rewards: "coins",
	withdraw_commission: "tag",
	tx: "zap",
	proposer_reward: "coins_down",
	commission: "coins_down",
	rewards: "coins_down",
	mint: "coins_down",
	burn: "burn",
	coinbase: "coins_down",
	unbond: "unlock",
	redelegate: "redelegate",
	complete_unbonding: "unlock",
	complete_redelegation: "redelegate",
	slash: "grid",
	cancel_unbonding_delegation: "unlock",
	liveness: "close-circle",
}

const getEvents = async () => {
	isLoading.value = true

	try {
		if (props.block) {
			// Logs are only available at transaction level
			// Block events feature is disabled for now
			events.value = []
			totalEventsCount.value = 0
		} else if (props.tx) {
			// For EVM transactions, use decodedLogs directly from tx data
			// instead of making additional API calls
			const startIndex = (page.value - 1) * 10
			const endIndex = startIndex + 10
			const decodedLogs = props.tx.decodedLogs || []
			events.value = decodedLogs.slice(startIndex, endIndex)
			totalEventsCount.value = decodedLogs.length
		}
	} catch (error) {
		events.value = []
	}

	isLoading.value = false
}

const handlingEventType = (type) => {
	switch (type) {
		case "cosmos.authz.v1beta1.EventGrant":
			return "grant"

		case "cosmos.authz.v1beta1.EventRevoke":
			return "revoke"

		default:
			return type
	}
}

const handlingEventActionType = (type) => {
	return type.split(".").slice(-1)[0].replace('"', "")
}

const handleViewRawEvent = (event) => {
	cacheStore.current._target = "event"
	cacheStore.current.event = event
	modalsStore.open("rawData")
}

const toggleEventExpanded = (index) => {
	if (expandedEventIndex.value === index) {
		expandedEventIndex.value = null
	} else {
		expandedEventIndex.value = index
	}
}

const copyToClipboard = async (text) => {
	try {
		await navigator.clipboard.writeText(text)
	} catch (err) {
		console.error('Failed to copy:', err)
	}
}

const formatValue = (value, type) => {
	if (!value) return 'null'

	// Handle hex strings
	if (typeof value === 'string' && value.startsWith('0x')) {
		return value
	}

	// Handle BigInt/large numbers
	if (type?.includes('uint') || type?.includes('int')) {
		return value
	}

	// Handle booleans
	if (typeof value === 'boolean' || value === 'true' || value === 'false') {
		return value.toString()
	}

	// Handle addresses
	if (typeof value === 'string' && value.length === 42 && value.startsWith('0x')) {
		return value
	}

	return value.toString()
}

const page = ref(1)
const pages = computed(() => {
	if (props.block) {
		// For EVM blocks, use totalCount from the API response or fallback to current events length
		const eventsCount = totalEventsCount.value || events.value.length || 0
		return Math.ceil(eventsCount / 10)
	} else if (props.tx) {
		// For EVM transactions, use decodedLogs length
		const eventsCount = props.tx.decodedLogs?.length || 0
		return Math.ceil(eventsCount / 10)
	}
	return 1
})
const handleNext = () => {
	if (page.value === pages.value) return
	page.value += 1
}
const handlePrev = () => {
	if (page.value === 1) return
	page.value -= 1
}

onMounted(() => {
	getEvents()
})

/** Refetch events */
watch(
	() => page.value,
	() => {
		getEvents()
		expandedEventIndex.value = null
	},
)
</script>

<template>
	<Flex direction="column" justify="between" :class="$style.data">
		<Flex direction="column" :class="[$style.inner, $style.events]">
			<Flex
				v-if="events.length"
				v-for="(event, idx) in events"
				direction="column"
				:class="$style.event_card"
			>
				<!-- Event Header -->
				<Flex
					@click="event.decoded ? toggleEventExpanded(idx) : handleViewRawEvent(event)"
					align="center"
					gap="12"
					:class="[$style.event_header, expandedEventIndex === idx && $style.expanded]"
				>
					<Flex align="center" gap="12" :class="$style.event_header_left">
						<Flex :class="$style.icon_wrapper">
							<Icon :name="event.topics ? 'zap' : (EventIconMapping[event.type] ? EventIconMapping[event.type] : 'zap')" size="14" :color="event.decoded ? 'brand' : 'tertiary'" />
						</Flex>

						<Flex direction="column" gap="4" :class="$style.event_info">
							<!-- Event Name -->
							<Flex align="center" gap="8">
								<Text size="13" weight="600" color="primary" mono>
									{{ event.eventName || (event.eventSignature ? event.eventSignature.split('(')[0] : 'Unknown Event') }}
								</Text>
								<Flex v-if="event.eventSignature" :class="$style.signature_badge">
									<Text size="11" weight="500" color="tertiary" mono>
										{{ event.eventSignature }}
									</Text>
								</Flex>
							</Flex>

							<!-- Contract Info -->
							<Flex align="center" gap="6">
								<Text size="11" weight="500" color="secondary">Contract</Text>
								<Tooltip :class="$style.tooltip">
									<NuxtLink :to="`/address/${event.address}`" @click.stop>
										<Text size="11" weight="500" color="primary" mono>
											{{ splitAddress(event.address) }}
										</Text>
									</NuxtLink>
									<template #content>
										{{ event.address }}
									</template>
								</Tooltip>

								<Text size="11" weight="500" color="tertiary">•</Text>
								<Text size="11" weight="500" color="secondary">Log Index</Text>
								<Text size="11" weight="500" color="primary" mono>#{{ event.logIndex }}</Text>
							</Flex>
						</Flex>
					</Flex>

					<!-- Right side actions -->
					<Flex align="center" gap="8">
						<Tooltip v-if="event.decoded && event.decoded.parameters">
							<Flex :class="$style.param_count">
								<Text size="11" weight="600" color="secondary">
									{{ event.decoded.parameters.length }} params
								</Text>
							</Flex>
							<template #content>
								{{ event.decoded.parameters.length }} decoded parameters
							</template>
						</Tooltip>

						<Icon
							v-if="event.decoded"
							name="chevron"
							size="16"
							color="secondary"
							:class="[expandedEventIndex === idx && $style.chevron_rotated]"
						/>
					</Flex>
				</Flex>

				<!-- Expanded Content -->
				<Flex
					v-if="expandedEventIndex === idx && event.decoded && event.decoded.parameters"
					direction="column"
					:class="$style.event_expanded"
				>
					<!-- Parameters Table -->
					<Flex direction="column" gap="8" :class="$style.params_section">
						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="primary">Decoded Parameters</Text>
							<Button
								@click.stop="copyToClipboard(JSON.stringify(event.decoded.parameters, null, 2))"
								type="secondary"
								size="mini"
							>
								<Icon name="copy" size="12" color="secondary" />
								<Text size="11" weight="500" color="secondary">Copy All</Text>
							</Button>
						</Flex>

						<!-- Parameters Table -->
						<Flex direction="column" :class="$style.params_table">
							<!-- Table Header -->
							<Flex :class="$style.table_header">
								<Flex :class="$style.table_cell_name">
									<Text size="11" weight="600" color="tertiary">Name</Text>
								</Flex>
								<Flex :class="$style.table_cell_type">
									<Text size="11" weight="600" color="tertiary">Type</Text>
								</Flex>
								<Flex :class="$style.table_cell_indexed">
									<Text size="11" weight="600" color="tertiary">Indexed</Text>
								</Flex>
								<Flex :class="$style.table_cell_value">
									<Text size="11" weight="600" color="tertiary">Value</Text>
								</Flex>
								<Flex :class="$style.table_cell_action"></Flex>
							</Flex>

							<!-- Table Rows -->
							<Flex
								v-for="(param, paramIdx) in event.decoded.parameters"
								:key="paramIdx"
								:class="$style.table_row"
							>
								<Flex align="center" :class="$style.table_cell_name">
									<Text size="12" weight="500" color="primary" mono>
										{{ param.name || `param${paramIdx}` }}
									</Text>
								</Flex>
								<Flex align="center" :class="$style.table_cell_type">
									<Flex :class="$style.type_badge">
										<Text size="11" weight="500" color="secondary" mono>
											{{ param.type }}
										</Text>
									</Flex>
								</Flex>
								<Flex align="center" justify="center" :class="$style.table_cell_indexed">
									<Flex v-if="param.indexed" :class="$style.indexed_badge">
										<Text size="10" weight="600" color="brand">✓</Text>
									</Flex>
									<Text v-else size="11" weight="500" color="tertiary">-</Text>
								</Flex>
								<Flex align="center" :class="$style.table_cell_value">
									<!-- Address values with link -->
									<Tooltip v-if="param.type === 'address'" :class="$style.tooltip">
										<NuxtLink :to="`/address/${param.value}`" @click.stop>
											<Text size="11" weight="500" color="brand" mono>
												{{ splitAddress(param.value) }}
											</Text>
										</NuxtLink>
										<template #content>
											{{ param.value }}
										</template>
									</Tooltip>
									<!-- Other values -->
									<Text v-else size="11" weight="500" color="primary" mono :class="$style.value_text">
										{{ formatValue(param.value, param.type) }}
									</Text>
								</Flex>
								<Flex align="center" justify="center" :class="$style.table_cell_action">
									<Button
										@click.stop="copyToClipboard(param.value.toString())"
										type="ghost"
										size="mini"
										:class="$style.copy_btn"
									>
										<Icon name="copy" size="12" color="tertiary" />
									</Button>
								</Flex>
							</Flex>
						</Flex>
					</Flex>

					<!-- Raw Data Section -->
					<Flex direction="column" gap="8" :class="$style.raw_section">
						<Flex align="center" justify="between">
							<Text size="12" weight="600" color="primary">Raw Event Data</Text>
							<Flex align="center" gap="6">
								<Button
									@click.stop="copyToClipboard(JSON.stringify(event.topics))"
									type="secondary"
									size="mini"
								>
									<Icon name="copy" size="12" color="secondary" />
									<Text size="11" weight="500" color="secondary">Copy Topics</Text>
								</Button>
								<Button
									@click.stop="copyToClipboard(event.data)"
									type="secondary"
									size="mini"
								>
									<Icon name="copy" size="12" color="secondary" />
									<Text size="11" weight="500" color="secondary">Copy Data</Text>
								</Button>
								<Button
									@click.stop="handleViewRawEvent(event)"
									type="secondary"
									size="mini"
								>
									<Icon name="explorable" size="12" color="secondary" />
									<Text size="11" weight="500" color="secondary">View JSON</Text>
								</Button>
							</Flex>
						</Flex>

						<!-- Topics -->
						<Flex direction="column" gap="4">
							<Text size="11" weight="600" color="secondary">Topics ({{ event.topics?.length || 0 }})</Text>
							<Flex direction="column" gap="2" :class="$style.topics_list">
								<Flex
									v-for="(topic, topicIdx) in event.topics"
									:key="topicIdx"
									align="center"
									gap="8"
									:class="$style.topic_item"
								>
									<Text size="10" weight="600" color="tertiary" :class="$style.topic_index">{{ topicIdx }}</Text>
									<Text size="11" weight="500" color="primary" mono :class="$style.topic_value">{{ topic }}</Text>
								</Flex>
							</Flex>
						</Flex>

						<!-- Data -->
						<Flex direction="column" gap="4">
							<Text size="11" weight="600" color="secondary">Data</Text>
							<Flex :class="$style.data_hex">
								<Text size="11" weight="500" color="primary" mono>{{ event.data || '0x' }}</Text>
							</Flex>
						</Flex>
					</Flex>
				</Flex>

				<!-- For non-EVM events, keep original display -->
				<Flex
					v-if="!event.topics && event.type"
					@click="handleViewRawEvent(event)"
					align="center"
					gap="12"
					:class="$style.legacy_event"
				>
					<Flex
						direction="column"
						align="center"
						gap="6"
						:class="[$style.left, idx === 0 && $style.first, idx === events.length - 1 && $style.last]"
					>
						<div />
						<Icon :name="EventIconMapping[event.type] ? EventIconMapping[event.type] : 'zap'" size="12" color="tertiary" />
						<div />
					</Flex>

					<Flex wide justify="between" align="center" gap="6" :class="$style.right">
						<!-- Event: coin_spent -->
						<Flex v-if="event.type === 'coin_spent'" align="center" gap="4" color="secondary" :class="$style.text">
							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.spender}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.spender) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.spender }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">spent</Text>

							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ mon(event.data.amount.replace("wei", "")) }} MON</Text
							>
						</Flex>
						<!-- Event: coin_received -->
						<Flex v-else-if="event.type === 'coin_received'" align="center" gap="4" color="secondary" :class="$style.text">
							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.receiver}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.receiver) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.receiver }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">received</Text>

							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ mon(event.data.amount.replace("wei", "")) }} MON
							</Text>
						</Flex>
						<!-- Event: delegate -->
						<Flex v-else-if="event.type === 'delegate'" align="center" gap="4" color="secondary" :class="$style.text">
							<Text size="12" weight="500" color="secondary">Validator</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.validator }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">for</Text>

							<Text size="12" weight="500" color="primary" mono>
								{{ event.data.amount }}
							</Text>
						</Flex>
						<!-- Event: transfer -->
						<Flex v-else-if="event.type === 'transfer'" align="center" gap="4" color="secondary" :class="$style.text">
							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.sender}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.sender) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.sender }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">sent</Text>

							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ mon(event.data.amount.replace("wei", "")) }} MON</Text
							>

							<Text size="12" weight="500" color="secondary">to</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.recipient}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.recipient) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.recipient }}
								</template>
							</Tooltip>
						</Flex>
						<!-- Event: tx -->
						<Flex v-else-if="event.type === 'tx'" align="center" gap="4" color="secondary" :class="$style.text">
							<!-- Signature -->
							<template v-if="event.data.signature">
								<Text size="12" weight="500" color="secondary">Signature</Text>

								<Tooltip :class="$style.tooltip">
									<Text size="12" weight="500" color="primary" mono>
										{{ event.data.signature.slice(event.data.signature.length - 4, event.data.signature.length) }}
									</Text>

									<template #content>
										{{ event.data.signature }}
									</template>
								</Tooltip>
							</template>
							<!-- acc_seq -->
							<template v-if="event.data.acc_seq">
								<Text size="12" weight="500" color="secondary">Acc</Text>

								<Tooltip :class="$style.tooltip">
									<NuxtLink :to="`/address/${event.data.acc_seq.split('/')[0]}`" @click.stop>
										<Text size="12" weight="500" color="primary" mono>
											{{ splitAddress(event.data.acc_seq.split("/")[0]) }}
										</Text>
									</NuxtLink>

									<template #content>
										{{ event.data.acc_seq.split("/")[0] }}
									</template>
								</Tooltip>

								<template v-if="event.data.acc_seq.split('/')[1]">
									<Text size="12" weight="500" color="secondary">Seq</Text>

									<Text size="12" weight="500" color="primary" mono>
										{{ event.data.acc_seq.split("/")[1] }}
									</Text>
								</template>
							</template>
							<!-- fee -->
							<template v-if="event.data.fee">
								<Tooltip :class="$style.tooltip">
									<NuxtLink :to="`/address/${event.data.fee_payer}`" @click.stop>
										<Text size="12" weight="500" color="primary" mono>
											{{ splitAddress(event.data.fee_payer) }}
										</Text>
									</NuxtLink>

									<template #content>
										{{ event.data.fee_payer }}
									</template>
								</Tooltip>

								<Text size="12" weight="500" color="secondary">paid</Text>

								<Text size="12" weight="500" color="primary" mono no-wrap>
									{{ mon(event.data.fee.replace("wei", "")) }} MON</Text
								>

								<Text size="12" weight="500" color="secondary">fee</Text>
							</template>
						</Flex>
						<!-- Event: message -->
						<Flex v-else-if="event.type === 'message'" align="center" gap="4" color="secondary" :class="$style.text">
							<!-- action -->
							<template v-if="event.data.action">
								<Text size="12" weight="500" color="secondary" no-wrap>Call action</Text>

								<Text size="12" weight="500" color="primary" mono>
									{{ handlingEventActionType(event.data.action) }}
								</Text>
							</template>
							<!-- sender -->
							<template v-else-if="event.data.sender">
								<Text size="12" weight="500" color="secondary">Sender</Text>

								<Tooltip :class="$style.tooltip">
									<NuxtLink :to="`/address/${event.data.sender}`" @click.stop>
										<Text size="12" weight="500" color="primary" mono>
											{{ splitAddress(event.data.sender) }}
										</Text>
									</NuxtLink>

									<template #content>
										{{ event.data.sender }}
									</template>
								</Tooltip>
							</template>
							<!-- sender -->
							<template v-else-if="event.data.module">
								<Text size="12" weight="500" color="secondary">Module</Text>

								<Text size="12" weight="500" color="primary" mono>
									{{ event.data.module }}
								</Text>
							</template>
						</Flex>
						<!-- Event: withdraw_rewards -->
						<Flex v-else-if="event.type === 'withdraw_rewards'" align="center" gap="4" color="secondary" :class="$style.text">
							<Text size="12" weight="500" color="secondary">Withdrawal</Text>

							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ mon(event.data.amount.replace("wei", "")) }} MON</Text
							>

							<Text size="12" weight="500" color="secondary">from</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.validator }}
								</template>
							</Tooltip>
						</Flex>
						<!-- Event: withdraw_commission -->
						<Flex v-else-if="event.type === 'withdraw_commission'" align="center" gap="4" color="secondary" :class="$style.text">
							<Text size="12" weight="500" color="secondary">Commission</Text>

							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ mon(event.data.amount.replace("wei", "")) }} MON
							</Text>
						</Flex>
						<!-- Event: proposer_reward -->
						<Flex v-else-if="event.type === 'proposer_reward'" align="center" gap="4" color="secondary" :class="$style.text">
							<Text size="12" weight="500" color="secondary">Proposer</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.validator }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">received rewards</Text>

							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ event.data.amount ? mon(event.data.amount.replace("wei", "")) : 0 }} MON
							</Text>
						</Flex>
						<!-- Event: rewards -->
						<Flex v-else-if="event.type === 'rewards'" align="center" gap="4" color="secondary" :class="$style.text">
							<Text size="12" weight="500" color="secondary">Validator</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.validator }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">received rewards</Text>

							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ event.data.amount ? mon(event.data.amount.replace("wei", "")) : 0 }} MON
							</Text>
						</Flex>
						<!-- Event: commission -->
						<Flex v-else-if="event.type === 'commission'" align="center" gap="4" color="secondary" :class="$style.text">
							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.validator }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">received commission of</Text>

							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ event.data.amount ? mon(event.data.amount.replace("wei", "")) : 0 }} MON
							</Text>
						</Flex>
						<!-- Event: coinbase -->
						<Flex v-else-if="event.type === 'coinbase'" align="center" gap="4" color="secondary" :class="$style.text">
							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.minter}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.minter) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.minter }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">received</Text>

							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ event.data.amount ? mon(event.data.amount.replace("wei", "")) : 0 }} MON
							</Text>
						</Flex>
						<!-- Event: mint -->
						<Flex v-else-if="event.type === 'mint'" align="center" gap="4" color="secondary" :class="$style.text">
							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ event.data.amount ? mon(event.data.amount.replace("wei", "")) : 0 }} MON</Text
							>

							<Text size="12" weight="500" color="secondary">was minted</Text>
						</Flex>
						<!-- Event: burn -->
						<Flex v-else-if="event.type === 'burn'" align="center" gap="4" color="secondary" :class="$style.text">
							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ event.data.amount ? mon(event.data.amount.replace("wei", "")) : 0 }} MON</Text
							>

							<Text size="12" weight="500" color="secondary">was burned</Text>
						</Flex>
						<!-- Event: unbond -->
						<Flex v-else-if="event.type === 'unbond'" align="center" gap="4" color="secondary" :class="$style.text">
							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ event.data.amount ? mon(event.data.amount.replace("wei", "")) : 0 }} MON</Text
							>

							<Text size="12" weight="500" color="secondary">will unbond from</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.validator }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">at</Text>

							<Tooltip :class="$style.tooltip">
								<Text size="12" weight="500" color="primary" mono>
									{{ DateTime.fromISO(event.data.completion_time).setLocale("en").toFormat("MMMM d h:mm a") }}
								</Text>

								<template #content>
									{{ DateTime.fromISO(event.data.completion_time).setLocale("en").toFormat("ff") }}
								</template>
							</Tooltip>
						</Flex>
						<!-- Event: redelegate -->
						<Flex v-else-if="event.type === 'redelegate'" align="center" gap="4" color="secondary" :class="$style.text">
							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ event.data.amount ? mon(event.data.amount.replace("wei", "")) : 0 }} MON</Text
							>

							<Text size="12" weight="500" color="secondary">will redelegate from</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.source_validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.source_validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.source_validator }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">to</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.destination_validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.destination_validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.destination_validator }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">at</Text>

							<Tooltip :class="$style.tooltip">
								<Text size="12" weight="500" color="primary" mono>
									{{ DateTime.fromISO(event.data.completion_time).setLocale("en").toFormat("MMMM d h:mm a") }}
								</Text>

								<template #content>
									{{ DateTime.fromISO(event.data.completion_time).setLocale("en").toFormat("ff") }}
								</template>
							</Tooltip>
						</Flex>
						<!-- Event: complete_unbonding -->
						<Flex v-else-if="event.type === 'complete_unbonding'" align="center" gap="4" color="secondary" :class="$style.text">
							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ event.data.amount ? mon(event.data.amount.replace("wei", "")) : 0 }} MON</Text
							>

							<Text size="12" weight="500" color="secondary">was unbonded from</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.validator }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">to</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.delegator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.delegator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.delegator }}
								</template>
							</Tooltip>
						</Flex>
						<!-- Event: complete_redelegation -->
						<Flex v-else-if="event.type === 'complete_redelegation'" align="center" gap="4" color="secondary" :class="$style.text">
							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ event.data.amount ? mon(event.data.amount.replace("wei", "")) : 0 }} MON</Text
							>

							<Text size="12" weight="500" color="secondary">was redelegated from</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.source_validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.source_validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.source_validator }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">to</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.destination_validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.destination_validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.destination_validator }}
								</template>
							</Tooltip>
						</Flex>
						<!-- Event: slash -->
						<Flex v-else-if="event.type === 'slash'" align="center" gap="4" color="secondary" :class="$style.text">
							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.jailed}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.jailed) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.jailed }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">was jailed for</Text>

							<Tooltip :class="$style.tooltip">
								<Text size="12" weight="500" color="primary" mono>
									{{ event.data.reason }}
								</Text>

								<template #content>
									{{ event.data.reason }}
								</template>
							</Tooltip>
						</Flex>
						<!-- Event: cancel_unbonding_delegation -->
						<Flex
							v-else-if="event.type === 'cancel_unbonding_delegation'"
							align="center"
							gap="4"
							color="secondary"
							:class="$style.text"
						>
							<Text size="12" weight="500" color="secondary">Unbonding</Text>

							<Text size="12" weight="500" color="primary" mono no-wrap>
								{{ event.data.amount ? mon(event.data.amount.replace("wei", "")) : 0 }} MON</Text
							>

							<Text size="12" weight="500" color="secondary">from</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.validator}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.validator) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.validator }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">was canceled</Text>
						</Flex>
						<!-- Event: cosmos.authz.v1beta1.EventGrant -->
						<Flex
							v-else-if="event.type === 'cosmos.authz.v1beta1.EventGrant'"
							align="center"
							gap="4"
							color="secondary"
							:class="$style.text"
						>
							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.granter.hash}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.granter.hash.replace(/"/g, "")) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.granter.hash.replace(/"/g, "") }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">gives authority on</Text>

							<Text size="12" weight="500" color="primary" mono>
								{{ handlingEventActionType(event.data.msg_type_url) }}
							</Text>

							<Text size="12" weight="500" color="secondary">for</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.grantee.hash}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.grantee.hash.replace(/"/g, "")) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.grantee.hash.replace(/"/g, "") }}
								</template>
							</Tooltip>
						</Flex>
						<!-- Event: cosmos.authz.v1beta1.EventRevoke -->
						<Flex
							v-else-if="event.type === 'cosmos.authz.v1beta1.EventRevoke'"
							align="center"
							gap="4"
							color="secondary"
							:class="$style.text"
						>
							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.granter.hash}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.granter.replace(/"/g, "")) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.granter.hash.replace(/"/g, "") }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">revoked grant on</Text>

							<Text size="12" weight="500" color="primary" mono>
								{{ handlingEventActionType(event.data.msg_type_url) }}
							</Text>

							<Text size="12" weight="500" color="secondary">from</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.grantee.hash}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.grantee.hash.replace(/"/g, "")) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.grantee.hash.replace(/"/g, "") }}
								</template>
							</Tooltip>
						</Flex>
						<!-- Event: set_feegrant -->
						<Flex v-else-if="event.type === 'set_feegrant'" align="center" gap="4" color="secondary" :class="$style.text">
							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.granter.hash}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.granter.hash) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.granter.hash }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">grants fee allowances to</Text>

							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.grantee.hash}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.grantee.hash) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.grantee.hash }}
								</template>
							</Tooltip>
						</Flex>
						<!-- Event: liveness -->
						<Flex v-else-if="event.type === 'liveness'" align="center" gap="4" color="secondary" :class="$style.text">
							<Tooltip :class="$style.tooltip">
								<NuxtLink :to="`/address/${event.data.address}`" @click.stop>
									<Text size="12" weight="500" color="primary" mono>
										{{ splitAddress(event.data.address) }}
									</Text>
								</NuxtLink>

								<template #content>
									{{ event.data.address }}
								</template>
							</Tooltip>

							<Text size="12" weight="500" color="secondary">missed</Text>

							<Text size="12" weight="500" color="primary" mono no-wrap> {{ event.data.missed_blocks }}</Text>

							<Text size="12" weight="500" color="secondary">blocks</Text>
						</Flex>

						<Text size="12" weight="600" color="tertiary" mono>
							{{ event.type ? handlingEventType(event.type) : (event.address ? `Log #${event.logIndex}` : 'Unknown') }}
						</Text>
					</Flex>
				</Flex>
			</Flex>

			<Flex v-else direction="column" align="center" justify="center" gap="8" :class="$style.empty">
				<Icon name="zap" size="24" color="tertiary" />
				<Text size="12" weight="500" height="160" color="tertiary" align="center" style="max-width: 220px">
					No events found for this transaction.
				</Text>
			</Flex>
		</Flex>
		<!-- Pagination -->
		<Flex v-if="events.length && pages > 1" align="center" gap="6" :class="$style.pagination">
			<Button @click="page = 1" type="secondary" size="mini" :disabled="page === 1">
				<Icon name="arrow-left-stop" size="12" color="primary" />
			</Button>
			<Button type="secondary" @click="handlePrev" size="mini" :disabled="page === 1">
				<Icon name="arrow-left" size="12" color="primary" />
			</Button>

			<Button type="secondary" size="mini" disabled>
				<Text size="12" weight="600" color="primary"> {{ page }} of {{ pages }} </Text>
			</Button>

			<Button @click="handleNext" type="secondary" size="mini" :disabled="page === pages">
				<Icon name="arrow-right" size="12" color="primary" />
			</Button>
			<Button @click="page = pages" type="secondary" size="mini" :disabled="page === pages">
				<Icon name="arrow-right-stop" size="12" color="primary" />
			</Button>
		</Flex>
	</Flex>
</template>

<style module>
.data {
	min-width: 100%;
	height: 100%;

	overflow-x: auto;

	background: var(--card-background);
}

.pagination {
	padding: 0 16px 16px 16px;
}

.inner {
	height: 100%;

	border-radius: 4px 4px 8px 4px;
	background: var(--card-background);
}

.events {
	padding: 16px;
	gap: 8px;
}

/* New Card-based Event Styles */
.event_card {
	border-radius: 6px;
	border: 1px solid var(--op-5);
	background: var(--card-background);
	overflow: hidden;
	transition: all 0.2s ease;

	&:hover {
		border-color: var(--op-8);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
}

.event_header {
	padding: 12px 16px;
	cursor: pointer;
	transition: background 0.2s ease;
	min-height: 60px;

	&:hover {
		background: var(--op-5);
	}

	&.expanded {
		background: var(--op-5);
		border-bottom: 1px solid var(--op-8);
	}
}

.event_header_left {
	flex: 1;
	min-width: 0;
}

.icon_wrapper {
	width: 32px;
	height: 32px;
	border-radius: 6px;
	background: var(--op-8);
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.event_info {
	flex: 1;
	min-width: 0;
}

.signature_badge {
	padding: 2px 8px;
	border-radius: 4px;
	background: var(--op-8);
	max-width: 400px;
	overflow: hidden;

	& > * {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.param_count {
	padding: 4px 8px;
	border-radius: 4px;
	background: var(--op-8);
}

.event_expanded {
	padding: 16px;
	background: var(--op-5);
	border-top: 1px solid var(--op-8);
	gap: 16px;
}

/* Parameters Section */
.params_section {
	padding: 12px;
	border-radius: 6px;
	background: var(--card-background);
	border: 1px solid var(--op-8);
}

.params_table {
	border-radius: 4px;
	border: 1px solid var(--op-8);
	overflow: hidden;
}

.table_header {
	background: var(--op-8);
	padding: 8px 12px;
	border-bottom: 1px solid var(--op-10);
}

.table_row {
	padding: 10px 12px;
	border-bottom: 1px solid var(--op-5);
	transition: background 0.15s ease;

	&:last-child {
		border-bottom: none;
	}

	&:hover {
		background: var(--op-5);
	}
}

.table_cell_name {
	flex: 0 0 120px;
	min-width: 0;
}

.table_cell_type {
	flex: 0 0 100px;
	min-width: 0;
}

.table_cell_indexed {
	flex: 0 0 70px;
	min-width: 0;
}

.table_cell_value {
	flex: 1;
	min-width: 0;
}

.table_cell_action {
	flex: 0 0 40px;
	min-width: 0;
}

.type_badge {
	padding: 2px 6px;
	border-radius: 3px;
	background: var(--op-8);
}

.indexed_badge {
	width: 16px;
	height: 16px;
	border-radius: 3px;
	background: rgba(24, 210, 165, 0.15);
	align-items: center;
	justify-content: center;
}

.value_text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}

.copy_btn {
	opacity: 0;
	transition: opacity 0.15s ease;
}

.table_row:hover .copy_btn {
	opacity: 1;
}

/* Raw Data Section */
.raw_section {
	padding: 12px;
	border-radius: 6px;
	background: var(--card-background);
	border: 1px solid var(--op-8);
}

.topics_list {
	max-height: 200px;
	overflow-y: auto;
}

.topic_item {
	padding: 6px 8px;
	border-radius: 4px;
	background: var(--op-5);
}

.topic_index {
	flex: 0 0 20px;
	padding: 2px 6px;
	border-radius: 3px;
	background: var(--op-10);
	text-align: center;
}

.topic_value {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.data_hex {
	padding: 8px 12px;
	border-radius: 4px;
	background: var(--op-5);
	overflow-x: auto;

	& > * {
		word-break: break-all;
	}
}

/* Legacy event styles (for non-EVM events) */
.legacy_event {
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

.empty {
	flex: 1;
	padding: 32px 0;
}

.tooltip {
	display: inline-block;
}

.chevron_rotated {
	transform: rotate(180deg);
	transition: transform 0.2s ease;
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

	.signature_badge {
		max-width: 200px;
	}

	.table_cell_name {
		flex: 0 0 80px;
	}

	.table_cell_type {
		flex: 0 0 80px;
	}
}

@media (max-width: 500px) {
	.data {
		.main {
			min-width: initial;
		}
	}

	.event_header {
		padding: 10px 12px;
	}

	.event_expanded {
		padding: 12px;
	}

	.params_table {
		font-size: 10px;
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
