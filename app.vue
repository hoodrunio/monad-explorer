<script setup>
/** Vendor */
import * as Sentry from "@sentry/nuxt"

/** Services */
import amp from "@/services/amp"
import { watchForUpdate } from "@/services/version"

/** Components */
import ModalsManager from "@/components/modals/ModalsManager.vue"
import CommandMenu from "@/components/cmd/CommandMenu.vue"

/** Store */
import { useNodeStore } from "@/store/node.store"
import { useAppStore } from "@/store/app.store"
import { useBookmarksStore } from "@/store/bookmarks.store"
import { useSettingsStore } from "@/store/settings.store"
import { useLegalStore } from "@/store/legal.store"
import { useNotificationsStore } from "@/store/notifications.store"
import { useActivityStore } from "@/store/activity.store"
const nodeStore = useNodeStore()
const appStore = useAppStore()
const bookmarksStore = useBookmarksStore()
const settingsStore = useSettingsStore()
const legalStore = useLegalStore()
const notificationsStore = useNotificationsStore()
const activityStore = useActivityStore()

bookmarksStore.$subscribe((mutation, state) => {
	localStorage.setItem("bookmarks", JSON.stringify(state.bookmarks))
})
settingsStore.$subscribe((mutation, state) => {
	localStorage.setItem("settings", JSON.stringify(state))
})
legalStore.$subscribe((mutation, state) => {
	localStorage.setItem("legal", JSON.stringify(state.legal))
})
// No activity state to persist for validator monitoring

let watchInterval = null

onMounted(async () => {
	/**
	 * Watch for package.json->version and notify users about the new version
	 */
	appStore.version = (await $fetch("/api/version")).version
	if (!import.meta.dev)
		watchInterval = watchForUpdate(appStore.version, (newVersion) => {
			clearInterval(watchInterval)
			notificationsStore.create({
				notification: {
					type: "success",
					icon: "info",
					title: "New update is available",
					description: "Refresh the page to get the latest update with new features & bug fixes.",
					autoDestroy: false,
					irremovable: true,
					actions: [
						{
							name: "Refresh",
							icon: "refresh",
							callback: () => {
								location.reload()
							},
						},
						{
							name: "Changelog",
							icon: "menu",
							callback: () => {
								window
									.open(`https://github.com/hoodrunio/monad-explorer/releases/tag/v${newVersion}`, "_blank")
									.focus()
							},
						},
					],
				},
			})
		})

	if (localStorage.bookmarks) {
		bookmarksStore.bookmarks = JSON.parse(localStorage.bookmarks)
	}

	if (localStorage.nodeSettings) {
		nodeStore.settings = JSON.parse(localStorage.nodeSettings)
	}

	settingsStore.init()
	activityStore.init()

	const runtimeConfig = useRuntimeConfig()
	
	// Debug environment variables
	console.log('🔧 Environment Variables Debug:')
	console.log('AMP:', runtimeConfig.public.AMP)
	console.log('SENTRY_DSN:', runtimeConfig.public.SENTRY_DSN)
	console.log('isDev:', import.meta.dev)
	
	// Initialize Amplitude only if API key exists
	if (runtimeConfig.public.AMP) {
		amp.init(runtimeConfig.public.AMP)
		console.log('✅ Amplitude initialized')
	} else {
		console.warn('❌ Amplitude not initialized - missing AMP environment variable')
	}

	legalStore.init()
	if (!legalStore.isAccepted()) {
		notificationsStore.create({
			notification: {
				type: "warning",
				icon: "info",
				title: "Just so you know: we use analytics.",
				description: "privacy",
				autoDestroy: false,
				irremovable: true,
				actions: [
					{
						name: "OK",
						callback: () => {
							legalStore.acceptLegal()
						},
					},
				],
			},
		})
	}

	// Initialize Sentry client-side with better error handling
	if (runtimeConfig.public.SENTRY_DSN && !import.meta.dev && typeof window !== "undefined") {
		try {
			Sentry.init({
				dsn: runtimeConfig.public.SENTRY_DSN,
				integrations: [
					Sentry.browserTracingIntegration(),
					Sentry.replayIntegration({
						maskAllText: false,
						blockAllMedia: false,
					}),
				],
				// Session Replay
				replaysSessionSampleRate: 0.1, // 10% sampling rate in production
				replaysOnErrorSampleRate: 1.0, // 100% when errors occur
				environment: import.meta.dev ? "development" : "production",
				// Set tracesSampleRate for performance monitoring
				tracesSampleRate: 0.1,
				// Add user information
				sendDefaultPii: true,
				// Enable debugging in development
				debug: import.meta.dev,
			})
			console.log('✅ Sentry client initialized')
		} catch (error) {
			console.error('❌ Sentry client initialization failed:', error)
		}
	} else {
		console.warn('❌ Sentry client not initialized:', {
			hasDSN: !!runtimeConfig.public.SENTRY_DSN,
			isDev: import.meta.dev,
			isClient: typeof window !== "undefined"
		})
	}


})

onBeforeUnmount(() => {
	clearInterval(watchInterval)
})
</script>

<template>
	<CommandMenu :show="appStore.showCmd" />

	<NuxtLoadingIndicator :height="2" color="#18d2a5" />
	<NuxtLayout>
		<NuxtPage />

		<div id="tooltip" />
		<div id="dropdown" />
		<div id="popover" />
		<div id="modal" />

		<ModalsManager />
		<Notifications />
	</NuxtLayout>
</template>
