import { DateTime } from "luxon"

/**
 * Format large stake numbers in compact scientific notation
 * Example: 5820000000000000000000000000000000 → "5.82e33"
 * @param {string|number} value - Stake value in wei
 * @returns {string} Formatted compact notation
 */
export const formatStakeCompact = (value) => {
	if (!value || value === "0") return "0"

	const num = typeof value === "string" ? parseFloat(value) : value

	if (isNaN(num)) return "0"

	// Convert to scientific notation
	const exp = Math.floor(Math.log10(Math.abs(num)))
	const mantissa = num / Math.pow(10, exp)

	// Format mantissa to 2 decimal places
	const formattedMantissa = mantissa.toFixed(2)

	return `${formattedMantissa}e${exp}`
}

/**
 * Format stake for full display in tooltips
 * @param {string|number} value - Stake value in wei
 * @returns {string} Formatted number with commas
 */
export const formatStakeFull = (value) => {
	if (!value || value === "0") return "0"

	const num = typeof value === "string" ? parseFloat(value) : value

	if (isNaN(num)) return "0"

	return num.toLocaleString("en-US", {
		maximumFractionDigits: 0,
	})
}

/**
 * Format percentage with 2 decimal places
 * @param {number} value - Percentage value (0-100)
 * @returns {string} Formatted percentage (e.g., "66.67%")
 */
export const formatPercentage = (value) => {
	if (value === null || value === undefined || isNaN(value)) return "N/A"

	return `${value.toFixed(2)}%`
}

/**
 * Get color based on quorum threshold
 * @param {number} percentage - Current percentage
 * @param {number} quorumThreshold - Quorum threshold (default 66.67)
 * @returns {string} Color name (danger/warning/success)
 */
export const getQuorumColor = (percentage, quorumThreshold = 66.67) => {
	if (percentage === null || percentage === undefined) return "tertiary"

	if (percentage < 50) return "red"
	if (percentage < quorumThreshold) return "yellow"
	return "green"
}

/**
 * Get relative time from timestamp
 * @param {string|number} timestamp - ISO timestamp or unix timestamp
 * @returns {string} Relative time (e.g., "2 seconds ago")
 */
export const getRelativeTime = (timestamp) => {
	if (!timestamp) return "N/A"

	try {
		const dt = typeof timestamp === "string"
			? DateTime.fromISO(timestamp)
			: DateTime.fromMillis(timestamp)

		return dt.toRelative() || "N/A"
	} catch (error) {
		return "N/A"
	}
}

/**
 * Get absolute time for tooltip
 * @param {string|number} timestamp - ISO timestamp or unix timestamp
 * @returns {string} Formatted absolute time
 */
export const getAbsoluteTime = (timestamp) => {
	if (!timestamp) return "N/A"

	try {
		const dt = typeof timestamp === "string"
			? DateTime.fromISO(timestamp)
			: DateTime.fromMillis(timestamp)

		return dt.toFormat("yyyy-MM-dd HH:mm:ss") + " UTC"
	} catch (error) {
		return "N/A"
	}
}

/**
 * Check if data is stale (more than threshold seconds old)
 * @param {string|number} lastUpdate - Last update timestamp
 * @param {number} thresholdSeconds - Threshold in seconds (default 10)
 * @returns {boolean} True if data is stale
 */
export const isDataStale = (lastUpdate, thresholdSeconds = 10) => {
	if (!lastUpdate) return true

	try {
		const dt = typeof lastUpdate === "string"
			? DateTime.fromISO(lastUpdate)
			: DateTime.fromMillis(lastUpdate)

		const now = DateTime.now()
		const diffSeconds = now.diff(dt, "seconds").seconds

		return diffSeconds > thresholdSeconds
	} catch (error) {
		return true
	}
}

/**
 * Format validator name with fallback
 * @param {string} validatorName - Validator name from API
 * @param {string} author - Author address as fallback
 * @returns {string} Formatted name
 */
export const formatValidatorName = (validatorName, author) => {
	if (validatorName && validatorName !== "unknown") {
		return validatorName
	}

	// Shorten author address to first 8 and last 6 characters
	if (author && author.length > 14) {
		return `${author.slice(0, 8)}...${author.slice(-6)}`
	}

	return author || "Unknown"
}

/**
 * Get quorum status text
 * @param {boolean} isQuorumReached - Whether quorum is reached
 * @param {number} remainingPercentage - Remaining percentage to reach quorum
 * @returns {string} Status text
 */
export const getQuorumStatusText = (isQuorumReached, remainingPercentage) => {
	if (isQuorumReached) {
		return "Reached"
	}

	if (remainingPercentage !== null && remainingPercentage !== undefined) {
		return `Remaining ${remainingPercentage.toFixed(2)}%`
	}

	return "Not Reached"
}

/**
 * Export table data to CSV
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions [{key, label}]
 * @param {string} filename - Output filename
 */
export const exportToCSV = (data, columns, filename) => {
	if (!data || data.length === 0) {
		return
	}

	// Create CSV header
	const header = columns.map(col => col.label).join(",")

	// Create CSV rows
	const rows = data.map(row => {
		return columns.map(col => {
			const value = row[col.key]

			// Escape commas and quotes
			if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
				return `"${value.replace(/"/g, '""')}"`
			}

			return value || ""
		}).join(",")
	})

	// Combine header and rows
	const csv = [header, ...rows].join("\n")

	// Create and trigger download
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
	const link = document.createElement("a")
	const url = URL.createObjectURL(blob)

	link.setAttribute("href", url)
	link.setAttribute("download", filename)
	link.style.visibility = "hidden"

	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}
