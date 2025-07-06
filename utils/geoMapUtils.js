// Simple country name mapping for common GeoJSON inconsistencies
export const normalizeCountryName = (countryName) => {
	const countryMappings = {
		"United States": "USA",
		"United Kingdom": "England",
		"The Netherlands": "Netherlands",
		"Czechia": "Czech Republic",
		"Czech Republic": "Czech Republic"
	}
	
	return countryMappings[countryName] || countryName
}

// Helper function to check if position is within screen bounds
export const isWithinBounds = (cardX, cardY, cardWidth, cardHeight, width, height) => {
	return cardX >= 10 && cardY >= 10 && 
		   cardX + cardWidth <= width - 10 && 
		   cardY + cardHeight <= height - 10
}

// Helper function to check if a position overlaps with existing ones
export const checkCollision = (cardX, cardY, usedPositions, minDistance) => {
	return usedPositions.some(pos => {
		const dx = Math.abs(pos.x - cardX)
		const dy = Math.abs(pos.y - cardY)
		return dx < minDistance && dy < minDistance
	})
}

// Calculate position coordinates for a given direction and distance
export const calculatePosition = (x, y, direction, distance, cardWidth, cardHeight) => {
	let endX, endY, cardX, cardY
	
	switch(direction) {
		case 'up':
			endX = x
			endY = y - distance
			cardX = x - cardWidth/2
			cardY = endY - cardHeight - 8
			break
		case 'down':
			endX = x
			endY = y + distance
			cardX = x - cardWidth/2
			cardY = endY + 8
			break
		case 'left':
			endX = x - distance
			endY = y
			cardX = endX - cardWidth - 8
			cardY = y - cardHeight/2
			break
		case 'right':
			endX = x + distance
			endY = y
			cardX = endX + 8
			cardY = y - cardHeight/2
			break
		case 'up-right':
			endX = x + distance * 0.7
			endY = y - distance * 0.7
			cardX = endX + 5
			cardY = endY - cardHeight - 5
			break
		case 'up-left':
			endX = x - distance * 0.7
			endY = y - distance * 0.7
			cardX = endX - cardWidth - 5
			cardY = endY - cardHeight - 5
			break
		case 'down-right':
			endX = x + distance * 0.7
			endY = y + distance * 0.7
			cardX = endX + 5
			cardY = endY + 5
			break
		case 'down-left':
			endX = x - distance * 0.7
			endY = y + distance * 0.7
			cardX = endX - cardWidth - 5
			cardY = endY + 5
			break
		default:
			endX = x + distance
			endY = y
			cardX = endX + 8
			cardY = y - cardHeight/2
			break
	}
	
	return { endX, endY, cardX, cardY }
}

// Get fallback direction based on screen position
export const getFallbackDirection = (x, y, width, height, index) => {
	let direction = 'right'
	
	// Prefer directions based on screen quadrant
	if (x < width * 0.25) direction = 'right'
	else if (x > width * 0.75) direction = 'left'
	else if (y < height * 0.25) direction = 'down'
	else if (y > height * 0.75) direction = 'up'
	else {
		// Distribute evenly in different directions
		const directions = ['up-right', 'right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up']
		direction = directions[index % directions.length]
	}
	
	return direction
}

// Calculate fallback position coordinates
export const calculateFallbackPosition = (x, y, direction, offsetDistance, cardWidth, cardHeight) => {
	let endX, endY, cardX, cardY
	
	if (direction.includes('-')) {
		// Diagonal directions
		const [dir1, dir2] = direction.split('-')
		const factor = 0.7
		endX = x + (dir2 === 'right' ? offsetDistance * factor : dir2 === 'left' ? -offsetDistance * factor : 0)
		endY = y + (dir1 === 'down' ? offsetDistance * factor : dir1 === 'up' ? -offsetDistance * factor : 0)
		
		cardX = endX + (dir2 === 'right' ? 8 : -cardWidth - 8)
		cardY = endY + (dir1 === 'down' ? 8 : -cardHeight - 8)
	} else {
		// Cardinal directions
		switch(direction) {
			case 'up':
				endX = x
				endY = y - offsetDistance
				cardX = x - cardWidth/2
				cardY = endY - cardHeight - 8
				break
			case 'down':
				endX = x
				endY = y + offsetDistance
				cardX = x - cardWidth/2
				cardY = endY + 8
				break
			case 'left':
				endX = x - offsetDistance
				endY = y
				cardX = endX - cardWidth - 8
				cardY = y - cardHeight/2
				break
			case 'right':
			default:
				endX = x + offsetDistance
				endY = y
				cardX = endX + 8
				cardY = y - cardHeight/2
				break
		}
	}
	
	return { endX, endY, cardX, cardY }
} 