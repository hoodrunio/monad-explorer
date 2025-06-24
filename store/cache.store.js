/**
 * Vendor
 */
import { reactive } from "vue"
import { defineStore, acceptHMRUpdate } from "pinia"

export const useCacheStore = defineStore("cache", () => {
	const qr = reactive({
		data: null,
		description: null,
		icon: null,
	})

	const chart = reactive({
		series: null,
		view: null,
	})

	const current = reactive({
		/** block */
		block: null,

		/** transaction */
		transaction: null,
		transactions: [],
		events: [],

		/** address */
		address: null,

		/** validators */
		validator: null,
		validators: [],
		
		/** validator blocks */
		validator_blocks: [],

		/** chart */
		chart: null,
	})

	const tx = reactive({
		target: null,
	})

	return { chart, current, qr, tx }
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useCacheStore, import.meta.hot))
}
