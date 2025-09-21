<script setup>
/** Components */
import AddressOverview from "@/components/modules/address/AddressOverview.vue"

/** Services */
import { splitAddress } from "@/services/utils"

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

// Simple address object - let AddressOverview handle the data fetching
const address = computed(() => ({
	hash: route.params.hash,
}))

// AddressOverview will handle all data fetching internally

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

</script>

<template>
	<AddressOverview :address="address" />
</template>

<style module>
.empty {
	min-height: 300px;
}
</style>
