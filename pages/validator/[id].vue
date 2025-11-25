<script setup>
/** Components: Modules */
import ValidatorOverview from "@/components/modules/validator/ValidatorOverview.vue"

/** API */
import { fetchValidatorByID, fetchValidatorHistory, fetchValidatorInfrastructure } from "@/services/api/validator"
import { preloadGithubValidatorData } from "@/services/api/github"
import { fetchAddressNativeBalance } from "@/services/api/address"
import { fetchValidatorTipRevenue, fetchValidatorTipHistory } from "@/services/api/tipRevenue"

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
const authorBalance = ref(null)
const tipRevenue = ref(null)
const tipHistory = ref(null)

const {
	data,
	status: isLoading,
	error,
} = useAsyncData("validator", async () => {
	try {
		// Preload GitHub data in parallel with other API calls
		const githubDataPromise = preloadGithubValidatorData().catch(error => {
		})

		const [
			{ data: rawValidator },
			{ data: rawHistory },
			{ data: rawInfrastructure },
			{ data: rawTipRevenue },
			{ data: rawTipHistory },
		] = await Promise.all([
			fetchValidatorByID(route.params.id),
			fetchValidatorHistory({ id: route.params.id, hours: 168 }),
			fetchValidatorInfrastructure(route.params.id),
			fetchValidatorTipRevenue(route.params.id),
			fetchValidatorTipHistory(route.params.id, { hours: 24 }),
		])

		// Ensure GitHub data is loaded (no need to wait as it's cached now)
		githubDataPromise

		if (!rawValidator.value) {
			throw new Error("Validator not found")
		}

		return {
			validator: rawValidator.value,
			history: rawHistory.value,
			infrastructure: rawInfrastructure.value,
			tipRevenue: rawTipRevenue.value,
			tipHistory: rawTipHistory.value,
		}
	} catch (err) {
		if (err.message === "Validator not found") {
			await router.push("/validators")
		}
		throw err
	}
})

watch(
	data,
	async (newData) => {
		if (newData) {
			validator.value = newData.validator
			validatorHistory.value = newData.history
			validatorInfrastructure.value = newData.infrastructure
			tipRevenue.value = newData.tipRevenue
			tipHistory.value = newData.tipHistory
			cacheStore.current.validator = newData.validator

			// Fetch author address balance if available
			if (newData.validator?.staking?.auth_address) {
				try {
					const balanceResult = await fetchAddressNativeBalance(newData.validator.staking.auth_address)
					authorBalance.value = balanceResult
				} catch (error) {
					authorBalance.value = null
				}
			}
		}
	},
	{ immediate: true },
)

const validatorName = computed(() => {
	// Priority 1: Use already computed displayName from mergeValidatorData
	if (validator.value?.displayName && validator.value.displayName !== 'unknown') {
		return validator.value.displayName
	}

	// Priority 2: GitHub name
	if (validator.value?.github?.name) {
		return validator.value.github.name
	}

	// Priority 3: Infrastructure validator name
	if (validator.value?.infrastructure?.validator_name &&
	    validator.value.infrastructure.validator_name !== 'unknown') {
		return validator.value.infrastructure.validator_name
	}

	// Priority 4: Infrastructure from separate call
	if (validatorInfrastructure.value?.data?.location?.validatorName) {
		return validatorInfrastructure.value.data.location.validatorName
	}

	// Priority 5: Validator #<precompile_validator_id>
	if (validator.value?.staking?.precompile_validator_id) {
		return `Validator #${validator.value.staking.precompile_validator_id}`
	}

	// Priority 6: Short hex of validator_id
	return shortHex(route.params.id)
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

			<Flex v-if="isLoading === 'pending'" direction="column" gap="20" align="center" :class="$style.loading">
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
				:author-balance="authorBalance"
				:tip-revenue="tipRevenue"
				:tip-history="tipHistory"
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
