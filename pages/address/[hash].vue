<script setup>
/** Components */
import AddressOverview from "@/components/modules/address/AddressOverview.vue"
import Skeleton from "@/components/Skeleton.vue"

/** Services */
import { splitAddress } from "@/services/utils"

/** API */
import { fetchAddressOverview } from "@/services/api/address"

const route = useRoute()
const router = useRouter()

// Validate address format
const isValidAddress = (address) => {
	if (!address || typeof address !== 'string') return false
	return /^0x[a-fA-F0-9]{40}$/i.test(address)
}

// Check if address is valid, redirect if not
if (!isValidAddress(route.params.hash)) {
	throw createError({
		statusCode: 400,
		statusMessage: 'Invalid address format'
	})
}

// Fetch address data
const { data: addressData, pending, error } = await fetchAddressOverview(route.params.hash)

// Handle error states
if (error.value) {
	throw createError({
		statusCode: error.value.statusCode || 404,
		statusMessage: error.value.statusMessage || 'Address not found'
	})
}

// SEO
useHead({
	title: `Address ${splitAddress(route.params.hash)} - Monad Explorer`,
	link: [
		{
			rel: "canonical",
			href: `/address/${route.params.hash}`,
		},
	],
	meta: [
		{
			name: "description",
			content: `Explore address ${splitAddress(route.params.hash)} on the Monad blockchain. View transactions, balances, and activity statistics.`,
		},
		{
			property: "og:title",
			content: `Address ${splitAddress(route.params.hash)} - Monad Explorer`,
		},
		{
			property: "og:description",
			content: `Explore address ${splitAddress(route.params.hash)} on the Monad blockchain. View transactions, balances, and activity statistics.`,
		},
		{
			property: "og:type",
			content: "website",
		},
	],
})

// Computed address object for compatibility with AddressOverview component
const address = computed(() => ({
	hash: route.params.hash,
	balance: addressData.value?.balance?.data?.nativeBalance || "0",
	stats: addressData.value?.stats?.data?.stats || null,
}))
</script>

<template>
	<Flex direction="column" gap="4">
		<Skeleton v-if="pending" />
		<AddressOverview v-else-if="addressData" :address="address" />
		<Flex v-else direction="column" align="center" justify="center" gap="16" :class="$style.empty">
			<Icon name="address" size="32" color="tertiary" />
			<Flex direction="column" align="center" gap="8">
				<Text size="14" weight="600" color="primary">Address not found</Text>
				<Text size="13" color="tertiary" align="center" style="max-width: 220px">
					This address doesn't exist or hasn't been indexed yet
				</Text>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.empty {
	min-height: 300px;
}
</style>
