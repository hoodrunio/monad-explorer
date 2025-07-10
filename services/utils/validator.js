/**
 * Validator Performance Data Utilities
 */

/**
 * Calculate effective score based on block proposal ratio only
 * Note: QC participation is now tracked separately as an additional metric
 * @param {Object} entry - Performance entry
 * @returns {number} - Effective score based on block proposals only
 */
export const getEffectiveScore = (entry) => {
	// If no block opportunities, return null to indicate no data available
	if (entry.blockOpportunities === 0) {
		return null
	}
	// Use block proposal ratio as the primary uptime metric
	return entry.blockProposalRatio || 0
}

/**
 * Calculate daily performance averages from hourly data
 * @param {Array} hourlyData - Array of hourly performance data
 * @returns {Array} - Array of daily performance summaries
 */
export const calculateDailyPerformance = (hourlyData) => {
	if (!Array.isArray(hourlyData) || hourlyData.length === 0) {
		return []
	}

	const dailyData = []
	// Reverse the history data since API returns oldest to newest, take all available data (up to 168 hours)
	const historyData = hourlyData.slice().reverse()
	
	// Group into up to 7 days (24 hours each), but handle cases where we have less data
	const maxDays = Math.min(7, Math.ceil(historyData.length / 24))
	for (let day = 0; day < maxDays; day++) {
		const dayStart = day * 24
		const dayEnd = Math.min(dayStart + 24, historyData.length)
		const dayHours = historyData.slice(dayStart, dayEnd).filter(h => h && !h.isEmpty)
		
		if (dayHours.length === 0) {
			// No data for this day - use current local time for date calculation
			const today = new Date()
			const dayDate = new Date(today)
			dayDate.setDate(today.getDate() - (maxDays - 1 - day))
			
			dailyData.push({
				day: day + 1,
				date: dayDate,
				avgUptimeScore: null,
				avgQcParticipationRate: 0,
				avgBlockProposalRatio: null,
				totalBlocksProposed: 0,
				totalQcParticipations: 0,
				totalBlockOpportunities: 0,
				totalQcOpportunities: 0,
				hoursWithData: 0,
				effectiveScore: null,
				isEmpty: true
			})
			continue
		}

		// Calculate averages for the day
		// For uptime score, only include hours with block opportunities
		const hoursWithScores = dayHours.filter(h => getEffectiveScore(h) !== null)
		const avgUptimeScore = hoursWithScores.length > 0 
			? hoursWithScores.reduce((sum, h) => sum + getEffectiveScore(h), 0) / hoursWithScores.length
			: null
		const avgQcParticipationRate = dayHours.reduce((sum, h) => sum + (h.qcParticipationRate || 0), 0) / dayHours.length
		
		// Calculate block proposal ratio average (only for hours with opportunities)
		const hoursWithBlockOpportunities = dayHours.filter(h => h.blockOpportunities > 0)
		const avgBlockProposalRatio = hoursWithBlockOpportunities.length > 0 
			? hoursWithBlockOpportunities.reduce((sum, h) => sum + (h.blockProposalRatio || 0), 0) / hoursWithBlockOpportunities.length
			: null

		// Calculate totals
		const totalBlocksProposed = dayHours.reduce((sum, h) => sum + (h.blocksProposed || 0), 0)
		const totalQcParticipations = dayHours.reduce((sum, h) => sum + (h.qcParticipations || 0), 0)
		const totalBlockOpportunities = dayHours.reduce((sum, h) => sum + (h.blockOpportunities || 0), 0)
		const totalQcOpportunities = dayHours.reduce((sum, h) => sum + (h.qcOpportunities || 0), 0)

		// Effective score is same as avgUptimeScore since both use getEffectiveScore
		const effectiveScore = avgUptimeScore

		// Calculate day date from the most recent hour in this day's data
		const recentHour = dayHours[dayHours.length - 1]
		let dayDate = new Date()
		
		if (recentHour && recentHour.hour) {
			// Try to parse the hour timestamp and get the date
			try {
				dayDate = convertUTCToLocal(recentHour.hour)
			} catch (error) {
				// Fallback to current date minus estimated days
				const today = new Date()
				dayDate = new Date(today)
				dayDate.setDate(today.getDate() - (maxDays - 1 - day))
			}
		} else {
			// Fallback to current date minus estimated days
			const today = new Date()
			dayDate = new Date(today)
			dayDate.setDate(today.getDate() - (maxDays - 1 - day))
		}

		dailyData.push({
			day: day + 1,
			date: dayDate,
			avgUptimeScore,
			avgQcParticipationRate,
			avgBlockProposalRatio,
			totalBlocksProposed,
			totalQcParticipations,
			totalBlockOpportunities,
			totalQcOpportunities,
			hoursWithData: dayHours.length,
			effectiveScore, // This is now the average of hourly effective scores
			isEmpty: false,
			// Keep reference to hourly data for detailed tooltips
			hourlyData: dayHours
		})
	}

	return dailyData
}

/**
 * Get performance color based on score
 * @param {number} score - Performance score (0-100)
 * @returns {string} - CSS color variable
 */
export const getPerformanceColor = (score) => {
	if (score >= 99) return 'var(--green)'
	if (score >= 95) return 'var(--brand)'
	if (score >= 90) return 'var(--yellow)'
	if (score >= 70) return 'var(--orange)'
	return 'var(--red)'
}

/**
 * Get performance opacity based on score
 * @param {number} score - Performance score (0-100)
 * @returns {number} - Opacity value (0-1)
 */
export const getPerformanceOpacity = (score) => {
	if (score >= 99) return 1
	if (score >= 95) return 0.9
	if (score >= 90) return 0.8
	if (score >= 70) return 0.7
	return 0.6
}

/**
 * Format percentage value
 * @param {number|null} value - Value to format
 * @returns {string} - Formatted percentage string
 */
export const formatPercentage = (value) => {
	if (value === null || value === undefined) return 'N/A'
	return `${value.toFixed(1)}%`
}

/**
 * Format day name for display
 * @param {Date} date - Date object
 * @returns {string} - Formatted day name
 */
export const formatDayName = (date) => {
	const today = new Date()
	const yesterday = new Date(today)
	yesterday.setDate(yesterday.getDate() - 1)
	
	if (date.toDateString() === today.toDateString()) {
		return 'Today'
	} else if (date.toDateString() === yesterday.toDateString()) {
		return 'Yesterday'
	} else {
		return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
	}
}

/**
 * Convert UTC timestamp to local time
 * @param {string} utcTimestamp - UTC timestamp string
 * @returns {Date} - Local Date object
 */
export const convertUTCToLocal = (utcTimestamp) => {
	if (!utcTimestamp) return new Date()
	
	try {
		// Handle different timestamp formats
		let utcDate
		if (utcTimestamp.includes('T')) {
			// ISO format: "2025-07-01T10:18:43.891Z"
			utcDate = new Date(utcTimestamp)
		} else {
			// SQL format: "2025-07-01 10:18:43.891"
			utcDate = new Date(utcTimestamp + 'Z') // Add Z to indicate UTC
		}
		
		return utcDate
	} catch (error) {
		return new Date()
	}
} 