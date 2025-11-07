<script setup>
/** Components: Modules */
import BlockOverview from "@/components/modules/block/BlockOverview.vue"

/** API */
import { fetchBlockByHeight, fetchBlockTransactions } from "@/services/api/block"

/** Services */
import { comma } from "@/services/utils"

/** Store */
import { useCacheStore } from "@/store/cache.store"
const cacheStore = useCacheStore()

const route = useRoute()
const router = useRouter()

const block = ref()
const transactions = ref([])
const nextTxParams = ref(null)

const {
	data,
	status: isLoading,
	error,
} = useAsyncData("block", async () => {
	try {
		const blockId = route.params.id

		// Validate block identifier (can be number or hash)
		if (!blockId) {
			throw new Error("Invalid block identifier")
		}

		// Fetch block and initial transactions in parallel
		const [
			{ data: rawBlock },
			{ data: rawTransactions },
		] = await Promise.all([
			fetchBlockByHeight(blockId),
			fetchBlockTransactions({
				blockNumberOrHash: blockId,
				items_count: 20,
			}),
		])

		if (!rawBlock.value) {
			throw new Error("Block not found")
		}

		return {
			block: rawBlock.value,
			transactions: rawTransactions.value?.items || [],
			nextTxParams: rawTransactions.value?.next_page_params || null,
		}
	} catch (err) {
		if (err.message === "Block not found" || err.message === "Invalid block identifier") {
			await router.push("/")
		}
		throw err
	}
})

watch(
	data,
	(newData) => {
		if (newData) {
			block.value = newData.block
			transactions.value = newData.transactions
			nextTxParams.value = newData.nextTxParams
			cacheStore.current.block = newData.block
			cacheStore.current.transactions = newData.transactions
		}
	},
	{ immediate: true },
)

const blockNumber = computed(() => {
	return block.value?.height || route.params.id
})

useHead({
	title: `Block ${comma(blockNumber.value)} - Monad Explorer`,
	link: [
		{
			rel: "canonical",
			href: `${useRequestURL().origin}${useRequestURL().pathname}`,
		},
	],
	meta: [
		{
			name: "description",
			content: `Explore block ${comma(blockNumber.value)} on Monad network. View transactions, gas usage, block size, and other details.`,
		},
	],
})
</script>

<template>
	<Flex direction="column" gap="32" wide :class="$style.wrapper">
		<Flex direction="column" gap="16">
			<Flex align="end" justify="between" :class="$style.breadcrumbs">
				<Breadcrumbs
					v-if="block"
					:items="[
						{ link: '/', name: 'Dashboard' },
						{ link: '/blocks', name: 'Blocks' },
						{ link: route.fullPath, name: `Block ${comma(blockNumber)}` },
					]"
				/>
			</Flex>

			<Flex v-if="isLoading === 'pending'" direction="column" gap="20" align="center" :class="$style.loading">
				<Text size="13" weight="600" color="secondary">Loading block data...</Text>
			</Flex>

			<Flex v-else-if="error" direction="column" gap="20" align="center" :class="$style.error">
				<Text size="13" weight="600" color="red">{{ error }}</Text>
				<NuxtLink to="/">
					<Text size="12" color="secondary">← Back to dashboard</Text>
				</NuxtLink>
			</Flex>

			<BlockOverview
				v-else-if="block"
				:block="block"
				:transactions="transactions"
				:nextTxParams="nextTxParams"
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
