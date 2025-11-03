import { nodePolyfills } from "vite-plugin-node-polyfills"
import wasm from "vite-plugin-wasm"

import path from "path"

export default defineNuxtConfig({
	modules: ["nuxt-site-config", "@pinia/nuxt", "@nuxtjs/sitemap"],

	site: {
		url: "https://monad.hoodscan.io",
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
		"/blocks": {
			sitemap: {
				changefreq: "daily",
				priority: 0.9,
			},
		},
		"/staking": {
			sitemap: {
				changefreq: "daily",
				priority: 0.8,
			},
		},
		"/staking/validators": {
			sitemap: {
				changefreq: "daily",
				priority: 0.7,
			},
		},
		"/consensus": {
			sitemap: {
				changefreq: "daily",
				priority: 0.75,
			},
		},
		"/namespaces": {
			sitemap: {
				changefreq: "daily",
				priority: 0.6,
			},
		},
		"/txs": {
			sitemap: {
				changefreq: "daily",
				priority: 0.5,
			},
		},
		"/addresses": {
			sitemap: {
				changefreq: "daily",
				priority: 0.4,
			},
		},
		"/gas": {
			sitemap: {
				changefreq: "daily",
				priority: 0.3,
			},
		},
		"/namespaces/treemap": {
			sitemap: {
				changefreq: "weekly",
				priority: 0.2,
			},
		},
	},

	runtimeConfig: {
		// Private keys (only available on server-side)
		githubToken: process.env.GITHUB_TOKEN || '',
		blockscoutApiUrl: process.env.BLOCKSCOUT_API_URL || '',
		// Public keys (exposed to client-side)
		public: {
			AMP: process.env.AMP,
			SENTRY_DSN: process.env.SENTRY_DSN,
			WALLET_CONNECT_PROJECT_ID: process.env.WALLET_CONNECT_PROJECT_ID || '',
			blockscoutApiUrl: process.env.BLOCKSCOUT_API_URL || '',
			version: "1.16.0",
		},
	},

	app: {
		head: {
			htmlAttrs: {
				lang: "en",
			},
			meta: [
				{ name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
				{
					name: "lang",
					content: "en",
				},
			],
			link: [
				{
					id: "favicon",
					rel: "icon",
					type: "image/png",
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
				{
					rel: "preload",
					as: "style",
					href: "https://fonts.googleapis.com/css2?family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap",
					onload: "this.onload=null;this.rel='stylesheet'",
				},
			],
		},
	},

	css: ["@/assets/styles/base.scss", "@/assets/styles/flex.scss", "@/assets/styles/text.scss"],

	// Pinia configuration - using defaults



	devtools: {
		enabled: true,
	},

	//debug: true,

	vite: {
		define: {
			global: "globalThis",
		},
		resolve: {
			alias: {
				"unenv/runtime/node/buffer/index/": path.resolve(__dirname, "./node_modules/buffer/index"),
			},
		},
		plugins: [wasm(), nodePolyfills()],
		worker: {
			format: "es",
			plugins: () => [wasm()],
		},
	},
	compatibilityDate: "2025-04-02",
})
