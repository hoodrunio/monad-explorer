/**
 * Vendor
 */
import { ref, reactive } from "vue"
import { defineStore, acceptHMRUpdate } from "pinia"

export const useModalsStore = defineStore("modals", () => {
	const history = ref([])

	const lastModal = ref()
	const transactionData = ref(null)
	const modals = reactive({
		api: false,
		confirmation: false,
		awaiting: false,
		hexSettings: false,
		editBookmarkAlias: false,
		importBookmarks: false,
		rawData: false,
		constants: false,
		chart: false,
		qr: false,
		inputDecode: false,
		transactionResult: false,
	})

	const open = (target) => {
		if (!modals[target]) {
			lastModal.value = target
			modals[target] = true
		} else {
			modals[target] = false

			history.value = []
		}

		Object.keys(modals)
			.filter((m) => m !== target)
			.forEach((modal) => {
				if (modals[modal]) {
					if (!history.value.includes(modal)) {
						history.value.push(modal)
					}
					modals[modal] = false
				}
			})
	}

	const close = (target) => {
		if (!modals[target]) return

		modals[target] = false

		if (history.value.length) {
			const modalToRecover = history.value.pop()
			modals[modalToRecover] = true
			lastModal.value = modalToRecover
		}
	}

	const closeAll = () => {
		history.value = []

		Object.keys(modals).forEach((key) => {
			modals[key] = false
		})
	}

	const showTransactionResult = (transaction) => {
		transactionData.value = transaction
		open('transactionResult')
	}

	const updateTransactionResult = (transaction) => {
		// Only update if modal is already open
		if (modals.transactionResult) {
			transactionData.value = transaction
		}
	}

	return { history, lastModal, modals, transactionData, open, close, closeAll, showTransactionResult, updateTransactionResult }
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useModalsStore, import.meta.hot))
}
