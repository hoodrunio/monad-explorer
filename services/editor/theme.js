/**
 * Vendor
 */
import { tags as t } from "@lezer/highlight"

/**
 * Local
 */
import { createTheme } from "./creator"

export const customViewerTheme = createTheme({
	styles: [
		{
			tag: t.comment,
			color: "var(--txt-tertiary)",
		},
		{
			tag: t.bracket,
			color: "var(--txt-support)",
		},
		{
			tag: [t.string, t.special(t.brace)],
			color: "var(--editor-string)",
		},
		{
			tag: [t.number, t.self, t.null],
			color: "var(--editor-number)",
		},
		{
			tag: t.bool,
			color: "var(--editor-boolean)",
		},
		{
			tag: [t.keyword, t.propertyName],
			color: "var(--editor-keyword)",
		},
		{
			tag: [t.definitionKeyword, t.typeName],
			color: "#DCBDFB",
		},
		{
			tag: t.definition(t.typeName),
			color: "#f8f8f2",
		},
		{
			tag: [t.className, t.definition(t.propertyName), t.function(t.variableName), t.attributeName],
			color: "#F2994A",
		},
	],
})
