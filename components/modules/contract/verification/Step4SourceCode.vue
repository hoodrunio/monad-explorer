<script setup>
/** Components */
import Input from "@/components/ui/Input.vue"
import Button from "@/components/ui/Button.vue"
import Badge from "@/components/ui/Badge.vue"

/** Store */
import { useVerificationStore } from "@/store/verification.store"

const verificationStore = useVerificationStore()

const activeFile = ref(null)
const newFileName = ref('')
const showAddFile = ref(false)

const isStandardJson = computed(() => {
	return verificationStore.verificationMethod.includes('standard-json')
})

const sourceFilesList = computed(() => {
	return Object.keys(verificationStore.sourceFiles)
})

const handleAddFile = () => {
	if (!newFileName.value.trim()) return

	let filename = newFileName.value.trim()

	// Auto-add extension if not present
	if (!filename.includes('.')) {
		filename += verificationStore.verificationMethod.includes('vyper') ? '.vy' : '.sol'
	}

	verificationStore.addSourceFile(filename, '')
	activeFile.value = filename
	newFileName.value = ''
	showAddFile.value = false
}

const handleRemoveFile = (filename) => {
	// Switch to another file before removing if this is active
	if (activeFile.value === filename) {
		const currentIndex = sourceFilesList.value.indexOf(filename)
		const nextFile = sourceFilesList.value[currentIndex + 1] || sourceFilesList.value[currentIndex - 1]
		activeFile.value = nextFile || null
	}

	// Remove the file
	verificationStore.removeSourceFile(filename)
}

const handleFileUpload = (event) => {
	const files = event.target.files
	if (!files) return

	Array.from(files).forEach(file => {
		const reader = new FileReader()
		reader.onload = (e) => {
			verificationStore.addSourceFile(file.name, e.target.result)
			if (!activeFile.value) {
				activeFile.value = file.name
			}
		}
		reader.readAsText(file)
	})

	// Reset input
	event.target.value = ''
}

// Set first file as active on mount
onMounted(() => {
	if (sourceFilesList.value.length > 0 && !activeFile.value) {
		activeFile.value = sourceFilesList.value[0]
	}
})
</script>

