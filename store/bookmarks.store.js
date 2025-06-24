/** Vendor */
import { defineStore, acceptHMRUpdate } from "pinia"

export const useBookmarksStore = defineStore("bookmarks", () => {
	const bookmarks = ref({
		txs: [],
		blocks: [],
		addresses: [],
	})

	const all = computed(() => {
		return [...bookmarks.value.txs, ...bookmarks.value.blocks, ...bookmarks.value.addresses]
	})

	const add = (item) => {
		const target = getTargetRef(item.type, item.data)

		if (target) {
			/** check if item already exist */
			if (target.value.filter((b) => b.data.hash === item.data.hash).length) return

			target.value.push(item)
		}
	}

	const remove = (item) => {
		const target = getTargetRef(item.type)

		if (target) {
			target.value.splice(
				target.value.findIndex((b) => b.data.hash === item.data.hash),
				1,
			)
		}
	}

	const updateAlias = ({ type, hash, alias }) => {
		const target = getTargetRef(type)

		target.value[target.value.findIndex((b) => b.data.hash === hash)].alias = alias
	}

	const getTargetRef = (type, data) => {
		switch (type) {
			case "transaction":
			case "tx":
				return bookmarks.value.txs

			case "block":
				return bookmarks.value.blocks

			case "address":
				return bookmarks.value.addresses

			default:
				return null
		}
	}

	/** utils */
	const getBookmarkByHash = (hash) => all.value.find((item) => item.data.hash === hash)

	const isBookmarked = (hash) => !!getBookmarkByHash(hash)

	const getById = (type) => {
		switch (type) {
			case "transaction":
			case "tx":
				return bookmarks.value.txs

			case "block":
				return bookmarks.value.blocks

			case "address":
				return bookmarks.value.addresses

			default:
				return null
		}
	}

	const getByType = (type) => {
		switch (type) {
			case "transaction":
			case "tx":
				return bookmarks.value.txs

			case "block":
				return bookmarks.value.blocks

			case "address":
				return bookmarks.value.addresses

			default:
				return []
		}
	}

	const exportBookmarks = () => {
		const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bookmarks.value))
		const downloadAnchorNode = document.createElement("a")
		downloadAnchorNode.setAttribute("href", dataStr)
		downloadAnchorNode.setAttribute("download", "bookmarks.json")
		document.body.appendChild(downloadAnchorNode)
		downloadAnchorNode.click()
		downloadAnchorNode.remove()
	}

	const importBookmarks = (data) => {
		bookmarks.value = data
	}

	return {
		bookmarks,
		all,
		add,
		remove,
		updateAlias,
		getBookmarkByHash,
		isBookmarked,
		getById,
		getByType,
		exportBookmarks,
		importBookmarks,
	}
}, {
	persist: true,
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useBookmarksStore, import.meta.hot))
}
