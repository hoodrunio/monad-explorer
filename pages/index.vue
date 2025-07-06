<script setup>
/** Components */
import Widgets from "@/components/widgets/Widgets.vue"

/** Services */
import { parseRedirectQueryError } from "@/services/notifications"

const route = useRoute()
const router = useRouter()

definePageMeta({
	layout: "default",
})

useHead({
	title: "Monad Explorer - Network Monitoring",
	link: [
		{
			rel: "canonical",
			href: "/",
		},
	],
	meta: [
		{
			name: "description",
			content: "Comprehensive network monitoring and analytics for the Monad blockchain ecosystem.",
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

@media (max-width: 500px) {
	.widgets {
		margin-top: 24px;
	}

	.wrapper {
		padding: 0 12px;
	}
}
</style>