<template>
	<Flex direction="column" gap="24" :class="$style.container">
		<!-- Header -->
		<Flex direction="column" gap="8">
			<Text size="16" weight="600" color="primary">Source Code</Text>
			<Text size="13" color="tertiary">
				{{ isStandardJson ? 'Provide the Standard JSON input' : 'Upload or paste your contract source code' }}
			</Text>
		</Flex>

		<!-- Standard JSON Input -->
		<Flex v-if="isStandardJson" direction="column" gap="12">
			<Flex align="center" justify="between">
				<Text size="13" weight="600" color="secondary">Standard JSON Input</Text>
				<Button type="tertiary" size="mini">
					<Icon name="upload" size="12" color="tertiary" />
					Load from File
				</Button>
			</Flex>

			<div :class="$style.jsonEditor">
				<textarea
					v-model="verificationStore.standardJsonInput"
					placeholder='{"language":"Solidity","sources":{"Contract.sol":{"content":"..."}},"settings":{"optimizer":{"enabled":true,"runs":200}}}'
					:class="$style.textarea"
					rows="15"
					spellcheck="false"
				/>
			</div>

			<Text size="11" color="tertiary">
				Paste the complete Standard JSON input from your compiler output (Hardhat/Foundry)
			</Text>
		</Flex>

		<!-- Multi-Part Source Files -->
		<Flex v-else direction="column" gap="16">
			<!-- File Tabs -->
			<Flex direction="column" gap="12">
				<Flex align="center" justify="between">
					<Text size="13" weight="600" color="secondary">Source Files</Text>
					<Flex align="center" gap="8">
						<label :class="$style.uploadButton">
							<input
								type="file"
								multiple
								accept=".sol,.vy"
								@change="handleFileUpload"
								:class="$style.fileInput"
							/>
							<Icon name="upload" size="12" color="tertiary" />
							<Text size="12" weight="600" color="tertiary">Upload Files</Text>
						</label>
						<Button
							type="tertiary"
							size="mini"
							@click="showAddFile = !showAddFile"
						>
							<Icon name="plus" size="12" color="tertiary" />
							Add File
						</Button>
					</Flex>
				</Flex>

				<!-- Add File Input -->
				<Flex v-if="showAddFile" align="center" gap="8" :class="$style.addFileRow">
					<Input
						v-model="newFileName"
						placeholder="Contract.sol"
						@keyup.enter="handleAddFile"
					/>
					<Button type="primary" size="small" @click="handleAddFile">
						Add
					</Button>
					<Button type="tertiary" size="small" @click="showAddFile = false">
						Cancel
					</Button>
				</Flex>

				<!-- File Tabs -->
				<Flex v-if="sourceFilesList.length > 0" gap="8" :class="$style.fileTabs">
					<div
						v-for="filename in sourceFilesList"
						:key="filename"
						:class="[
							$style.fileTab,
							activeFile === filename && $style.active
						]"
					>
						<Flex
							align="center"
							gap="8"
							:class="$style.fileTabContent"
							@click="activeFile = filename"
						>
							<Icon name="code" size="12" color="tertiary" />
							<Text size="12" weight="500" color="primary">{{ filename }}</Text>
						</Flex>
						<button
							:class="$style.removeButton"
							@click.stop="handleRemoveFile(filename)"
							title="Remove file"
							aria-label="Remove file"
						>
							<Icon
								name="close"
								size="12"
								color="tertiary"
							/>
						</button>
					</div>
				</Flex>

				<!-- Empty State -->
				<Flex v-else direction="column" align="center" gap="12" :class="$style.emptyState">
					<Icon name="code" size="32" color="tertiary" />
					<Text size="13" color="tertiary">No source files added yet</Text>
					<Text size="11" color="tertiary" align="center">
						Upload files or add them manually to continue
					</Text>
				</Flex>
			</Flex>

			<!-- Code Editor -->
			<Flex v-if="activeFile" direction="column" gap="8">
				<Flex align="center" justify="between">
					<Text size="12" weight="600" color="secondary">
						Editing: {{ activeFile }}
					</Text>
					<Badge type="gray">
						{{ verificationStore.sourceFiles[activeFile]?.length || 0 }} characters
					</Badge>
				</Flex>

				<div :class="$style.codeEditor">
					<textarea
						:value="verificationStore.sourceFiles[activeFile]"
						@input="verificationStore.updateSourceFile(activeFile, $event.target.value)"
						placeholder="// SPDX-License-Identifier: MIT&#10;pragma solidity ^0.8.0;&#10;&#10;contract MyContract {&#10;    // Your contract code here&#10;}"
						:class="$style.textarea"
						rows="20"
						spellcheck="false"
					/>
				</div>
			</Flex>
		</Flex>

		<!-- Libraries Section (for Solidity only) -->
		<Flex
			v-if="!isStandardJson && verificationStore.verificationMethod.includes('solidity')"
			direction="column"
			gap="12"
			:class="$style.librariesSection"
		>
			<Flex align="center" justify="between">
				<Flex direction="column" gap="4">
					<Text size="13" weight="600" color="secondary">Libraries (Optional)</Text>
					<Text size="11" color="tertiary">
						Link external library addresses if your contract uses them
					</Text>
				</Flex>
				<Button type="tertiary" size="mini">
					<Icon name="plus" size="12" color="tertiary" />
					Add Library
				</Button>
			</Flex>

			<!-- Library List (to be implemented) -->
			<Text v-if="Object.keys(verificationStore.libraries).length === 0" size="11" color="tertiary" align="center">
				No libraries added
			</Text>
		</Flex>

		<!-- Tips -->
		<Flex direction="column" gap="8" :class="$style.tips">
			<Flex align="center" gap="8">
				<Icon name="info" size="14" color="blue" />
				<Text size="12" weight="600" color="primary">Tips</Text>
			</Flex>
			<Flex direction="column" gap="6" :class="$style.tipsList">
				<Text size="11" color="tertiary">
					• For flattened contracts, include all dependencies in one file
				</Text>
				<Text size="11" color="tertiary">
					• SPDX license identifier is recommended but not required
				</Text>
				<Text size="11" color="tertiary">
					• Pragma version should match the compiler version selected
				</Text>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.container {
	padding: 24px;
	background: var(--card-background);
	border: 1px solid var(--border);
	border-radius: 12px;
}

