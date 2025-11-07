/**
 * CodeMirror Composable for Contract Source Code Display
 *
 * This composable handles the initialization and management of CodeMirror editor
 * for displaying contract source code with syntax highlighting.
 */
import { ref, onMounted, onUnmounted, watch } from "vue"
import { EditorView, basicSetup } from "codemirror"
import { EditorState } from "@codemirror/state"
import { javascript } from "@codemirror/lang-javascript"

/**
 * Custom theme for CodeMirror matching our design system
 */
const customTheme = EditorView.theme({
	"&": {
		backgroundColor: "var(--code-background)",
		color: "var(--txt-primary)",
		fontSize: "12px",
		fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
	},
	".cm-content": {
		caretColor: "var(--brand)",
		padding: "16px 0",
	},
	".cm-cursor, .cm-dropCursor": {
		borderLeftColor: "var(--brand)",
	},
	"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
		backgroundColor: "rgba(24, 210, 165, 0.2)",
	},
	".cm-activeLine": {
		backgroundColor: "rgba(255, 255, 255, 0.03)",
	},
	".cm-gutters": {
		backgroundColor: "rgba(0, 0, 0, 0.2)",
		color: "var(--code-line-number)",
		border: "none",
		paddingRight: "8px",
	},
	".cm-activeLineGutter": {
		backgroundColor: "rgba(255, 255, 255, 0.05)",
		color: "var(--txt-secondary)",
	},
	".cm-lineNumbers .cm-gutterElement": {
		minWidth: "40px",
		paddingRight: "12px",
		textAlign: "right",
	},
	".cm-scroller": {
		overflow: "auto",
		fontFamily: "inherit",
	},
	"&.cm-focused": {
		outline: "none",
	},
}, { dark: true })

/**
 * Syntax highlighting style overrides
 */
const highlightStyle = EditorView.theme({
	".cm-keyword": { color: "var(--editor-keyword)" },
	".cm-string": { color: "var(--editor-string)" },
	".cm-number": { color: "var(--editor-number)" },
	".cm-bool": { color: "var(--editor-boolean)" },
	".cm-comment": { color: "var(--txt-tertiary)", fontStyle: "italic" },
	".cm-variableName": { color: "var(--txt-primary)" },
	".cm-function": { color: "var(--blue)" },
	".cm-propertyName": { color: "var(--light-orange)" },
	".cm-operator": { color: "var(--txt-secondary)" },
	".cm-punctuation": { color: "var(--txt-secondary)" },
}, { dark: true })

/**
 * Main composable function
 *
 * @param {Object} options - Configuration options
 * @param {string} options.initialValue - Initial source code to display
 * @param {boolean} options.readOnly - Whether the editor is read-only (default: true)
 * @param {number} options.maxHeight - Maximum height in pixels
 * @returns {Object} - Editor instance and utility methods
 */
export function useCodeMirror(options = {}) {
	const {
		initialValue = "",
		readOnly = true,
		maxHeight = 600,
	} = options

	const editorView = ref(null)
	const editorElement = ref(null)
	const content = ref(initialValue)

	/**
	 * Initialize CodeMirror editor
	 */
	const initEditor = () => {
		if (!editorElement.value) return

		const extensions = [
			basicSetup,
			javascript(),
			customTheme,
			highlightStyle,
			EditorView.lineWrapping,
			EditorState.readOnly.of(readOnly),
			EditorView.theme({
				"&": {
					maxHeight: `${maxHeight}px`,
				},
				".cm-scroller": {
					overflow: "auto",
				},
			}),
		]

		const state = EditorState.create({
			doc: content.value,
			extensions,
		})

		editorView.value = new EditorView({
			state,
			parent: editorElement.value,
		})
	}

	/**
	 * Update editor content
	 */
	const updateContent = (newContent) => {
		if (!editorView.value) return

		const transaction = editorView.value.state.update({
			changes: {
				from: 0,
				to: editorView.value.state.doc.length,
				insert: newContent,
			},
		})

		editorView.value.dispatch(transaction)
		content.value = newContent
	}

	/**
	 * Get current editor content
	 */
	const getContent = () => {
		if (!editorView.value) return content.value
		return editorView.value.state.doc.toString()
	}

	/**
	 * Destroy editor instance
	 */
	const destroyEditor = () => {
		if (editorView.value) {
			editorView.value.destroy()
			editorView.value = null
		}
	}

	// Watch for content changes
	watch(() => options.initialValue, (newValue) => {
		if (newValue !== content.value) {
			updateContent(newValue)
		}
	})

	// Lifecycle hooks
	onMounted(() => {
		initEditor()
	})

	onUnmounted(() => {
		destroyEditor()
	})

	return {
		editorElement,
		editorView,
		content,
		updateContent,
		getContent,
		initEditor,
		destroyEditor,
	}
}
