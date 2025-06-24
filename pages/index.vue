<script setup>
/** Components */
import Widgets from "@/components/widgets/Widgets.vue"
import ValidatorNetworkSummary from "@/components/data/ValidatorNetworkSummary.vue"

/** Services */
import { parseRedirectQueryError } from "@/services/notifications"

/** Store */
import { useAppStore } from "@/store/app.store"
const appStore = useAppStore()

const route = useRoute()
const router = useRouter()

definePageMeta({
	layout: "default",
})

useHead({
	title: "Monad Explorer - Validator Network Monitoring",
	link: [
		{
			rel: "canonical",
			href: "/",
		},
	],
	meta: [
		{
			name: "description",
			content: "Comprehensive validator network monitoring and analytics for the Monad blockchain ecosystem.",
		},
		{
			property: "og:title",
			content: "Monad Explorer - Validator Network Monitoring",
		},
		{
			property: "og:description",
			content: "Monitor validator performance, network health, and geographic distribution in real-time.",
		},
		{
			property: "og:url",
			content: "/",
		},
		{
			property: "og:image",
			content: "/img/seo/main.png",
		},
		{
			name: "twitter:title",
			content: "Monad Explorer - Validator Network Monitoring",
		},
		{
			name: "twitter:description",
			content:
				"Monitor validator performance, network health, consensus efficiency and geographic distribution in real-time.",
		},
		{
			name: "twitter:card",
			content: "summary_large_image",
		},
		{
			name: "twitter:image",
			content: "/img/seo/main.png",
		},
	],
})

onBeforeMount(async () => {
	if (Object.keys(route.query).length && route.query.error) {
		parseRedirectQueryError(route.query)
		router.replace({ query: null })
	}
})
</script>

<template>
	<Flex direction="column" wide :class="$style.wrapper">
		<!-- API-Aligned Widget Sections -->
		<Widgets :class="$style.widgets" />

		<!-- Validator Rankings Table -->
		<Flex direction="column" gap="40" :class="$style.main">
			<div :class="$style.table_section">
				<ValidatorNetworkSummary />
			</div>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	padding: 0 24px;
	margin-bottom: 24px;
}

.widgets {
	margin-top: 20px;
}

.main {
	max-width: 100%;
	margin-top: 40px;
}

.table_section {
	max-width: 100%;
}

@media (max-width: 500px) {
	.widgets {
		margin-top: 24px;
	}

	.wrapper {
		padding: 0 12px;
	}
}
</style>
