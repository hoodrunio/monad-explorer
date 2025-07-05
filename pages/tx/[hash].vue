<script setup>
/** Components: Modules */
import TxOverview from "@/components/modules/tx/TxOverview.vue"

/** API */
import { fetchTxByHash, fetchTxTokenTransfers, fetchTxInternalTransactions } from "@/services/api/tx"

/** Services */
import { shortHex } from "@/services/utils"

/** Store */
import { useCacheStore } from "@/store/cache.store"
const cacheStore = useCacheStore()

const route = useRoute()
const router = useRouter()

const transaction = ref()
const tokenTransfers = ref([])
const internalTransactions = ref([])

const {
	data,
	status: isLoading,
	error,
} = useAsyncData("transaction", async () => {
	try {
		const txHash = route.params.hash

		// Validate transaction hash format (0x + 64 hex characters)
		if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
			throw new Error("Invalid transaction hash format")
		}

		const [
			{ data: rawTransaction },
			{ data: rawTokenTransfers },
			{ data: rawInternalTransactions },
		] = await Promise.all([
			fetchTxByHash(txHash),
			fetchTxTokenTransfers(txHash),
			fetchTxInternalTransactions(txHash),
		])

		if (!rawTransaction.value) {
			throw new Error("Transaction not found")
		}

		return {
			transaction: rawTransaction.value.transaction || rawTransaction.value,
			tokenTransfers: rawTokenTransfers.value?.tokenTransfers || rawTokenTransfers.value || [],
			internalTransactions: rawInternalTransactions.value?.internalTransactions || rawInternalTransactions.value || [],
		}
	} catch (err) {
		if (err.message === "Transaction not found" || err.message === "Invalid transaction hash format") {
			await router.push("/")
		}
		throw err
	}
})

watch(
	data,
	(newData) => {
		if (newData) {
			transaction.value = newData.transaction
			tokenTransfers.value = newData.tokenTransfers
			internalTransactions.value = newData.internalTransactions
			cacheStore.current.transaction = newData.transaction
			cacheStore.current.tokenTransfers = newData.tokenTransfers
			cacheStore.current.internalTransactions = newData.internalTransactions
		}
	},
	{ immediate: true },
)

const txHash = computed(() => {
	return transaction.value?.hash || route.params.hash
})

const shortTxHash = computed(() => {
	return shortHex(txHash.value)
})

defineOgImageComponent("TxImage", {
	title: "Transaction",
	transaction: transaction.value,
	cacheKey: txHash.value,
})

useHead({
	title: `Transaction ${shortTxHash.value} - Monad Explorer`,
	link: [
		{
			rel: "canonical",
			href: `${useRequestURL().origin}${useRequestURL().pathname}`,
		},
	],
	meta: [
		{
			name: "description",
			content: `Explore transaction ${shortTxHash.value} on Monad network. View token transfers, internal transactions, gas usage, and other details.`,
		},
		{
			property: "og:title",
			content: `Transaction ${shortTxHash.value} - Monad Explorer`,
		},
		{
			property: "og:description",
			content: `Explore transaction ${shortTxHash.value} on Monad network. View token transfers, internal transactions, gas usage, and other details.`,
		},
		{
			property: "og:url",
			content: `${useRequestURL().origin}${useRequestURL().pathname}`,
		},
		{
			name: "twitter:title",
			content: `Transaction ${shortTxHash.value} - Monad Explorer`,
		},
		{
			name: "twitter:description",
			content: `Explore transaction ${shortTxHash.value} on Monad network. View token transfers, internal transactions, gas usage, and other details.`,
		},
		{
			name: "twitter:card",
			content: "summary_large_image",
		},
	],
})
</script>

<template>
	<Flex direction="column" gap="32" wide :class="$style.wrapper">
		<Flex direction="column" gap="16">
			<Flex align="end" justify="between" :class="$style.breadcrumbs">
				<Breadcrumbs
					v-if="transaction"
					:items="[
						{ link: '/', name: 'Dashboard' },
						{ link: '/transactions', name: 'Transactions' },
						{ link: route.fullPath, name: `Transaction ${shortTxHash}` },
					]"
				/>
			</Flex>

			<Flex v-if="isLoading === 'pending'" direction="column" gap="20" align="center" :class="$style.loading">
				<Text size="13" weight="600" color="secondary">Loading transaction data...</Text>
			</Flex>

			<Flex v-else-if="error" direction="column" gap="20" align="center" :class="$style.error">
				<Text size="13" weight="600" color="red">{{ error }}</Text>
				<NuxtLink to="/">
					<Text size="12" color="secondary">← Back to dashboard</Text>
				</NuxtLink>
			</Flex>

			<TxOverview 
				v-else-if="transaction" 
				:tx="transaction"
			/>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	padding: 20px 24px 60px 24px;
}

.breadcrumbs {
	margin-bottom: 16px;
}

.loading,
.error {
	padding: 40px 20px;
	text-align: center;
}

@media (max-width: 500px) {
	.wrapper {
		padding: 32px 12px;
	}
}
</style> 