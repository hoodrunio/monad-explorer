/** Services */
import { useServerURL } from "@/services/config"

export const fetchEpochInfo = async () => {
	try {
		const url = new URL(`${useServerURL()}/api/v2/epoch/info`)

		const data = await $fetch(url.href)
		return { data: ref(data) }
	} catch (error) {
		return { data: ref(null) }
	}
} 