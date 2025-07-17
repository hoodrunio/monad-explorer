import { isWithinBounds, checkCollision, calculatePosition, getFallbackDirection, calculateFallbackPosition } from './geoMapUtils.js'

// Global position tracking for collision detection
let globalUsedPositions = []

// Reset global positions (call before each chart build)
export const resetPositionTracking = () => {
	globalUsedPositions = []
}

// Advanced collision detection and positioning for countries
export const getArrowDirection = (centroid, index, total, countryName, width, height) => {
	const [x, y] = centroid
	const cardWidth = 80
	const cardHeight = 35
	const minDistance = 100 // Minimum distance between cards
	
	// Test multiple directions and distances for each country
	const possibleDirections = ['up', 'right', 'down', 'left', 'up-right', 'up-left', 'down-right', 'down-left']
	const possibleDistances = [45, 60, 80, 100, 120] // Try different distances
	
	// Try to find best position
	for (const distance of possibleDistances) {
		for (const direction of possibleDirections) {
			const { endX, endY, cardX, cardY } = calculatePosition(x, y, direction, distance, cardWidth, cardHeight)
			
			// Check if this position works
			if (isWithinBounds(cardX, cardY, cardWidth, cardHeight, width, height) && 
				!checkCollision(cardX, cardY, globalUsedPositions, minDistance)) {
				// Reserve this position
				globalUsedPositions.push({ x: cardX, y: cardY, width: cardWidth, height: cardHeight })
				return { endX, endY, cardX, cardY, direction, distance }
			}
		}
	}
	
	// Fallback: use original logic with increased distance
	const direction = getFallbackDirection(x, y, width, height, index)
	const offsetDistance = 50 + (index * 15) // Increase distance for each subsequent country
	
	const { endX, endY, cardX, cardY } = calculateFallbackPosition(x, y, direction, offsetDistance, cardWidth, cardHeight)
	
	// Reserve fallback position
	globalUsedPositions.push({ x: cardX, y: cardY, width: cardWidth, height: cardHeight })
	return { endX, endY, cardX, cardY, direction, distance: offsetDistance }
}

// Advanced collision detection for cities
export const getCityArrowDirection = (position, index, total, width, height) => {
	const { x, y } = position
	const cardWidth = 90
	const cardHeight = 30
	const cityMinDistance = 80 // Smaller minimum distance for cities
	
	// Test multiple directions and distances for cities
	const possibleDirections = ['up', 'right', 'down', 'left', 'up-right', 'up-left', 'down-right', 'down-left']
	const possibleDistances = [30, 40, 55, 70, 85] // Shorter distances for cities
	
	// Try to find best position for city
	for (const distance of possibleDistances) {
		for (const direction of possibleDirections) {
			const { endX, endY, cardX, cardY } = calculateCityPosition(x, y, direction, distance, cardWidth, cardHeight)
			
			// Check if this position works
			if (isWithinBounds(cardX, cardY, cardWidth, cardHeight, width, height) && 
				!checkCollision(cardX, cardY, globalUsedPositions, cityMinDistance)) {
				// Reserve this position
				globalUsedPositions.push({ x: cardX, y: cardY, width: cardWidth, height: cardHeight })
				return { endX, endY, cardX, cardY, direction, distance }
			}
		}
	}
	
	// Fallback for cities
	let direction = 'right'
	let offsetDistance = 40 + (index * 10)
	
	// Create a more distributed pattern for cities
	const distributionPattern = ['up', 'up-right', 'right', 'down-right', 'down', 'down-left', 'left', 'up-left']
	direction = distributionPattern[index % distributionPattern.length]
	
	// Adjust based on screen position
	if (x < width * 0.2) direction = index % 2 === 0 ? 'right' : 'up-right'
	else if (x > width * 0.8) direction = index % 2 === 0 ? 'left' : 'up-left'
	else if (y < height * 0.2) direction = index % 2 === 0 ? 'down' : 'down-right'
	else if (y > height * 0.8) direction = index % 2 === 0 ? 'up' : 'up-left'
	
	const { endX, endY, cardX, cardY } = calculateCityFallbackPosition(x, y, direction, offsetDistance, cardWidth, cardHeight)
	
	// Reserve fallback position
	globalUsedPositions.push({ x: cardX, y: cardY, width: cardWidth, height: cardHeight })
	return { endX, endY, cardX, cardY, direction, distance: offsetDistance }
}

// Calculate position coordinates specifically for cities
const calculateCityPosition = (x, y, direction, distance, cardWidth, cardHeight) => {
	let endX, endY, cardX, cardY
	
	switch(direction) {
		case 'up':
			endX = x
			endY = y - distance
			cardX = x - cardWidth/2
			cardY = endY - cardHeight - 5
			break
		case 'down':
			endX = x
			endY = y + distance
			cardX = x - cardWidth/2
			cardY = endY + 5
			break
		case 'left':
			endX = x - distance
			endY = y
			cardX = endX - cardWidth - 5
			cardY = y - cardHeight/2
			break
		case 'right':
			endX = x + distance
			endY = y
			cardX = endX + 5
			cardY = y - cardHeight/2
			break
		case 'up-right':
			endX = x + distance * 0.7
			endY = y - distance * 0.7
			cardX = endX + 3
			cardY = endY - cardHeight - 3
			break
		case 'up-left':
			endX = x - distance * 0.7
			endY = y - distance * 0.7
			cardX = endX - cardWidth - 3
			cardY = endY - cardHeight - 3
			break
		case 'down-right':
			endX = x + distance * 0.7
			endY = y + distance * 0.7
			cardX = endX + 3
			cardY = endY + 3
			break
		case 'down-left':
			endX = x - distance * 0.7
			endY = y + distance * 0.7
			cardX = endX - cardWidth - 3
			cardY = endY + 3
			break
		default:
			endX = x + distance
			endY = y
			cardX = endX + 5
			cardY = y - cardHeight/2
			break
	}
	
	return { endX, endY, cardX, cardY }
}

