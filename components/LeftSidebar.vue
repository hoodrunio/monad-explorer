<script setup>
/** UI */
import Button from "@/components/ui/Button.vue"
import { Dropdown, DropdownItem, DropdownTitle, DropdownDivider } from "@/components/ui/Dropdown"

/** Components */
import AdvBanner from "@/components/shared/AdvBanner.vue"
import NavLink from "@/components/modules/navigation/NavLink.vue"

/** Utils */
import { getNetworkName } from "@/services/utils/general"
import { StatusMap } from "@/services/constants/node"
import { isMainnet, isMobile } from "@/services/utils"

/** API */
import { fetchHealthStatus } from "@/services/api/main"

/** Store */
import { useAppStore } from "@/store/app.store"
import { useNodeStore } from "@/store/node.store"
import { useModalsStore } from "@/store/modals.store"
const appStore = useAppStore()
const nodeStore = useNodeStore()
const modalsStore = useModalsStore()

const developerMode = useCookie("developerMode", { default: () => false })

// Health status data
const { data: healthData, pending: healthLoading, error: healthError } = await fetchHealthStatus()

const isHealthy = computed(() => {
	if (healthLoading.value || healthError.value) return false
	return healthData.value?.status === 'healthy'
})

const healthUptime = computed(() => {
	if (!healthData.value?.uptime) return 0
	// Convert seconds to hours
	return Math.floor(healthData.value.uptime / 3600)
})

const networkStatus = computed(() => {
	if (healthLoading.value) return 'Loading...'
	if (healthError.value) return 'Connection Error'
	return isHealthy.value ? 'Testnet Active' : 'Service Unavailable'
})

const mainLinks = reactive([
	{
		icon: "search",
		name: "Dashboard",
		path: "/",
	},
	{
		icon: "block",
		name: "Blocks",
		path: "/blocks",
	},
	{
		icon: "tx",
		name: "Transactions",
		path: "/transactions",
	},
	{
		icon: "validator",
		name: "Validators",
		path: "/validators",
		children: [
			{
				name: "All Validators",
				path: "/validators?window=7d&sortBy=uptime_score",
				icon: "validator",
				queryParam: { window: "7d" },
				show: true,
			},
			{
				name: "Top Performers",
				path: "/validators?window=7d&sortBy=uptime_score",
				queryParam: { sortBy: "uptime_score" },
				icon: "sort-desc",
				show: true,
			},
			{
				name: "QC Leaders",
				path: "/validators?window=7d&sortBy=qc_participation_rate",
				queryParam: { sortBy: "qc_participation_rate" },
				icon: "eye",
				show: true,
			},
		],
	},
	{
		icon: "activity",
		name: "Consensus",
		path: "/consensus",
	},
	{
		icon: "coins",
		name: "Staking",
		path: "/staking",
		children: [
			{
				name: "Overview",
				path: "/staking",
				icon: "bar-chart",
				show: true,
			},
			{
				name: "Validators",
				path: "/staking/validators",
				icon: "validator",
				show: true,
			},
			{
				name: "My Dashboard",
				path: "/staking/dashboard",
				icon: "user",
				show: true,
			},
		],
	},
	{
		icon: "bar-chart",
		name: "Analytics",
		path: "/stats",
		children: [
			{
				name: "Network Overview",
				path: "/stats?tab=network",
				queryParam: { tab: "network" },
				icon: "globe",
				show: true,
			},
			{
				name: "Validator Performance",
				path: "/stats?tab=validators",
				queryParam: { tab: "validators" },
				icon: "validator",
				show: true,
			},
			{
				name: "Geographic Distribution",
				path: "/stats?tab=geographic",
				queryParam: { tab: "geographic" },
				icon: "city",
				show: true,
			},
			{
				name: "Maps",
				path: "/stats?tab=ecosystem",
				queryParam: { tab: "ecosystem" },
				icon: "earth",
				show: true,
			},
		],
	},
])

const isNetworkLinksCollapsed = ref(false)
const networkLinks = reactive([
	{
		icon: "bookmark",
		name: "Bookmarks",
		path: "/bookmarks",
	},
])

const isToolsLinkCollapsed = ref(false)
const toolsLinks = reactive([
	{
		icon: "download",
		name: "Export Data",
		callback: () => {
			modalsStore.open("export")
		},
	},
	{
		icon: "settings",
		name: "Settings",
		callback: () => {
			modalsStore.open("settings")
		},
	},
])

