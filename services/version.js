export const watchForUpdate = (currentVersion, callback) => {
	return setInterval(async () => {
		try {
			const { version } = await $fetch("/api/version")
			if (currentVersion !== version) callback(version)
		} catch (error) {
		}
	}, 3_600_000) // 1 hour
}
