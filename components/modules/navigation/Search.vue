<script setup>
/** Vendor */
import { useDebounceFn } from "@vueuse/core"

/**
 * Composable
 */
import { useOutside } from "@/composables/outside"

/** UI */
import Spinner from "@/components/ui/Spinner.vue"

/** API */
import { search } from "@/services/api/search"

/** Services */
import { shortHex } from "@/services/utils"

const wrapperEl = ref()
const inputRef = ref()
const searchTerm = ref("")
const show = ref(false)

const results = ref([])

const handleClick = () => {
	show.value = true
	inputRef.value.focus()
}

onMounted(() => {
	document.addEventListener("keydown", (e) => {
		if (e.code === "Escape") {
			show.value = false
		}
		if (e.ctrlKey && e.code === "Slash" && !show.value) {
			e.preventDefault()
			show.value = true
			inputRef.value.focus()
		}
	})
})

let removeOutside
watch(
	() => show.value,
	() => {
		if (show.value) {
			removeOutside = useOutside(wrapperEl.value.wrapper, () => {
				show.value = false
			})
		} else {
			if (removeOutside) removeOutside()
		}
	},
)

const isSearching = ref(false)
const debouncedSearch = useDebounceFn(async () => {
	isSearching.value = true

	const { data } = await search(searchTerm.value.trim())
	if (data.value?.length) {
		results.value = data.value.map(res => {
			const metadata = getResultMetadata(res)
			return {
				...res,
				type: metadata.type,
				title: metadata.title,
				subtitle: metadata.subtitle,
				routerLink: metadata.routerLink,
			}
		})
	} else {
		results.value = []
	}

	isSearching.value = false
}, 250)

const handleInput = () => {
	results.value = []

	if (searchTerm.value.length) debouncedSearch()
}

const getResultMetadata = (target) => {
	let metadata = { type: null, title: null, subtitle: null, routerLink: null, iconUrl: null }

	switch (target.type.toLowerCase()) {
		case "tx":
		case "transaction":
			metadata.type = "tx"
			// For EVM transactions, display shortened hash
			if (target.result.alias) {
				metadata.title = target.result.alias
				metadata.subtitle = shortHex(target.result.hash)
			} else {
				metadata.title = shortHex(target.result.hash)
			}
			metadata.routerLink = `/tx/${target.bookmark ? target.result.id : target.result.hash}`
			break

		case "block":
			metadata.type = target.type
			// For EVM blocks, use number instead of height
			const blockId = target.result.number || target.result.height
			if (target.result.alias) {
				metadata.title = target.result.alias
				metadata.subtitle = `Block ${blockId}`
			} else {
				metadata.title = `Block ${blockId}`
			}
			metadata.routerLink = `/block/${target.bookmark ? target.result.id : blockId}`
			break

		case "namespace":
			metadata.type = target.type
			metadata.title = target.result.alias || target.result.hash
			metadata.routerLink = `/namespace/${target.bookmark ? target.result.id : target.result.namespace_id}`
			break

		case "address":
			metadata.type = target.type
			// For EVM addresses, display shortened address
			if (target.result.alias) {
				metadata.title = target.result.alias
				metadata.subtitle = shortHex(target.result.hash)
			} else {
				metadata.title = target.result.name || shortHex(target.result.hash)
				if (target.result.name) {
					metadata.subtitle = shortHex(target.result.hash)
				}
			}
			metadata.routerLink = `/address/${target.bookmark ? target.result.id : target.result.hash}`
			break

		case "contract":
			metadata.type = target.type
			// For contracts, display name if available
			if (target.result.alias) {
				metadata.title = target.result.alias
				metadata.subtitle = shortHex(target.result.address)
			} else {
				metadata.title = target.result.name || shortHex(target.result.address)
				if (target.result.name) {
					metadata.subtitle = shortHex(target.result.address)
				}
			}
			metadata.routerLink = `/address/${target.result.address}`
			break

		case "token":
			metadata.type = target.type
			// For tokens, display name and symbol
			metadata.title = target.result.name || "Unknown Token"
			if (target.result.symbol) {
				metadata.subtitle = `${target.result.symbol} · ${shortHex(target.result.address)}`
			} else {
				metadata.subtitle = shortHex(target.result.address)
			}
			metadata.iconUrl = target.result.icon_url
			metadata.routerLink = `/tokens/${target.result.address}`
			break

		case "rollup":
			metadata.type = target.type
			metadata.title = target.result.name
			metadata.routerLink = `/rollup/${target.result.slug}`
			break

		case "validator":
			metadata.type = target.type
			metadata.title = target.result.infrastructure?.validator_name || target.result.validator_id
			metadata.routerLink = `/validator/${target.result.validator_id}`
			break

		default:
			break
	}

	return metadata
}

