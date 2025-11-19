<script setup>
/**
 * UI
 */
import Button from "@/components/ui/Button.vue"

/** Components */
import Search from "@/components/modules/navigation/Search.vue"

/** Utils */
import { isMobile } from "@/services/utils"
import { isMainnet } from "@/services/utils/general"

/** Store */
import { useAppStore } from "@/store/app.store"
const appStore = useAppStore()

/** Auth */
const { logout } = useAuth()
const showLogout = ref(false)

onMounted(() => {
	// Only show logout button on mainnet
	showLogout.value = isMainnet()
})
</script>

<template>
	<Flex wide align="center" justify="between" gap="24" :class="$style.wrapper">
		<Flex wide align="center" gap="12">
			<ClientOnly>
				<Button
					v-if="isMobile()"
					@click="appStore.showSidebar = !appStore.showSidebar"
					type="secondary"
					size="medium"
					:class="$style.menu_btn"
				>
					<Icon name="menu" size="16" color="primary" />
				</Button>
			</ClientOnly>

			<Search />
		</Flex>

		<Flex align="center" gap="12">
			<Button @click="appStore.showCmd = true" type="secondary" size="mini">
				<Icon name="terminal_square" size="16" color="secondary" />
			</Button>

			<ClientOnly>
				<Button v-if="showLogout" @click="logout" type="secondary" size="mini" title="Logout">
					<Icon name="logout" size="16" color="secondary" />
				</Button>
			</ClientOnly>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	padding: 12px 24px;
}

.menu_btn {
	display: none;
}

@media (max-width: 1300px) {
	.menu_btn {
		display: flex;
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 12px;
	}
}
</style>
