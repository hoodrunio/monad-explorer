<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** Services */
import { shortHex } from "@/services/utils"

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

// Format event type for display
const formatEventType = (eventType) => {
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
					<th><Text size="12" weight="600" color="tertiary">Validator</Text></th>
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
				</tr>

				<!-- Empty state -->
				<tr v-else-if="events.length === 0">
					<td colspan="5" :class="$style.empty_cell">
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
						<Flex
							align="center"
							:class="[$style.event_badge, $style[`event_${event.event_type}`]]"
						>
							<Text size="11" weight="600">{{ formatEventType(event.event_type) }}</Text>
						</Flex>
					</td>
					<td>
						<Flex align="center" gap="4">
							<Text size="12" weight="600" color="primary">{{ formatMON(event.amount) }}</Text>
							<Text size="11" weight="500" color="tertiary">MON</Text>
						</Flex>
					</td>
					<td>
						<NuxtLink v-if="event.secp_pubkey" :to="`/validator/${event.secp_pubkey}`">
							<Flex align="center" gap="6" :class="$style.validator_link">
								<Icon name="validator" size="14" color="secondary" />
								<Text size="12" weight="600" color="primary">#{{ event.validator_id }}</Text>
							</Flex>
						</NuxtLink>
						<Flex v-else align="center" gap="6" :class="$style.validator_link">
							<Icon name="validator" size="14" color="secondary" />
							<Text size="12" weight="600" color="primary">#{{ event.validator_id }}</Text>
						</Flex>
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

.validator_link {
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

.event_badge {
	padding: 4px 10px;
	border-radius: 6px;
	text-transform: capitalize;
	width: fit-content;
}

.event_delegate {
	background: rgba(34, 197, 94, 0.15);
	border: 1px solid rgba(34, 197, 94, 0.3);

	& span {
		color: var(--green);
	}
}

.event_undelegate {
	background: rgba(249, 115, 22, 0.15);
	border: 1px solid rgba(249, 115, 22, 0.3);

	& span {
		color: var(--orange);
	}
}

.event_withdraw {
	background: rgba(234, 179, 8, 0.15);
	border: 1px solid rgba(234, 179, 8, 0.3);

	& span {
		color: var(--yellow);
	}
}

.event_claim {
	background: rgba(59, 130, 246, 0.15);
	border: 1px solid rgba(59, 130, 246, 0.3);

	& span {
		color: var(--blue);
	}
}
</style>
