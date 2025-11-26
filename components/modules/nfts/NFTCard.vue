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

/** Image loading state */
const isImageLoading = ref(true)
const hasImageError = ref(false)

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

const handleImageLoad = () => {
	isImageLoading.value = false
}

const handleImageError = (event) => {
	isImageLoading.value = false
	hasImageError.value = true
	event.target.style.display = 'none'
}

/** Reset loading state when imageUrl changes */
watch(imageUrl, () => {
	isImageLoading.value = true
	hasImageError.value = false
})
</script>

<template>
	<div :class="$style.card">
		<div :class="$style.image_container">
			<!-- Loading skeleton -->
			<div v-if="imageUrl && isImageLoading" :class="$style.skeleton" />

			<!-- NFT Image -->
			<img
				v-if="imageUrl && !hasImageError"
				:src="imageUrl"
				:alt="nftName"
				loading="lazy"
				@load="handleImageLoad"
				@error="handleImageError"
				:class="[$style.image, !isImageLoading && $style.loaded]"
			/>

			<!-- Placeholder when no image or error -->
			<Flex v-if="!imageUrl || hasImageError" align="center" justify="center" :class="$style.placeholder">
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
	position: relative;
}

.skeleton {
	position: absolute;
	inset: 0;
	background: linear-gradient(
		90deg,
		var(--op-5) 0%,
		var(--op-10) 50%,
		var(--op-5) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}

.image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.3s ease, opacity 0.3s ease;
	opacity: 0;

	.card:hover & {
		transform: scale(1.05);
	}
}

.image.loaded {
	opacity: 1;
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