// Calculate fallback position coordinates for cities
const calculateCityFallbackPosition = (x, y, direction, offsetDistance, cardWidth, cardHeight) => {
	let endX, endY, cardX, cardY
	
	if (direction.includes('-')) {
		// Diagonal directions
		const [dir1, dir2] = direction.split('-')
		const factor = 0.7
		endX = x + (dir2 === 'right' ? offsetDistance * factor : dir2 === 'left' ? -offsetDistance * factor : 0)
		endY = y + (dir1 === 'down' ? offsetDistance * factor : dir1 === 'up' ? -offsetDistance * factor : 0)
		
		cardX = endX + (dir2 === 'right' ? 5 : -cardWidth - 5)
		cardY = endY + (dir1 === 'down' ? 5 : -cardHeight - 5)
	} else {
		// Cardinal directions
		switch(direction) {
			case 'up':
				endX = x
				endY = y - offsetDistance
				cardX = x - cardWidth/2
				cardY = endY - cardHeight - 5
				break
			case 'down':
				endX = x
				endY = y + offsetDistance
				cardX = x - cardWidth/2
				cardY = endY + 5
				break
			case 'left':
				endX = x - offsetDistance
				endY = y
				cardX = endX - cardWidth - 5
				cardY = y - cardHeight/2
				break
			case 'right':
			default:
				endX = x + offsetDistance
				endY = y
				cardX = endX + 5
				cardY = y - cardHeight/2
				break
		}
	}
	
	return { endX, endY, cardX, cardY }
}

// Generate arrow path based on direction
export const generateArrowPath = (direction, arrowX, arrowY, arrowSize) => {
	let arrowPath = ""
	
	switch(direction) {
		case 'up':
			arrowPath = `M${arrowX},${arrowY} L${arrowX-arrowSize/2},${arrowY+arrowSize} L${arrowX+arrowSize/2},${arrowY+arrowSize} Z`
			break
		case 'down':
			arrowPath = `M${arrowX},${arrowY} L${arrowX-arrowSize/2},${arrowY-arrowSize} L${arrowX+arrowSize/2},${arrowY-arrowSize} Z`
			break
		case 'left':
			arrowPath = `M${arrowX},${arrowY} L${arrowX+arrowSize},${arrowY-arrowSize/2} L${arrowX+arrowSize},${arrowY+arrowSize/2} Z`
			break
		case 'right':
			arrowPath = `M${arrowX},${arrowY} L${arrowX-arrowSize},${arrowY-arrowSize/2} L${arrowX-arrowSize},${arrowY+arrowSize/2} Z`
			break
		case 'up-right':
			arrowPath = `M${arrowX},${arrowY} L${arrowX-arrowSize*0.7},${arrowY+arrowSize*0.7} L${arrowX-arrowSize*0.3},${arrowY+arrowSize*0.3} L${arrowX+arrowSize*0.3},${arrowY-arrowSize*0.3} L${arrowX+arrowSize*0.7},${arrowY-arrowSize*0.7} Z`
			break
		case 'up-left':
			arrowPath = `M${arrowX},${arrowY} L${arrowX+arrowSize*0.7},${arrowY+arrowSize*0.7} L${arrowX+arrowSize*0.3},${arrowY+arrowSize*0.3} L${arrowX-arrowSize*0.3},${arrowY-arrowSize*0.3} L${arrowX-arrowSize*0.7},${arrowY-arrowSize*0.7} Z`
			break
		case 'down-right':
			arrowPath = `M${arrowX},${arrowY} L${arrowX-arrowSize*0.7},${arrowY-arrowSize*0.7} L${arrowX-arrowSize*0.3},${arrowY-arrowSize*0.3} L${arrowX+arrowSize*0.3},${arrowY+arrowSize*0.3} L${arrowX+arrowSize*0.7},${arrowY+arrowSize*0.7} Z`
			break
		case 'down-left':
			arrowPath = `M${arrowX},${arrowY} L${arrowX+arrowSize*0.7},${arrowY-arrowSize*0.7} L${arrowX+arrowSize*0.3},${arrowY-arrowSize*0.3} L${arrowX-arrowSize*0.3},${arrowY+arrowSize*0.3} L${arrowX-arrowSize*0.7},${arrowY+arrowSize*0.7} Z`
			break
		default:
			arrowPath = `M${arrowX},${arrowY} L${arrowX-arrowSize},${arrowY-arrowSize/2} L${arrowX-arrowSize},${arrowY+arrowSize/2} Z`
			break
	}
	
	return arrowPath
} 