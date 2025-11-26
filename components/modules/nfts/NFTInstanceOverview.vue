<script setup>
/** Services */
import { shortHex, splitAddress } from "@/services/utils"
import { resolveIPFSUrl } from "@/services/api/nfts"

/** UI */
import Button from "@/components/ui/Button.vue"
import Tooltip from "@/components/ui/Tooltip.vue"

const props = defineProps({
	nft: {
		type: Object,
		required: true,
	},
	token: {
		type: Object,
		default: null,
	},
})

const emit = defineEmits(['refreshMetadata'])

const imageUrl = computed(() => {
	if (props.nft.image_url) {
		return resolveIPFSUrl(props.nft.image_url)
	}
	if (props.nft.metadata?.image) {
		return resolveIPFSUrl(props.nft.metadata.image)
	}
	if (props.nft.animation_url) {
		return resolveIPFSUrl(props.nft.animation_url)
	}
	return null
})

const nftName = computed(() => {
	if (props.nft.metadata?.name) return props.nft.metadata.name
	if (props.nft.id) return `#${props.nft.id}`
	return 'Unknown NFT'
})

const attributes = computed(() => {
	if (props.nft.metadata?.attributes) {
		return props.nft.metadata.attributes
	}
	return []
})
</script>

<template>
	<Flex gap="24" :class="$style.container">
		<!-- Image Section -->
		<Flex direction="column" gap="12" :class="$style.image_section">
			<div :class="$style.image_container">
				<img
					v-if="imageUrl"
					:src="imageUrl"
					:alt="nftName"
					@error="$event.target.style.display = 'none'"
					:class="$style.image"
				/>
				<Flex v-else align="center" justify="center" :class="$style.placeholder">
					<Icon name="grid" size="64" color="tertiary" />
				</Flex>
			</div>

			<Button @click="$emit('refreshMetadata')" type="secondary" size="small" wide>
				<Icon name="refresh" size="12" color="primary" />
				Refresh Metadata
			</Button>
		</Flex>

		<!-- Info Section -->
		<Flex direction="column" gap="20" :class="$style.info_section">
			<!-- Header -->
			<Flex direction="column" gap="8">
				<Flex align="center" gap="8">
					<Text size="20" weight="700" color="primary">{{ nftName }}</Text>
				</Flex>

				<Flex v-if="token" align="center" gap="8">
					<div :class="$style.collection_icon">
						<img
							v-if="token.icon_url"
							:src="token.icon_url"
							:alt="token.name"
							@error="$event.target.style.display = 'none'"
						/>
						<Icon v-else name="coins" size="14" color="tertiary" />
					</div>
					<NuxtLink :to="`/tokens/${token.address}`">
						<Text size="13" weight="600" color="secondary" :class="$style.link">
							{{ token.name || 'Unknown Collection' }}
						</Text>
					</NuxtLink>
				</Flex>
			</Flex>

			<!-- Description -->
			<Flex v-if="nft.metadata?.description" direction="column" gap="8">
				<Text size="12" weight="600" color="tertiary">Description</Text>
				<Text size="13" weight="500" color="secondary" height="160" :class="$style.description">
					{{ nft.metadata.description }}
				</Text>
			</Flex>

			<!-- Details -->
			<Flex direction="column" gap="12">
				<Text size="12" weight="600" color="tertiary">Details</Text>

				<Flex direction="column" gap="8">
					<Flex align="center" justify="between">
						<Text size="12" weight="500" color="tertiary">Token ID</Text>
						<Tooltip position="end" delay="300">
							<Flex align="center" gap="6">
								<Text size="12" weight="600" color="primary" mono>
									{{ nft.id?.length > 20 ? shortHex(nft.id) : nft.id }}
								</Text>
								<CopyButton :text="nft.id" size="10" />
							</Flex>
							<template #content>
								{{ nft.id }}
							</template>
						</Tooltip>
					</Flex>

					<Flex v-if="nft.owner?.hash" align="center" justify="between">
						<Text size="12" weight="500" color="tertiary">Owner</Text>
						<NuxtLink :to="`/address/${nft.owner.hash}`">
							<Flex align="center" gap="6">
								<Text size="12" weight="600" color="primary" mono>
									{{ shortHex(nft.owner.hash) }}
								</Text>
								<CopyButton :text="nft.owner.hash" size="10" />
							</Flex>
						</NuxtLink>
					</Flex>

					<Flex v-if="token?.type" align="center" justify="between">
						<Text size="12" weight="500" color="tertiary">Token Standard</Text>
						<Text size="12" weight="600" color="secondary">{{ token.type }}</Text>
					</Flex>

					<Flex v-if="nft.metadata?.external_url" align="center" justify="between">
						<Text size="12" weight="500" color="tertiary">External Link</Text>
						<a :href="nft.metadata.external_url" target="_blank" rel="noopener noreferrer">
							<Flex align="center" gap="4">
								<Text size="12" weight="600" color="brand">View</Text>
								<Icon name="external-link" size="10" color="brand" />
							</Flex>
						</a>
					</Flex>
				</Flex>
			</Flex>

			<!-- Attributes -->
			<Flex v-if="attributes.length" direction="column" gap="12">
				<Text size="12" weight="600" color="tertiary">Attributes</Text>

				<Flex wrap="wrap" gap="8">
					<Flex
						v-for="(attr, index) in attributes"
						:key="index"
						direction="column"
						gap="4"
						:class="$style.attribute"
					>
						<Text size="10" weight="600" color="tertiary">
							{{ attr.trait_type || attr.type }}
						</Text>
						<Text size="12" weight="600" color="primary">
							{{ attr.value }}
						</Text>
					</Flex>
				</Flex>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.container {
	background: var(--card-background);
	border-radius: 8px;
	padding: 20px;
}

.image_section {
	flex: 0 0 300px;
	max-width: 300px;
}

.image_container {
	width: 100%;
	aspect-ratio: 1;
	border-radius: 12px;
	overflow: hidden;
	background: var(--op-8);
}

.image {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.placeholder {
	width: 100%;
	height: 100%;
}

.info_section {
	flex: 1;
	min-width: 0;
}

.collection_icon {
	width: 24px;
	height: 24px;
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

.link {
	transition: color 0.2s ease;

	&:hover {
		color: var(--txt-primary);
	}
}

.description {
	max-width: 500px;
}

.attribute {
	min-width: 100px;
	padding: 8px 12px;
	background: var(--op-5);
	border-radius: 8px;
	border: 1px solid var(--op-8);
}

@media (max-width: 768px) {
	.container {
		flex-direction: column;
	}

	.image_section {
		flex: none;
		max-width: 100%;
	}

	.image_container {
		max-width: 300px;
		margin: 0 auto;
	}
}
</style>
