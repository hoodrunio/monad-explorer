/** Services */
import { useServerURL } from "@/services/config"

export const fetchBlockByHeight = (height) => {
	try {
		const url = new URL(`${useServerURL()}/block/${height}`)

		return useFetch(encodeURI(url.href), {
			key: "block_by_height",
		})
	} catch (error) {
		console.error(error)
	}
} 