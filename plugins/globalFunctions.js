/** Services */
import { comma, shortHash, splitAddress } from "@/services/utils"

export default defineNuxtPlugin(() => {
	return {
		provide: {
			comma,
			shortHash,
			splitAddress,
		},
	}
})
