<script setup>
/** UI */
import { Dropdown, DropdownItem, DropdownTitle } from "@/components/ui/Dropdown"

/** Services */
import { isPrefersDarkScheme } from "@/services/utils"

/** Store */
import { useAppStore } from "@/store/app.store"
const appStore = useAppStore()

const theme = useCookie("theme", { default: () => "dark" })
switch (theme.value) {
	case "dark":
	case "dimmed":
	case "light":
		appStore.theme = theme.value

		break

	case "system":
		appStore.theme = "system"

		break
}

onMounted(() => {
	let root = document.querySelector("html")

	if (appStore.theme === "system") {
		root.setAttribute("theme", isPrefersDarkScheme() ? "dark" : "light")
	} else {
		root.setAttribute("theme", appStore.theme)
	}
})

watch(
	() => appStore.theme,
	() => {
		if (appStore.theme === "system") {
			window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
				root.setAttribute("theme", isPrefersDarkScheme() ? "dark" : "light")
			})
		}
	},
)

const handleChangeTheme = (target) => {
	const root = document.querySelector("html")

	root.setAttribute("theme", target)
	appStore.theme = target
	theme.value = target
}
</script>

<template>
	<Flex justify="center" :class="$style.wrapper">
		<Flex wide :class="$style.container">
			<Flex wide justify="between" :class="$style.main">
				<Flex>
					<Flex direction="column" gap="24" :class="$style.left">
						<NuxtLink to="/" :class="$style.logo">
							<Flex align="center" gap="8">
								<Icon name="logo" size="16" color="secondary" :class="$style.logo_symbol" />

								<Flex direction="column" gap="2">
									<Text size="14" weight="600" color="primary">Monad Explorer</Text>
									<Flex align="center" gap="4" :class="$style.brand_attribution">
										<Text size="10" weight="500" color="secondary">by</Text>
										<Text size="10" weight="600" color="primary" :class="$style.brand_text">Hood<span style="color: var(--green); font-weight: 600;">Run</span></Text>
									</Flex>
								</Flex>
							</Flex>
						</NuxtLink>

						<Flex align="center" gap="8" :class="$style.socials">
							<a href="https://twitter.com/hoodrunio" target="_blank">
								<Icon name="twitter" size="14" color="tertiary" />
							</a>
							<a href="https://github.com/hoodrunio" target="_blank">
								<Icon name="github" size="14" color="tertiary" />
							</a>
						</Flex>
					</Flex>

					<Flex wrap="wrap" :class="$style.content">
						<Flex direction="column" gap="16">
							<Text size="13" weight="600" color="secondary"> Community </Text>

							<Flex direction="column" gap="8">
								<a href="https://twitter.com/hoodrunio" target="_blank">
									<Text size="12" weight="500" color="tertiary"> Twitter </Text>
								</a>
								<a href="https://github.com/hoodrunio" target="_blank">
									<Text size="12" weight="500" color="tertiary"> GitHub </Text>
								</a>
							</Flex>
						</Flex>

						<Flex direction="column" gap="16">
							<Text size="13" weight="600" color="secondary"> Network </Text>

							<Flex direction="column" gap="8">
								<NuxtLink to="/">
									<Text size="12" weight="500" color="tertiary"> Mainnet </Text>
								</NuxtLink>
								<NuxtLink to="https://testnet.monad.hoodscan.io">
									<Text size="12" weight="500" color="tertiary"> Testnet </Text>
								</NuxtLink>
							</Flex>
						</Flex>

						<Flex direction="column" gap="16">
							<Text size="13" weight="600" color="secondary"> Resources </Text>

							<Flex direction="column" gap="8">
								<NuxtLink to="/terms-of-use" target="_blank">
									<Text size="12" weight="500" color="tertiary"> Terms of Use </Text>
								</NuxtLink>
								<NuxtLink to="/privacy-policy" target="_blank">
									<Text size="12" weight="500" color="tertiary"> Privacy Policy </Text>
								</NuxtLink>
								<NuxtLink to="https://docs.monad.xyz" target="_blank">
									<Text size="12" weight="500" color="tertiary"> Documentation </Text>
								</NuxtLink>
							</Flex>
						</Flex>

						<Flex direction="column" gap="16">
							<Text size="13" weight="600" color="secondary"> Balance </Text>

							<Flex align="center" gap="6">
								<a href="https://monad.hoodscan.io/address/0x1234567890123456789012345678901234567890" target="_blank">
									<Text size="12" weight="600" color="secondary"> MON </Text>
								</a>
							</Flex>
						</Flex>
					</Flex>
				</Flex>

					<Dropdown side="top">
						<Flex align="center" gap="6" :class="$style.btn">
							<Icon
								:name="
									appStore.theme
										? (appStore.theme === 'system' && 'settings') ||
										  (appStore.theme === 'light' && 'sun') ||
										  (['dark', 'dimmed'].includes(appStore.theme) && 'moon')
										: ''
								"
								size="12"
								color="secondary"
							/>
							<Text size="12" weight="600" color="secondary" :style="{ textTransform: 'capitalize' }">
								{{ appStore.theme }}
							</Text>
						</Flex>

						<template #popup>
							<DropdownTitle>Theme</DropdownTitle>
							<DropdownItem @click="handleChangeTheme('dimmed')">Dimmed</DropdownItem>
							<DropdownItem @click="handleChangeTheme('dark')">Dark</DropdownItem>
							<DropdownItem @click="handleChangeTheme('light')">Light</DropdownItem>
							<DropdownItem @click="handleChangeTheme('system')">System</DropdownItem>
						</template>
					</Dropdown>
				</Flex>
		</Flex>
	</Flex>

	<Flex justify="center" :class="$style.bottom">
		<Flex wide align="center" gap="20" justify="between" :class="$style.bottom_container">
			<Flex align="center" gap="20">
				<NuxtLink to="/terms-of-use" style="line-height: 12px">
					<Text size="12" weight="500" color="tertiary">Terms of use</Text>
				</NuxtLink>

				<NuxtLink to="/privacy-policy" style="line-height: 12px">
					<Text size="12" weight="500" color="tertiary">Privacy policy</Text>
				</NuxtLink>
			</Flex>

			<Flex align="center">
				<Text size="12" weight="500" color="secondary" :class="$style.attribution">
					UI based on the open-source 
					<a href="https://github.com/celenium-io/celenium-interface" target="_blank" rel="noopener noreferrer" :class="$style.attribution_link">
						Celenium Interface
					</a>
					(MIT Licensed). Modified and reused for Monad Explorer.
				</Text>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	border-top: 2px solid var(--op-5);
}

