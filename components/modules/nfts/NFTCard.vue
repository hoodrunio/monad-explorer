<script setup>
/** Services */
import { shortHex } from "@/services/utils"
import { resolveIPFSUrl } from "@/services/api/nfts"

const props = defineProps({
	nft: {
		type: Object,
		required: true,
	},
	showCollection: {
		type: Boolean,
		default: true,
	},
})

const imageUrl = computed(() => {
	if (props.nft.image_url) {
		return resolveIPFSUrl(props.nft.image_url)
	}
	if (props.nft.metadata?.image) {
		return resolveIPFSUrl(props.nft.metadata.image)
	}
	return null
})

const nftName = computed(() => {
	if (props.nft.metadata?.name) return props.nft.metadata.name
	if (props.nft.id) return `#${props.nft.id}`
	return 'Unknown NFT'
})
</script>

<template>
	<div :class="$style.card">
		<div :class="$style.image_container">
			<img
				v-if="imageUrl"
				:src="imageUrl"
				:alt="nftName"
				@error="$event.target.style.display = 'none'"
				:class="$style.image"
			/>
			<Flex v-else align="center" justify="center" :class="$style.placeholder">
				<Icon name="grid" size="40" color="tertiary" />
			</Flex>
		</div>

		<Flex direction="column" gap="6" :class="$style.info">
			<Text size="13" weight="600" color="primary" :class="$style.name">
				{{ nftName }}
			</Text>

			<Flex v-if="showCollection && nft.token" align="center" gap="6">
				<div :class="$style.collection_icon">
					<img
						v-if="nft.token.icon_url"
						:src="nft.token.icon_url"
						:alt="nft.token.name"
						@error="$event.target.style.display = 'none'"
					/>
					<Icon v-else name="coins" size="12" color="tertiary" />
				</div>
				<Text size="11" weight="500" color="tertiary" :class="$style.collection_name">
					{{ nft.token.name || shortHex(nft.token.address) }}
				</Text>
			</Flex>

			<Flex v-if="nft.id" align="center" gap="4">
				<Text size="11" weight="500" color="tertiary">Token ID:</Text>
				<Text size="11" weight="600" color="secondary" mono>
					{{ nft.id.length > 10 ? shortHex(nft.id) : nft.id }}
				</Text>
			</Flex>
		</Flex>
	</div>
</template>

<style module>
.card {
	background: var(--card-background);
	border-radius: 12px;
	overflow: hidden;
	transition: all 0.2s ease;
	cursor: pointer;

	&:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
	}
}

.image_container {
	width: 100%;
	aspect-ratio: 1;
	overflow: hidden;
	background: var(--op-8);
}

.image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.3s ease;

	.card:hover & {
		transform: scale(1.05);
	}
}

.placeholder {
	width: 100%;
	height: 100%;
	background: var(--op-5);
}

.info {
	padding: 12px;
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.collection_icon {
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: var(--op-10);
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;

	& img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.collection_name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 120px;
}
</style>
