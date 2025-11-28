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
	<Flex direction="column" gap="32" wide :class="$style.wrapper">
		<Flex direction="column" gap="16">
			<Flex align="end" justify="between" :class="$style.breadcrumbs">
				<Breadcrumbs
					:items="[
						{ link: '/', name: 'Dashboard' },
						{ link: route.fullPath, name: `Address ${splitAddress(route.params.hash)}` },
					]"
				/>
			</Flex>

			<AddressOverview :address="address" />
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

.empty {
	min-height: 300px;
}

@media (max-width: 500px) {
	.wrapper {
		padding: 32px 12px;
	}
}
</style>
