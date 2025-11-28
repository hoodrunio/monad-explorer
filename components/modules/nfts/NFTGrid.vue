<script setup>
/** Components */
import NFTCard from "./NFTCard.vue"

const router = useRouter()

const props = defineProps({
	nfts: {
		type: Array,
		required: true,
	},
	showCollection: {
		type: Boolean,
		default: true,
	},
	fallbackAddress: {
		type: String,
		default: '',
	},
})

const getTokenAddress = (nft) => {
	return nft.token?.address ||
		nft.token?.address_hash ||
		nft.token_contract_address_hash ||
		nft.token_address_hash ||
		nft.token_address ||
		props.fallbackAddress ||
		null
}

const getTokenId = (nft) => {
	return nft.id ??
		nft.token_id ??
		nft.unique_token ??
		nft.tokenId ??
		null
}

const handleNFTClick = (nft) => {
	const tokenAddress = getTokenAddress(nft)
	const tokenId = getTokenId(nft)

	if (tokenAddress && tokenId) {
		router.push(`/nfts/${tokenAddress}/${tokenId}`)
	}
}
</script>

<template>
	<div :class="$style.grid">
		<div
			v-for="nft in nfts"
			:key="`${getTokenAddress(nft)}-${getTokenId(nft)}`"
			@click="handleNFTClick(nft)"
		>
			<NFTCard :nft="nft" :showCollection="showCollection" />
		</div>
	</div>
</template>

<style module>
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: 16px;
	padding: 16px;
	width: 100%;
	box-sizing: border-box;
}

@media (max-width: 800px) {
	.grid {
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		padding: 12px;
	}
}

@media (max-width: 600px) {
	.grid {
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
		padding: 12px;
	}
}

@media (max-width: 400px) {
	.grid {
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
		padding: 8px;
	}
}
</style>
