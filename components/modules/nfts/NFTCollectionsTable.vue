<script setup>
/** Services */
import { comma, shortHex } from "@/services/utils"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

const router = useRouter()

const props = defineProps({
	collections: {
		type: Array,
		required: true,
	},
})

/**
 * Get token type badge class
 */
const getTypeClass = (type) => {
	switch (type) {
		case 'ERC-721': return 'erc721'
		case 'ERC-1155': return 'erc1155'
		case 'ERC-404': return 'erc404'
		default: return ''
	}
}
</script>

<template>
	<div :class="$style.wrapper">
		<table :class="$style.table">
			<thead>
				<tr>
					<th><Text size="12" weight="600" color="tertiary">Collection</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Type</Text></th>
					<th><Text size="12" weight="600" color="tertiary">Items Owned</Text></th>
				</tr>
			</thead>

			<tbody>
				<tr
					v-for="collection in collections"
					:key="collection.token?.address"
					@click="router.push(`/nfts/${collection.token?.address}`)"
					:class="$style.row"
				>
					<td>
						<Flex align="center" gap="12">
							<div :class="$style.collection_icon">
								<img
									v-if="collection.token?.icon_url"
									:src="collection.token.icon_url"
									:alt="collection.token?.name"
									@error="$event.target.style.display = 'none'"
								/>
								<Icon v-else name="grid" size="20" color="secondary" />
							</div>
							<Flex direction="column" gap="4">
								<Text size="13" weight="600" color="primary">
									{{ collection.token?.name || 'Unknown Collection' }}
								</Text>
								<Tooltip position="start" delay="300">
									<Text size="11" weight="500" color="tertiary" mono>
										{{ shortHex(collection.token?.address) }}
									</Text>
									<template #content>
										{{ collection.token?.address }}
									</template>
								</Tooltip>
							</Flex>
						</Flex>
					</td>
					<td>
						<div :class="[$style.type_badge, $style[getTypeClass(collection.token_type)]]">
							<Text size="11" weight="600">{{ collection.token_type || 'Unknown' }}</Text>
						</div>
					</td>
					<td>
						<Text size="12" weight="600" color="secondary">
							{{ comma(collection.amount || 0) }}
						</Text>
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
		padding-top: 12px;
		padding-bottom: 12px;

		white-space: nowrap;

		&:first-child {
			padding-left: 16px;
		}
	}
}

.collection_icon {
	width: 40px;
	height: 40px;
	border-radius: 8px;
	background: var(--op-8);
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;

	& img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.type_badge {
	padding: 2px 8px;
	border-radius: 4px;
	background: var(--op-8);
	display: inline-block;
}

.erc721 {
	background: rgba(168, 85, 247, 0.15);
	& span { color: rgb(192, 132, 252); }
}

.erc1155 {
	background: rgba(249, 115, 22, 0.15);
	& span { color: rgb(251, 146, 60); }
}

.erc404 {
	background: rgba(34, 197, 94, 0.15);
	& span { color: rgb(74, 222, 128); }
}
</style>
