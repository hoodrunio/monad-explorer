/** Vendor */
import { defineStore, acceptHMRUpdate } from "pinia"

export const useActivityStore = defineStore("activity", () => {
	const initialized = ref(true)

	const init = async () => {
		// For Monad validator monitoring, we don't need rollup activity tracking
		// Activity tracking can be added later if needed for validator events
		initialized.value = true
	}

	return { initialized, init }
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useActivityStore, import.meta.hot))
}
