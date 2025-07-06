import * as Sentry from "@sentry/nuxt"

export function register() {
	// Only initialize on server-side
	if (process.server || typeof window === "undefined") {
		Sentry.init({
			dsn: process.env.SENTRY_DSN,
			environment: process.env.NODE_ENV || "production",
			debug: process.env.NODE_ENV === "development",
			// Enable logs for debugging
			_experiments: {
				enableLogs: true,
			},
			// Set tracesSampleRate to 1.0 to capture 100%
			// of transactions for tracing.
			// We recommend adjusting this value in production
			tracesSampleRate: 0.1,
			// Add user information
			sendDefaultPii: true,
		})
	}
} 