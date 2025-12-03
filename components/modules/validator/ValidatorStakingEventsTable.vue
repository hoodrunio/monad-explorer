<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** Services */
import { shortHex } from "@/services/utils"

/** UI */
import Badge from "@/components/ui/Badge.vue"

const props = defineProps({
	events: {
		type: Array,
		required: true,
	},
	isLoading: {
		type: Boolean,
		default: false,
	},
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

// Get event type badge color
const getEventTypeColor = (eventType) => {
	switch (eventType) {
		case "delegate":
			return "green"
		case "claim":
			return "blue"
		case "undelegate":
			return "orange"
		case "validator_rewarded":
			return "yellow"
		default:
			return "secondary"
	}
}

// Format event type for display
const formatEventType = (eventType) => {
	if (eventType === "validator_rewarded") return "rewarded"
	return eventType?.replace(/_/g, " ") || "Unknown"
}
</script>

<template>
	<div :class="$style.wrapper">
		<table :class="$style.table">
			<thead>
				<tr>
					<th><Text size="12" weight="600" color="tertiary">Time</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Type</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Amount</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Epoch</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Delegator</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Transaction</Text></th>
				</tr>
			</thead>

			<tbody>
				<!-- Loading state -->
				<tr v-if="isLoading" v-for="i in 5" :key="i">
					<td><Skeleton w="100" h="14" /></td>
					<td><Skeleton w="60" h="20" /></td>
					<td><Skeleton w="80" h="14" /></td>
					<td><Skeleton w="40" h="14" /></td>
					<td><Skeleton w="100" h="14" /></td>
					<td><Skeleton w="100" h="14" /></td>
				</tr>

				<!-- Empty state -->
				<tr v-else-if="events.length === 0">
					<td colspan="6" :class="$style.empty_cell">
						<Flex align="center" justify="center" gap="8" :class="$style.empty">
							<Icon name="coins" size="16" color="tertiary" />
							<Text size="13" weight="500" color="tertiary">No staking events found</Text>
						</Flex>
					</td>
				</tr>

				<!-- Events -->
				<tr v-else v-for="event in events" :key="`${event.transaction_hash}-${event.log_index}`" :class="$style.row">
					<td>
						<NuxtLink :to="`/tx/${event.transaction_hash}`">
							<Flex direction="column" gap="4">
								<ClientOnlyTime fallback-text="..." fallback-size="12" fallback-color="primary">
									<Text size="12" weight="600" color="primary">
										{{ DateTime.fromISO(event.timestamp).toRelative({ locale: "en", style: "short" }).replace(' ago', '') }}
									</Text>
								</ClientOnlyTime>
								<Text size="11" weight="500" color="tertiary">
									{{ DateTime.fromISO(event.timestamp).setLocale("en").toFormat("LLL d, t") }}
								</Text>
							</Flex>
						</NuxtLink>
					</td>
					<td>
						<Badge :color="getEventTypeColor(event.event_type)">
							{{ formatEventType(event.event_type) }}
						</Badge>
					</td>
					<td>
						<Flex align="center" gap="4">
							<Text size="12" weight="600" color="primary">{{ formatMON(event.amount) }}</Text>
							<Text size="11" weight="500" color="tertiary">MON</Text>
						</Flex>
					</td>
					<td>
						<Text v-if="event.epoch" size="12" weight="600" color="secondary">{{ event.epoch }}</Text>
						<Text v-else size="12" weight="500" color="tertiary">-</Text>
					</td>
					<td>
						<NuxtLink v-if="event.delegator?.hash" :to="`/address/${event.delegator.hash}`">
							<Flex align="center" gap="6" :class="$style.address_link">
								<Icon name="address" size="12" color="secondary" />
								<Text size="12" weight="600" color="primary" mono>
									{{ shortHex(event.delegator.hash) }}
								</Text>
							</Flex>
						</NuxtLink>
						<Text v-else size="12" weight="500" color="tertiary">-</Text>
					</td>
					<td>
						<NuxtLink :to="`/tx/${event.transaction_hash}`">
							<Flex align="center" gap="8">
								<Text size="12" weight="600" color="primary" mono>
									{{ shortHex(event.transaction_hash) }}
								</Text>
								<CopyButton :text="event.transaction_hash" />
							</Flex>
						</NuxtLink>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style module>
.wrapper {
	min-width: 100%;
	width: 0;
	height: 100%;
	overflow-x: auto;
}

.table {
	width: 100%;
	height: fit-content;
	border-spacing: 0px;

	& tbody {
		& tr {
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover {
				background: var(--op-5);
				transform: translateX(4px);
			}

			&:active {
				background: var(--op-8);
			}
		}
	}

	& tr th {
		text-align: left;
		padding: 0;
		padding-right: 16px;
		padding-top: 16px;
		padding-bottom: 8px;

		&:first-child {
			padding-left: 16px;
		}

		& span {
			display: flex;
		}
	}

	& tr td {
		padding: 0;
		padding-right: 24px;
		padding-top: 8px;
		padding-bottom: 8px;
		white-space: nowrap;

		&:first-child {
			padding-left: 16px;
		}
	}
}

.row {
	border-bottom: 1px solid var(--op-5);
}

.address_link {
	padding: 4px 8px;
	border-radius: 6px;
	background: var(--op-5);
	width: fit-content;

	&:hover {
		background: var(--op-10);
	}
}

.empty_cell {
	padding: 40px 16px !important;
}

.empty {
	padding: 20px;
}
</style>
