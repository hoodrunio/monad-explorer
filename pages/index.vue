<script setup>
/** Components */
import Widgets from "@/components/widgets/Widgets.vue"
import RecentEventsTable from "@/components/data/RecentEventsTable.vue"
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
			content: "ValidatorWatch - Validator Network Monitoring",
		},
		{
			name: "twitter:description",
			content:
				"ValidatorWatch allows you to monitor validator performance, network health, consensus efficiency and geographic distribution in real-time.",
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
		<Widgets :class="$style.widgets" />

		<Flex direction="column" gap="40" :class="$style.main">
			<div :class="$style.tables">
				<RecentEventsTable />
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

.tables {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(486px, 1fr));
	gap: 20px;

	max-width: 100%;
}

@media (max-width: 1024px) {
	.tables {
		grid-template-columns: 100%;
	}
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