watch(
	() => results.value,
	() => {
		if (results.value?.length) show.value = true
	},
)

const handleSelect = () => {
	show.value = false
	results.value = []
	searchTerm.value = ""
}
</script>

<template>
	<Flex ref="wrapperEl" wide :class="$style.wrapper">
		<Flex wide @click="handleClick" align="center" justify="between" gap="12" :class="$style.bar">
			<Flex wide align="center" gap="8">
				<Icon v-if="!isSearching" name="search" size="14" color="secondary" />
				<Spinner v-else size="14" />

				<input
					ref="inputRef"
					v-model="searchTerm"
					@input="handleInput"
					placeholder="Search validators, blocks, txs, addresses, contracts, tokens..."
					spellcheck="false"
					autocomplete="off"
					:class="$style.input_bar"
				/>
			</Flex>

			<Flex align="center" gap="4">
				<Text size="11" weight="700" color="tertiary" :class="$style.slash">Ctrl</Text>
				<Text size="11" weight="700" color="tertiary" :class="$style.slash">/ </Text>
			</Flex>
		</Flex>

		<Transition name="fastfade">
			<Flex v-if="show && results?.length" @click="handleSelect" direction="column" gap="6" :class="$style.popup">
				<template v-if="results?.length">
					<Text size="12" weight="600" color="tertiary">Results</Text>

					<Flex direction="column">
						<NuxtLink v-for="result in results" :to="result.routerLink">
							<Flex align="center" justify="between" gap="4" :class="$style.item">
								<Flex align="center" gap="8" :class="$style.title_wrapper">
									<img v-if="result.iconUrl" :src="result.iconUrl" :class="$style.token_icon" />
									<Icon v-else :name="result.type" size="12" color="tertiary" />
									<Flex direction="column" gap="2">
										<Text size="13" weight="600" color="primary" :class="$style.title">{{ result.title }}</Text>
										<Text v-if="result.subtitle" size="11" weight="500" color="tertiary" :class="$style.subtitle">
											{{ result.subtitle }}
										</Text>
									</Flex>
								</Flex>

								<Text size="13" weight="500" color="tertiary" style="text-transform: capitalize">{{ result.type }}</Text>
							</Flex>
						</NuxtLink>
					</Flex>
				</template>
			</Flex>
		</Transition>
	</Flex>
</template>

<style module>
.wrapper {
	max-width: 600px;

	position: relative;
}

.bar {
	height: 32px;

	border-radius: 6px;
	background: var(--op-5);
	cursor: text;

	padding: 0 6px 0 8px;

	transition: all 0.2s ease;

	&:hover {
		background: var(--op-8);
	}
}

.slash {
	background: var(--op-8);
	border-radius: 4px;

	padding: 2px 4px;
}

.popup {
	position: absolute;
	max-width: 600px;
	max-height: 400px;
	overflow-y: auto;
	top: calc(100% + 10px);
	left: 0;
	right: 0;
	z-index: 1000;

	background: var(--card-background);
	border-radius: 8px;
	box-shadow: inset 0 0 0 1px var(--op-5), 0 2px 8px rgba(0, 0, 0, 15%);

	padding: 12px;
}

.input_bar {
	all: unset;

	width: 100%;

	font-size: 13px;
	line-height: 1;
	font-weight: 500;
	color: var(--txt-primary);
}

.token_icon {
	width: 16px;
	height: 16px;
	border-radius: 50%;
	object-fit: cover;
	flex-shrink: 0;
}

.item {
	min-height: 36px;

	border-radius: 6px;
	cursor: pointer;

	padding: 6px;
	margin-left: -6px;

	transition: all 0.2s ease;

	&:hover {
		background: var(--op-5);
	}

	.title_wrapper {
		width: 90%;
		min-width: 0;

		.title {
			max-width: 100%;
			text-overflow: ellipsis;
			overflow: hidden;
			white-space: nowrap;
		}

		.subtitle {
			max-width: 100%;
			text-overflow: ellipsis;
			overflow: hidden;
			white-space: nowrap;
			font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		}
	}
}

@media (max-width: 800px) {
	.wrapper {
		position: relative;
	}

	.popup {
		max-width: initial;
		max-height: 50vh;

		left: 12px;
		right: 12px;
	}

	.item {
		.title_wrapper {
			width: 70%;
		}
	}
}
</style>
