<script setup>
/** Vendor */
import { DateTime } from "luxon"

/** Services */
import { comma, space, shortHex } from "@/services/utils"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"
import MethodChip from "@/components/ui/MethodChip.vue"

/** Shared Components */
import MessageTypeBadge from "@/components/shared/MessageTypeBadge.vue"

/** Composables */
import { useMonUsdConverter } from "@/composables/useMonUsdConverter"

const { convertToUsd } = useMonUsdConverter()

const router = useRouter()

const emit = defineEmits(["onSort"])
const props = defineProps({
	transactions: {
		type: Array,
		required: true,
	},
	sort: {
		type: Object,
	},
})
</script>

<template>
	<div :class="$style.wrapper_transactions">
		<table :class="$style.table">
			<thead>
				<tr>
					<th><Text size="12" weight="600" color="tertiary">Hash</Text></th>
					<th @click="$emit('onSort', 'time')" :class="$style.sortable">
						<Flex align="center" gap="6">
							<Text size="12" weight="600" color="tertiary" noWrap style="text-transform: capitalize"> Time </Text>
							<Icon
								name="chevron"
								size="12"
								color="secondary"
								:style="{ transform: `rotate(${sort.dir === 'asc' ? '180' : '0'}deg)` }"
							/>
						</Flex>
					</th>
					<th><Text size="12" weight="600" color="tertiary">Messages</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Block</Text></th>
				</tr>
			</thead>

			<tbody>
				<tr v-for="tx in transactions" :class="$style.row">
					<td style="width: 1px">
						<NuxtLink :to="`/tx/${tx.hash}`">
							<Tooltip position="start" delay="500">
								<Flex align="center" gap="8">
									<Icon
										:name="tx.status === 'success' ? 'check-circle' : 'close-circle'"
										size="13"
										:color="tx.status === 'success' ? 'green' : 'red'"
										:class="tx.status === 'success' ? $style.status_icon_success : $style.status_icon_error"
									/>

									<Text size="12" weight="600" color="primary" mono class="table_column_alias">
										{{ shortHex(tx.hash) }}
									</Text>

									<CopyButton :text="tx.hash" />
								</Flex>

								<template #content>
									<Flex direction="column" gap="6">
										<Flex align="center" gap="4">
											<Icon
												:name="tx.status === 'success' ? 'check-circle' : 'close-circle'"
												size="13"
												:color="tx.status === 'success' ? 'green' : 'red'"
											/>
											<Text size="13" weight="600" color="primary">
												{{ tx.status === "success" ? "Successful" : "Failed" }} Transaction
											</Text>
										</Flex>

										{{ space(tx.hash).toUpperCase() }}
									</Flex>
								</template>
							</Tooltip>
						</NuxtLink>
					</td>
					<td>
						<NuxtLink :to="`/tx/${tx.hash}`">
							<Flex justify="center" direction="column" gap="4">
								<ClientOnlyTime fallback-text="..." fallback-size="12" fallback-color="primary">
									<Text size="12" weight="600" color="primary">
										{{ DateTime.fromISO(tx.time).toRelative({ locale: "en", style: "short" }).replace(' ago', '') }}
									</Text>
								</ClientOnlyTime>
								<Text size="12" weight="500" color="tertiary">
									{{ DateTime.fromISO(tx.time).setLocale("en").toFormat("LLL d, t") }}
								</Text>
							</Flex>
						</NuxtLink>
					</td>
					<td>
						<NuxtLink :to="`/tx/${tx.hash}`">
							<Tooltip v-if="tx.transaction_types && tx.transaction_types.length > 0" position="start" textAlign="left">
								<MessageTypeBadge :types="tx.transaction_types" />

								<template #content>
									<Flex direction="column" gap="8">
										<Text v-for="type in tx.transaction_types" color="primary">
											{{ type.replace(/_/g, " ") }}
										</Text>
									</Flex>
								</template>
							</Tooltip>
							<Text v-else size="12" weight="500" color="tertiary">No type</Text>
						</NuxtLink>
					</td>
					<td>
						<Flex align="center" :class="$style.link">
							<Outline @click.prevent="router.push(`/block/${tx.height}`)">
								<Flex align="center" gap="6">
									<Icon name="block" size="14" color="secondary" />

									<Text size="13" weight="600" color="primary" tabular>{{ comma(tx.height) }}</Text>
								</Flex>
							</Outline>
						</Flex>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style module>
.wrapper_transactions {
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

		&.sortable {
			cursor: pointer;
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

.link {
	cursor: pointer;
}

/* Neon Glow Effects */
.status_icon_success {
	filter: drop-shadow(0 0 6px var(--neon-success));
	transition: all 0.2s ease;

	&:hover {
		filter: drop-shadow(0 0 10px var(--neon-success));
		transform: scale(1.02);
	}
}

.status_icon_error {
	filter: drop-shadow(0 0 6px var(--neon-error));
	transition: all 0.2s ease;

	&:hover {
		filter: drop-shadow(0 0 10px var(--neon-error));
		transform: scale(1.02);
	}
}
</style>
