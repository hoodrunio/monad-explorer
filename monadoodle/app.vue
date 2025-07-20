<script setup>
import { useAppStore } from "~/stores/app.store"

// Initialize app store and theme
const appStore = useAppStore()

// Initialize theme on app start
onMounted(() => {
	appStore.initializeTheme()
})

// Set page meta
useHead({
	title: "MonadDoodle - Collaborative Pixel Art",
	meta: [
		{ name: "description", content: "Draw together on a collaborative pixel canvas powered by Monad blockchain" }
	]
})
</script>

<template>
	<div>
		<NuxtPage />
	</div>
</template>

<style>
/* Import global styles */
</style> 