.container {
	max-width: 1260px;

	padding: 32px 20px 80px 0;
}

.content {
	gap: 80px;

	padding: 0 24px;

	& a {
		line-height: 12px;
	}
}

.left {
	width: 230px;

	padding-left: 20px;
}

.socials {
	& a {
		display: flex;
	}
}

.btn {
	max-height: 24px;

	box-sizing: content-box;
	border-radius: 5px;
	background: var(--op-8);
	cursor: pointer;

	padding: 6px;

	transition: all 0.2s ease;

	& a {
		display: flex;
	}

	&:hover {
		background: var(--op-10);
	}

	&:active {
		background: var(--op-15);
	}
}

.logo {
}

.logo_symbol {
	box-sizing: content-box;
	cursor: pointer;
}

.logo_name {
	fill: var(--txt-secondary);
}

.bottom {
	background: var(--op-3);

	padding: 12px 0;
}

.bottom_container {
	max-width: 1260px;

	padding: 0 20px;
}

.link_text {
	transition: all 0.2s ease;

	&:hover {
		color: var(--txt-primary);
	}
}

@media (max-width: 1300px) {
	.container {
		max-width: 1030px;
	}
}

.attribution {
	text-align: right;
	line-height: 1.4;
	padding: 8px 12px;
	background: var(--op-5);
	border-radius: 6px;
	border: 1px solid var(--op-8);
}

.attribution_link {
	color: var(--txt-primary);
	text-decoration: underline;
	font-weight: 600;
	transition: all 0.2s ease;

	&:hover {
		color: var(--brand);
		text-decoration: underline;
		text-decoration-thickness: 2px;
	}
}

@media (max-width: 700px) {
	.main {
		flex-direction: column;
		align-items: center;
		gap: 60px;
	}

	.content {
		justify-content: center;
	}

	.main > div {
		flex-direction: column;
		align-items: center;
		gap: 60px;
	}

	.left {
		align-items: center;
	}

	.bottom_container {
		flex-direction: column;
		gap: 12px;
	}

	.brand_attribution {
		opacity: 0.8;
		transition: opacity 0.2s ease;
	}

	.logo:hover .brand_attribution {
		opacity: 1;
	}

	.brand_text {
		line-height: 1;
	}

	.brand_green {
		color: var(--green);
		font-weight: 600;
	}
}
</style>
