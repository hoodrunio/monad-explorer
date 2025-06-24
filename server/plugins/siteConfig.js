const origins = [
	"https://monad.hoodscan.io/",
	"https://testnet.monad.hoodscan.io/",
	"https://dev.monad.hoodscan.io/",
]

export default defineNitroPlugin((nitroApp) => {
	nitroApp.hooks.hook("site-config:init", ({ event, siteConfig }) => {
		const origin = useNitroOrigin(event)

		if (!origins.includes(origin)) return

		siteConfig.push({
			url: origin,
		})
	})
})
