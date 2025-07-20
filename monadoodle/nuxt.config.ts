import { nodePolyfills } from "vite-plugin-node-polyfills"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"

import path from "path"

export default defineNuxtConfig({
	modules: ["@pinia/nuxt", "@nuxtjs/sitemap"],

	site: {
		url: "https://monadoodle.vercel.app",
	},

	sitemap: {
		xsl: false,
	},

	routeRules: {
		"/": {
			sitemap: {
				changefreq: "daily",
				priority: 1,
			},
		},
	},

	runtimeConfig: {
		// Public keys (exposed to client-side)
		public: {
			version: "1.0.0",
			MULTISYNQ_API_KEY: process.env.MULTISYNQ_API_KEY || "",
			MONAD_RPC_URL: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
		},
	},

	app: {
		head: {
			htmlAttrs: {
				lang: "en",
			},
			title: "MonadDoodle - Collaborative Pixel Art on Monad Blockchain",
			meta: [
				{ name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
				{ name: "description", content: "Collaborative pixel art canvas with real-time synchronization and blockchain integration on Monad testnet" },
				{ name: "lang", content: "en" },
			],
			link: [
				{
					id: "favicon",
					rel: "icon",
					type: "image/png",
					href: "/favicon.ico",
				},
				{
					rel: "preconnect",
					href: "https://fonts.googleapis.com",
				},
				{
					rel: "preconnect",
					href: "https://fonts.gstatic.com",
					crossorigin: "anonymous",
				},
				{
					rel: "preload",
					as: "style",
					href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
					onload: "this.onload=null;this.rel='stylesheet'",
				},
				{
					rel: "preload",
					as: "style",
					href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap",
					onload: "this.onload=null;this.rel='stylesheet'",
				},
			],
		},
	},

	css: ["@/assets/styles/base.scss", "@/assets/styles/flex.scss", "@/assets/styles/text.scss"],

	devtools: {
		enabled: true,
	},

	vite: {
		define: {
			global: "globalThis",
		},
		resolve: {
			alias: {
				"unenv/runtime/node/buffer/index/": path.resolve(__dirname, "./node_modules/buffer/index"),
			},
		},
		plugins: [wasm(), topLevelAwait(), nodePolyfills()],
		worker: {
			format: "es",
			plugins: () => [wasm(), topLevelAwait()],
		},
	},

	compatibilityDate: "2025-04-02",
}) 