<script setup>
/** Components: Modules */
import ValidatorOverview from "@/components/modules/validator/ValidatorOverview.vue"

/** API */
import { fetchValidatorByID, fetchValidatorHistory, fetchValidatorInfrastructure } from "@/services/api/validator"

/** Services */
import { shortHex } from "@/services/utils"

/** Store */
import { useCacheStore } from "@/store/cache.store"
const cacheStore = useCacheStore()

const route = useRoute()
const router = useRouter()

const validator = ref()
const validatorHistory = ref()
const validatorInfrastructure = ref()
const isLoading = ref(true)
const error = ref(null)

// Fetch all validator data
try {
	const [
		{ data: rawValidator },
		{ data: rawHistory },
		{ data: rawInfrastructure }
	] = await Promise.all([
		fetchValidatorByID(route.params.id),
		fetchValidatorHistory({ id: route.params.id, hours: 24 }),
		fetchValidatorInfrastructure(route.params.id)
	])

	if (!rawValidator.value) {
		throw new Error('Validator not found')
	}

	validator.value = rawValidator.value
	validatorHistory.value = rawHistory.value
	validatorInfrastructure.value = rawInfrastructure.value
	
	cacheStore.current.validator = validator.value
} catch (err) {
	error.value = err.message
	console.error('Error fetching validator data:', err)
} finally {
	isLoading.value = false
}

// Redirect if validator not found
if (error.value && !validator.value) {
	router.push("/validators")
}

const validatorName = computed(() => {
	return validator.value?.infrastructure?.validator_name || 
		   validatorInfrastructure.value?.data?.location?.validatorName || 
		   shortHex(route.params.id)
})

defineOgImageComponent("ValidatorImage", {
	title: "Validator",
	validator: validator.value,
	cacheKey: validatorName.value,
})

useHead({
	title: `Validator ${validatorName.value} - Monad Explorer`,
	link: [
		{
			rel: "canonical",
			href: `${useRequestURL().origin}${useRequestURL().pathname}`,
		},
	],
	meta: [
		{
			name: "description",
			content: `Monitor ${validatorName.value} performance metrics, uptime score, QC participation rate, infrastructure details and historical data on Monad network.`,
		},
		{
			property: "og:title",
			content: `Validator ${validatorName.value} - Monad Explorer`,
		},
		{
			property: "og:description",
			content: `Monitor ${validatorName.value} performance metrics, uptime score, QC participation rate, infrastructure details and historical data on Monad network.`,
		},
		{
			property: "og:url",
			content: `${useRequestURL().origin}${useRequestURL().pathname}`,
		},
		{
			name: "twitter:title",
			content: `Validator ${validatorName.value} - Monad Explorer`,
		},
		{
			name: "twitter:description",
			content: `Monitor ${validatorName.value} performance metrics, uptime score, QC participation rate, infrastructure details and historical data on Monad network.`,
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
					v-if="validator"
					:items="[
						{ link: '/', name: 'Dashboard' },
						{ link: '/validators', name: 'Validators' },
						{ link: route.fullPath, name: validatorName },
					]"
				/>
			</Flex>

			<Flex v-if="isLoading" direction="column" gap="20" align="center" :class="$style.loading">
				<Text size="13" weight="600" color="secondary">Loading validator data...</Text>
			</Flex>

			<Flex v-else-if="error" direction="column" gap="20" align="center" :class="$style.error">
				<Text size="13" weight="600" color="red">{{ error }}</Text>
				<NuxtLink to="/validators">
					<Text size="12" color="secondary">← Back to validators</Text>
				</NuxtLink>
			</Flex>

			<ValidatorOverview 
				v-else-if="validator" 
				:validator="validator" 
				:history="validatorHistory"
				:infrastructure="validatorInfrastructure"
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
