# Monad Explorer

-   Production: [monad.hoodscan.io](https://monad.hoodscan.io)
-   Testnet: [dev.monad.hoodscan.io](https://monad.testnet.hoodscan.io)

A blockchain explorer and analytics platform for Monad, a high-performance EVM-compatible blockchain.

## Setup

Make sure to install the dependencies:

```bash
# pnpm
pnpm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# pnpm
pnpm dev
```

## Production

Build the application for production:

```bash
# pnpm
pnpm build
```

Locally preview production build:

```bash
# pnpm
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

name: "MonadExplorer",

### Node.js Server

When running `nuxt build` with the Node server preset, the result will be an entry point that launches a ready-to-run Node server.

```
node .output/server/index.mjs
```

This will launch your production Nuxt server that listens on port 3000 by default.

To use `pm2`, use an `ecosystem.config.js`:

```js
module.exports = {
	apps: [
		{
			name: "MonadExplorer",
			port: "3000",
			exec_mode: "cluster",
			instances: "max",
			script: "./.output/server/index.mjs",
		},
	],
}
```

Also, you can use different [presets](https://nuxt.com/docs/getting-started/deployment#hosting-providers). E.g. **Cloudflare Pages**: `cloudflare_pages`.

Note, some providers do not support server-side rendering.