/** TEMP */
watch(
	() => developerMode.value,
	() => {
		const terminalLinkIdx = toolsLinks.findIndex((l) => l.name === "Terminal")
		if (terminalLinkIdx >= 0) {
			toolsLinks[terminalLinkIdx].hide = !developerMode.value
		}
	},
)

const handleNavigate = (url) => {
	window.location.replace(url)
}

const handleOnClose = () => {
	appStore.showSidebar = false
}
</script>

<template>
	<Flex direction="column" gap="32" justify="between" :class="[$style.wrapper, appStore.showSidebar && $style.show]">
		<Flex direction="column" gap="32" :class="$style.content">
			<Flex justify="between" align="center">
				<NuxtLink to="/" :class="$style.logo">
					<Flex align="center" gap="8">
						<Icon name="validator" size="16" color="brand" :class="$style.logo_symbol" />

						<Flex direction="column" gap="2">
							<Text size="16" weight="600" color="primary">Monad Explorer</Text>
							<Flex align="center" gap="4" :class="$style.attribution">
								<Text size="11" weight="500" color="secondary">by</Text>
								<Text size="11" weight="600" color="primary" :class="$style.brand_text">Hood<span :class="$style.brand_green">Run</span></Text>
							</Flex>
						</Flex>
					</Flex>
				</NuxtLink>

				<ClientOnly>
					<Button
						v-if="isMobile()"
						@click="appStore.showSidebar = !appStore.showSidebar"
						type="secondary"
						size="mini"
						:class="$style.close_btn"
					>
						<Icon name="close" size="14" color="primary" />
					</Button>
				</ClientOnly>
			</Flex>

			<Flex direction="column" gap="2">
				<NavLink v-for="link in mainLinks.filter((l) => !l.hide)" :link="link" @onClose="handleOnClose" />
			</Flex>

			<Flex direction="column" gap="2">
				<Flex @click="isNetworkLinksCollapsed = !isNetworkLinksCollapsed" align="center" gap="4" :class="$style.group_title">
					<Text size="12" weight="500" color="tertiary">Network</Text>
					<Icon
						name="alt-arrow-down"
						size="12"
						color="tertiary"
						:style="{ transform: `rotate(${isNetworkLinksCollapsed ? '-90deg' : '0deg'})` }"
					/>
				</Flex>

				<Flex v-if="!isNetworkLinksCollapsed" direction="column" gap="2">
					<NavLink v-for="link in networkLinks.filter((l) => !l.hide)" :link="link" @onClose="handleOnClose" />
				</Flex>
			</Flex>

			<Flex direction="column" gap="2">
				<Flex @click="isToolsLinkCollapsed = !isToolsLinkCollapsed" align="center" gap="4" :class="$style.group_title">
					<Text size="12" weight="500" color="tertiary">Tools</Text>
					<Icon
						name="alt-arrow-down"
						size="12"
						color="tertiary"
						:style="{ transform: `rotate(${isToolsLinkCollapsed ? '-90deg' : '0deg'})` }"
					/>
				</Flex>

				<Flex v-if="!isToolsLinkCollapsed" direction="column" gap="2">
					<NavLink v-for="link in toolsLinks.filter((l) => !l.hide)" :link="link" @onClose="handleOnClose" />
				</Flex>
			</Flex>

			<AdvBanner />
		</Flex>

		<Flex direction="column" gap="16" style="margin-right: 20px">
			<Flex align="center" gap="8" justify="between" :class="$style.light_node_btn">
				<Flex align="center" gap="8">
					<Icon
						v-if="isHealthy"
						name="check-circle"
						size="14"
						color="brand"
						:class="$style.light_node_running_icon"
					/>
					<Icon v-else-if="healthLoading" name="refresh" size="14" color="secondary" />
					<Icon v-else name="close-circle" size="14" color="red" />

					<Text v-if="isHealthy" size="13" weight="600" color="primary">Service</Text>
					<Text size="13" weight="600" color="secondary">Status</Text>
				</Flex>

				<Icon v-if="!isHealthy && !healthLoading" name="arrow-narrow-right" size="14" color="secondary" />
				<Text v-else-if="isHealthy" size="12" weight="600" color="tertiary">{{ healthUptime }}h uptime</Text>
				<Text v-else size="12" weight="600" color="tertiary">...</Text>
			</Flex>

			<Dropdown position="end" fullWidth>
				<Flex align="center" gap="8" justify="between" :class="$style.network_selector">
					<Flex align="center" gap="8">
						<Icon name="globe" size="14" :color="isHealthy ? 'brand' : 'red'" />
						<Text size="13" weight="600" color="secondary">
							Network
						</Text>
					</Flex>

					<Icon name="chevron" size="14" color="secondary" />
				</Flex>

				<template #popup>
					<DropdownTitle>
						<Flex v-if="isHealthy" gap="8">
							<Icon name="check" size="12" color="brand" />
							<Flex direction="column" gap="6">
								<Text color="secondary">{{ networkStatus }}</Text>
								<Text color="tertiary">Monad Testnet</Text>
							</Flex>
						</Flex>
						<Flex v-else gap="8">
							<Icon name="close" size="12" color="red" />
							<Flex direction="column" gap="6">
								<Text color="secondary">{{ networkStatus }}</Text>
								<Text color="tertiary">Check connection</Text>
							</Flex>
						</Flex>
					</DropdownTitle>
					<DropdownDivider />
					<DropdownTitle>Network Selection</DropdownTitle>
					<DropdownItem>
						<Flex align="center" gap="8">
							<Icon name="check" size="12" color="brand" />
							<Flex direction="column" gap="4">
								<Text color="secondary">Monad Testnet</Text>
								<Text color="tertiary">Currently active network</Text>
							</Flex>
						</Flex>
					</DropdownItem>
					<DropdownItem disabled>
						<Flex align="center" gap="8">
							<Icon name="clock" size="12" color="tertiary" />
							<Flex direction="column" gap="4">
								<Text color="tertiary">Monad Mainnet</Text>
								<Text color="tertiary">Coming soon...</Text>
							</Flex>
						</Flex>
					</DropdownItem>
				</template>
			</Dropdown>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	position: sticky;
	top: 0;
	overflow-x: auto;

	user-select: none;

	min-width: 230px;
	max-width: 230px;
	max-height: calc(100vh);

	border-right: 1px solid var(--op-8);

	padding: 20px 0 20px 20px;

	&.show {
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;

		display: flex;

		background: var(--app-background);
		overflow: auto;

		z-index: 100;
	}
}