.jsonEditor,
.codeEditor {
	border-radius: 8px;
	border: 1px solid var(--border);
	background: var(--op-3);
	overflow: hidden;
	transition: all 0.2s ease;
}

.jsonEditor:hover,
.codeEditor:hover {
	border-color: var(--op-15);
}

.jsonEditor:focus-within,
.codeEditor:focus-within {
	border-color: var(--brand);
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.textarea {
	width: 100%;
	padding: 16px;
	border: none;
	background: transparent;
	color: var(--txt-primary);
	font-size: 13px;
	font-family: 'Source Code Pro', monospace;
	line-height: 1.6;
	resize: vertical;
	outline: none;
}

.textarea::placeholder {
	color: var(--txt-tertiary);
}

.uploadButton {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 0 8px;
	height: 26px;
	border-radius: 6px;
	background: transparent;
	border: 1px solid var(--border);
	cursor: pointer;
	transition: all 0.2s ease;
}

.uploadButton:hover {
	background: var(--op-10);
}

.fileInput {
	display: none;
}

.addFileRow {
	padding: 12px;
	background: var(--op-3);
	border-radius: 8px;
}

.fileTabs {
	flex-wrap: wrap;
	padding: 8px;
	background: var(--op-3);
	border-radius: 8px;
	max-height: 200px;
	overflow-y: auto;
}

.fileTab {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 6px 6px 6px 12px;
	background: var(--card-background);
	border: 1px solid var(--border);
	border-radius: 6px;
	transition: all 0.2s ease;
	max-width: 200px;
}

.fileTab:hover {
	background: var(--op-5);
	border-color: var(--op-15);
}

.fileTab.active {
	background: rgba(59, 130, 246, 0.05);
	border-color: var(--brand);
}

.fileTabContent {
	flex: 1;
	cursor: pointer;
	padding: 2px 0;
}

.removeButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	padding: 0;
	border: none;
	background: var(--op-5);
	border-radius: 4px;
	cursor: pointer;
	transition: all 0.2s ease;
	flex-shrink: 0;
}

.removeButton:hover {
	background: rgba(239, 68, 68, 0.15);
}

.removeButton:hover :global(svg) {
	color: var(--red);
}

.removeButton:active {
	transform: scale(0.9);
}

.emptyState {
	padding: 60px 20px;
	background: var(--op-3);
	border-radius: 8px;
	border: 2px dashed var(--border);
}

.librariesSection {
	padding: 16px;
	background: var(--op-3);
	border: 1px solid var(--border);
	border-radius: 10px;
}

.tips {
	padding: 16px;
	background: rgba(59, 130, 246, 0.05);
	border: 1px solid rgba(59, 130, 246, 0.2);
	border-radius: 10px;
}

.tipsList {
	margin-left: 22px;
}

/* Custom Scrollbar */
.fileTabs::-webkit-scrollbar {
	height: 6px;
}

.fileTabs::-webkit-scrollbar-track {
	background: transparent;
}

.fileTabs::-webkit-scrollbar-thumb {
	background: var(--op-10);
	border-radius: 3px;
}

@media (max-width: 768px) {
	.container {
		padding: 16px;
	}

	.fileTab {
		max-width: 150px;
	}
}
</style>
