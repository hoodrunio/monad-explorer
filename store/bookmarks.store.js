/** Vendor */
import { defineStore, acceptHMRUpdate } from "pinia"

export const useBookmarksStore = defineStore("bookmarks", () => {
	const bookmarks = ref({
		txs: [],
		blocks: [],
		addresses: [],
		validators: [],
	})

	const all = computed(() => {
		return [...bookmarks.value.txs, ...bookmarks.value.blocks, ...bookmarks.value.addresses, ...bookmarks.value.validators]
	})

	const hasBookmarks = computed(() => {
		return bookmarks.value.txs.length > 0 || 
			   bookmarks.value.blocks.length > 0 || 
			   bookmarks.value.addresses.length > 0 || 
			   bookmarks.value.validators.length > 0
	})

	const add = (item) => {
		const target = getTargetRef(item.type, item.data)

		if (target) {
			/** check if item already exist */
			if (target.filter((b) => b.data?.hash === item.data?.hash || b.id === item.id).length) return

			target.push(item)
		}
	}

	const addBookmark = (bookmark) => {
		const target = getTargetRef(bookmark.type)

		if (target) {
			/** check if item already exist */
			if (target.filter((b) => b.id === bookmark.id).length) return false

			target.push(bookmark)
			return true
		}
		return false
	}

	const remove = (item) => {
		const target = getTargetRef(item.type)

		if (target) {
			target.splice(
				target.findIndex((b) => b.data?.hash === item.data?.hash || b.id === item.id),
				1,
			)
		}
	}

	const removeBookmark = (type, id) => {
		const target = getTargetRef(type)

		if (target) {
			const index = target.findIndex((b) => b.id === id)
			if (index >= 0) {
				target.splice(index, 1)
				return true
			}
		}
		return false
	}

	const getBookmark = (type, id) => {
		const target = getTargetRef(type)
		if (target) {
			return target.find((b) => b.id === id)
		}
		return null
	}

	const updateAlias = ({ type, hash, alias }) => {
		const target = getTargetRef(type)

		target[target.findIndex((b) => b.data?.hash === hash || b.id === hash)].alias = alias
	}

	const clearBookmarks = () => {
		bookmarks.value.txs = []
		bookmarks.value.blocks = []
		bookmarks.value.addresses = []
		bookmarks.value.validators = []
	}

	const searchBookmarks = (query) => {
		if (!query) return []
		
		const results = []
		const lowerQuery = query.toLowerCase()

		// Search through all bookmark types
		Object.keys(bookmarks.value).forEach(type => {
			bookmarks.value[type].forEach(bookmark => {
				const matchesAlias = bookmark.alias && bookmark.alias.toLowerCase().includes(lowerQuery)
				const matchesId = bookmark.id && bookmark.id.toString().toLowerCase().includes(lowerQuery)
				
				if (matchesAlias || matchesId) {
					results.push({
						type: type.slice(0, -1), // Remove 's' from end (txs -> tx, validators -> validator)
						result: {
							...bookmark,
							hash: bookmark.id, // For compatibility
						},
						bookmark: true,
					})
				}
			})
		})

		return results
	}

	const getTargetRef = (type, _) => {
		switch (type.toLowerCase()) {
			case "transaction":
			case "tx":
				return bookmarks.value.txs

			case "block":
				return bookmarks.value.blocks

			case "address":
				return bookmarks.value.addresses

			case "validator":
				return bookmarks.value.validators

			default:
				return null
		}
	}

	/** utils */
	const getBookmarkByHash = (hash) => all.value.find((item) => item.data?.hash === hash || item.id === hash)

	const isBookmarked = (hash) => !!getBookmarkByHash(hash)

	const getById = (type) => {
		switch (type.toLowerCase()) {
			case "transaction":
			case "tx":
				return bookmarks.value.txs

			case "block":
				return bookmarks.value.blocks

			case "address":
				return bookmarks.value.addresses

			case "validator":
				return bookmarks.value.validators

			default:
				return null
		}
	}

	const getByType = (type) => {
		switch (type.toLowerCase()) {
			case "transaction":
			case "tx":
				return bookmarks.value.txs

			case "block":
				return bookmarks.value.blocks

			case "address":
				return bookmarks.value.addresses

			case "validator":
				return bookmarks.value.validators

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
		hasBookmarks,
		add,
		addBookmark,
		remove,
		removeBookmark,
		getBookmark,
		updateAlias,
		clearBookmarks,
		searchBookmarks,
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
