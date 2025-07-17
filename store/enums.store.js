/** Vendor */
import { defineStore, acceptHMRUpdate } from "pinia"

/** Constants */
import { defaultEnums } from "@/services/constants/enums.js"

export const useEnumStore = defineStore("enums", () => {
	const enums = ref({
		messageTypes: defaultEnums.message_type,
		rollupCategories: defaultEnums.categories,
		rollupTypes: defaultEnums.rollup_type,
		rollupTags: defaultEnums.tags,
	})

	const init = async () => {
		// No enums to fetch for Monad validator monitoring
		// Using default enums for backward compatibility
	}

	return { enums, init }
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useEnumStore, import.meta.hot))
}