.content {
	margin-right: 20px;
}

.logo {
	padding: 0 8px;
}

.logo_symbol {
	box-sizing: content-box;
	cursor: pointer;
}

.logo_name {
	fill: var(--logo-name);
}

.close_btn {
	display: none;
}

.group_title {
	border-radius: 5px;
	cursor: pointer;

	padding: 6px 6px;
	margin: 0 2px;

	transition: all 0.2s ease;

	&:hover {
		background: var(--op-5);
	}
}

.light_node_btn {
	height: 32px;

	cursor: pointer;
	border-radius: 6px;
	background: var(--op-5);

	padding: 0 8px;

	transition: all 0.2s ease;

	&:hover {
		background: var(--op-8);
	}
}

.network_selector {
	height: 32px;

	cursor: pointer;
	border-radius: 6px;
	background: var(--op-5);

	padding: 0 8px;

	transition: all 0.2s ease;

	&:hover {
		background: var(--op-8);
	}
}

.ad {
	min-height: 120px;

	border-radius: 12px;
	background: rgba(0, 0, 0, 15%);
	box-shadow: inset 0 0 0 1px var(--op-5);

	padding: 12px;

	margin-right: 20px;
}

.attribution {
	opacity: 0.8;
	transition: opacity 0.2s ease;
}

.logo:hover .attribution {
	opacity: 1;
}

.brand_text {
	line-height: 1;
}

.brand_green {
	color: var(--green);
	font-weight: 600;
}

.light_node_running_icon {
	animation: lightNodeIcon 2s ease infinite;
}

@keyframes lightNodeIcon {
	0% {
		opacity: 1;
		filter: drop-shadow(0 0 8px var(--brand));
	}

	50% {
		opacity: 0.3;
		filter: drop-shadow(0 0 2px var(--brand));
	}

	100% {
		opacity: 1;
		filter: drop-shadow(0 0 8px var(--brand));
	}
}

@media (max-width: 1300px) {
	.wrapper:not(.show) {
		display: none;
	}

	.close_btn {
		display: flex;
	}
}

@media (max-width: 500px) {
	.wrapper {
		max-width: 100%;
	}
}
</style>
