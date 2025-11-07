<script setup>
/** UI */
import Button from "@/components/ui/Button.vue"

/** Composables */
import { useCodeMirror } from "@/composables/useCodeMirror"

/** Services */
import { useClipboard } from "@vueuse/core"

const props = defineProps({
	sourceCode: {
		type: String,
		required: true,
		default: "",
	},
	contractName: {
		type: String,
		default: "Contract",
	},
	language: {
		type: String,
		default: "solidity",
	},
	maxHeight: {
		type: Number,
		default: 600,
	},
})

const emit = defineEmits(["download"])

const { copy, copied } = useClipboard({ source: props.sourceCode })

const { editorElement, content } = useCodeMirror({
	initialValue: props.sourceCode,
	readOnly: true,
	maxHeight: props.maxHeight,
})

/** Copy source code to clipboard */
const copySourceCode = async () => {
	await copy(props.sourceCode)
}

/** Download source code as file */
const downloadSourceCode = () => {
	const blob = new Blob([props.sourceCode], { type: "text/plain" })
	const url = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.href = url
	link.download = `${props.contractName}.sol`
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)

	emit("download")
}

/** Watch for source code changes */
watch(() => props.sourceCode, (newValue) => {
	if (editorElement.value && newValue !== content.value) {
		content.value = newValue
	}
})
</script>

<template>
	<Flex direction="column" gap="16" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="code" size="14" color="tertiary" />
				<Text size="14" weight="600" color="primary">{{ contractName }}</Text>
				<Flex align="center" gap="6" :class="$style.language">
					<div :class="$style.languageDot" />
					<Text size="11" weight="500" color="tertiary">{{ language }}</Text>
				</Flex>
			</Flex>

			<Flex align="center" gap="8">
				<Button @click="copySourceCode" type="secondary" size="small" :class="$style.actionButton">
					<Icon :name="copied ? 'check' : 'copy'" size="12" />
					{{ copied ? "Copied" : "Copy" }}
				</Button>
				<Button @click="downloadSourceCode" type="secondary" size="small" :class="$style.actionButton">
					<Icon name="download" size="12" />
					Download
				</Button>
			</Flex>
		</Flex>

		<!-- CodeMirror Editor -->
		<div ref="editorElement" :class="$style.editor" />

		<!-- Footer Info -->
		<Flex align="center" justify="between" :class="$style.footer">
			<Text size="11" color="tertiary">
				{{ sourceCode.split('\n').length }} lines • {{ (sourceCode.length / 1024).toFixed(2) }} KB
			</Text>
			<Flex align="center" gap="6">
				<div :class="$style.statusDot" />
				<Text size="11" color="tertiary">Read-only</Text>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	padding: 24px;
	background: var(--card-background);
	border: 1px solid var(--op-10);
	border-radius: 12px;
	transition: var(--transition-normal);
}

.wrapper:hover {
	border-color: var(--op-15);
}

.header {
	padding-bottom: 16px;
	border-bottom: 1px solid var(--op-08);
}

.language {
	padding: 4px 10px;
	background: var(--op-05);
	border-radius: 6px;
}

.languageDot {
	width: 6px;
	height: 6px;
	background: var(--green);
	border-radius: 50%;
}

.actionButton {
	min-width: 90px;
	justify-content: center;
	transition: var(--transition-normal);
}

.actionButton:hover {
	transform: translateY(-1px);
}

.editor {
	border-radius: 8px;
	overflow: hidden;
	border: 1px solid var(--border);
	background: var(--code-background);
	min-height: 400px;
}

.footer {
	padding-top: 12px;
	border-top: 1px solid var(--op-08);
}

.statusDot {
	width: 6px;
	height: 6px;
	background: var(--txt-tertiary);
	border-radius: 50%;
}

/* Mobile Responsive */
@media (max-width: 768px) {
	.wrapper {
		padding: 16px;
	}

	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}

	.actionButton {
		min-width: auto;
		flex: 1;
	}

	.footer {
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
	}
}
</style>
