<script setup>
/** Vendor */
import * as d3 from "d3"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

/** API */
import { fetchGeographicDistribution, fetchNetworkTopology } from "@/services/api/main"

/** Geocoding Service */
import { batchGetLocationCoordinates, extractCountryFromLocation } from "@/services/api/geocoding"

// Fetch data at the top level using proper composables
const { data: geographicData, pending: geoPending, error: geoError } = fetchGeographicDistribution()
const { data: topologyData, pending: topologyPending, error: topologyError } = fetchNetworkTopology()

const isLoading = computed(() => geoPending.value || topologyPending.value)
const hasError = computed(() => geoError.value || topologyError.value)
const geoMap = ref()
const validatorLocationData = ref([])
const chartView = ref("countries")
const showValidatorLabels = ref(true)

const handleChangeChartView = () => {
	if (chartView.value === "countries") {
		chartView.value = "cities"
	} else {
		chartView.value = "countries"
	}
}

const toggleValidatorLabels = () => {
	showValidatorLabels.value = !showValidatorLabels.value
}

// Simple country name mapping for common GeoJSON inconsistencies
const normalizeCountryName = (countryName) => {
	const countryMappings = {
		"United States": "USA",
		"United Kingdom": "England",
		"The Netherlands": "Netherlands",
		"Czechia": "Czech Republic",
		"Czech Republic": "Czech Republic"
	}
	
	return countryMappings[countryName] || countryName
}

const chartEl = ref()

const buildChart = async (chart) => {
	const { height, width } = chart.getBoundingClientRect()

	// Map and projection
	const projection = d3
		.geoMercator()
		.center([0, 40])
		.scale(width * 0.15)
		.translate([width / 2, height / 2])

	const countryMaxAmount = d3.max(geoMap.value, (d) => +d.amount)
	const countryColor = d3.scaleSequential(d3.piecewise(d3.interpolateRgb, ["#1e473d", "#18d2a5"])).domain([1, countryMaxAmount])

	const size = d3
		.scaleSqrt()
		.domain(d3.extent(validatorLocationData.value, (d) => +d.amount))
		.range([4, 20])

	const path = d3.geoPath().projection(projection)
	let zoomScale = 1

	/** SVG Container */
	const svg = d3.create("svg").attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height])

	// Add custom styles for labels
	const defs = svg.append("defs")
	const filter = defs.append("filter")
		.attr("id", "label-shadow")
		.attr("x", "-50%")
		.attr("y", "-50%")
		.attr("width", "200%")
		.attr("height", "200%")

	filter.append("feDropShadow")
		.attr("dx", 0)
		.attr("dy", 2)
		.attr("stdDeviation", 3)
		.attr("flood-color", "rgba(0,0,0,0.3)")

	// Tooltip
	const container = document.createElement("div")
	container.innerHTML = `
        <style>
            .tooltip {
                font-size: 13px;
                background: var(--card-background);
                pointer-events: none;
                border-radius: 6px;
                box-shadow: inset 0 0 0 1px var(--op-5), 0 14px 34px rgba(0, 0, 0, 15%), 0 4px 14px rgba(0, 0, 0, 5%);
                padding: 4px 8px 4px 8px;
                position: absolute;
                top: 10px;
                left: 10px;
                z-index: 1;
                display: none;
            }
        </style>
        <div class="tooltip"></div>
    `
	container.appendChild(svg.node())
	document.body.appendChild(container)

	const tooltip = container.querySelector(".tooltip")
	const mouseover = function (d) {
		tooltip.style.opacity = 1
	}
	const mousemove = function (event, d) {
		const { pageX, pageY } = event
		tooltip.style.display = "block"
		tooltip.style.left = `${pageX + 10}px`
		tooltip.style.top = `${pageY - 20}px`

		if (chartView.value === "countries") {
			tooltip.innerHTML = `
                <div class="flex items-center gap--8">
                    <span style="color: var(--txt-secondary);">${d.properties.name}:</span>
                    <span style="color: var(--txt-primary);">${d.amount} validators</span>
                </div>
            `
		} else if (chartView.value === "cities") {
			tooltip.innerHTML = `
                <div class="flex items-center gap--8">
                    <span style="color: var(--txt-secondary);">${d.name}:</span>
                    <span style="color: var(--txt-primary);">${d.amount} validators</span>
                </div>
            `
		}
	}
	const mouseleave = function (event, d) {
		tooltip.style.opacity = 0
	}

	// Main container
	const g = svg.append("g")

	// Draw the map
	const map = g
		.append("g")
		.selectAll("path")
		.data(geoMap.value)
		.enter()
		.append("path")
		.attr("stroke", "var(--geo-map)")
		.attr("stroke-width", 1)
		.attr("fill", "transparent")
		.attr("d", d3.geoPath().projection(projection))

	let cities, labels
	if (chartView.value === "countries") {
		map.on("mouseover", function (event, d) {
			d3.select(this)
				.transition()
				.duration(200)
				.attr("stroke", "var(--brand)")
				.attr("stroke-width", 2 / zoomScale)
			d3.select(this).raise()
			mouseover(event, d)
		})
			.on("mousemove", mousemove)
			.on("mouseleave", function (event, d) {
				d3.select(this)
					.transition()
					.duration(200)
					.attr("stroke", "var(--geo-map)")
					.attr("stroke-width", 1 / zoomScale)
				d3.select(this).lower()
				mouseleave(event, d)
			})

		map.transition()
			.duration(700)
			.attr("fill", (d) => (d.amount ? countryColor(+d.amount) : "transparent"))

		// Add country arrows and info cards (only if labels are enabled)
		if (showValidatorLabels.value) {
			const allCountriesWithValidators = geoMap.value.filter(d => d.amount > 0)
		
		// Sort by validator count and take top ones for display
		const countriesWithValidators = allCountriesWithValidators
			.sort((a, b) => b.amount - a.amount)
			.slice(0, Math.min(15, allCountriesWithValidators.length)) // Show more countries but limit for performance
		
		// Track used positions to avoid overlaps
		const usedPositions = []
		const minDistance = 100 // Minimum distance between cards
		
		// Advanced collision detection and positioning
		const getArrowDirection = (centroid, index, total, countryName) => {
			const [x, y] = centroid
			const cardWidth = 80
			const cardHeight = 35
			
			// Test multiple directions and distances for each country
			const possibleDirections = ['up', 'right', 'down', 'left', 'up-right', 'up-left', 'down-right', 'down-left']
			const possibleDistances = [45, 60, 80, 100, 120] // Try different distances
			
			// Helper function to check if a position overlaps with existing ones
			const checkCollision = (cardX, cardY) => {
				return usedPositions.some(pos => {
					const dx = Math.abs(pos.x - cardX)
					const dy = Math.abs(pos.y - cardY)
					return dx < minDistance && dy < minDistance
				})
			}
			
			// Helper function to check if position is within screen bounds
			const isWithinBounds = (cardX, cardY) => {
				return cardX >= 10 && cardY >= 10 && 
					   cardX + cardWidth <= width - 10 && 
					   cardY + cardHeight <= height - 10
			}
			
			// Try to find best position
			for (const distance of possibleDistances) {
				for (const direction of possibleDirections) {
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
					}
					
					// Check if this position works
					if (isWithinBounds(cardX, cardY) && !checkCollision(cardX, cardY)) {
						// Reserve this position
						usedPositions.push({ x: cardX, y: cardY, width: cardWidth, height: cardHeight })
						return { endX, endY, cardX, cardY, direction, distance }
					}
				}
			}
			
			// Fallback: use original logic with increased distance
			let direction = 'right'
			let offsetDistance = 50 + (index * 15) // Increase distance for each subsequent country
			
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
			
			// Reserve fallback position
			usedPositions.push({ x: cardX, y: cardY, width: cardWidth, height: cardHeight })
			return { endX, endY, cardX, cardY, direction, distance: offsetDistance }
		}
		
		labels = g.append("g")
			.selectAll("g")
			.data(countriesWithValidators)
			.enter()
			.append("g")
			.attr("class", "country-arrow-group")

		// Add dashed arrows
		labels.each(function(d, i) {
			const centroid = path.centroid(d)
			const [startX, startY] = centroid
			const { endX, endY, cardX, cardY, direction, distance } = getArrowDirection(centroid, i, countriesWithValidators.length, d.properties.name)
			
			const group = d3.select(this)
			
			// Dashed line - point directly to card center
			const lineEndX = direction.includes('-') ? cardX + 40 : endX
			const lineEndY = direction.includes('-') ? cardY + 17.5 : endY
			
			group.append("line")
				.attr("x1", startX)
				.attr("y1", startY)
				.attr("x2", startX) // Start from same point, will animate
				.attr("y2", startY)
				.attr("stroke", "#18d2a5")
				.attr("stroke-width", 3)
				.attr("stroke-dasharray", "6,4")
				.attr("opacity", 0)
				.transition()
				.delay(i * 150)
				.duration(800)
				.attr("x2", lineEndX)
				.attr("y2", lineEndY)
				.attr("opacity", 0.95)
			
			// Arrow head - adjusted for all directions including diagonals
			const arrowSize = 8
			let arrowPath = ""
			let arrowX = endX
			let arrowY = endY
			
			// For diagonal directions, point arrow towards card center
			if (direction.includes('-')) {
				arrowX = cardX + 40 // Card center X
				arrowY = cardY + 17.5 // Card center Y
			}
			
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
			}
			
			group.append("path")
				.attr("d", arrowPath)
				.attr("fill", "#18d2a5")
				.attr("stroke", "#ffffff")
				.attr("stroke-width", 0.5)
				.attr("opacity", 0)
				.transition()
				.delay(i * 150 + 400)
				.duration(400)
				.attr("opacity", 1)
			
			// Info card background
			group.append("rect")
				.attr("x", cardX)
				.attr("y", cardY)
				.attr("width", 80)
				.attr("height", 35)
				.attr("rx", 8)
				.attr("fill", "rgba(24, 210, 165, 0.95)")
				.attr("stroke", "rgba(255, 255, 255, 0.4)")
				.attr("stroke-width", 1)
				.style("filter", "url(#label-shadow)")
				.attr("opacity", 0)
				.transition()
				.delay(i * 150 + 600)
				.duration(500)
				.attr("opacity", 1)
			
			// Country name
			group.append("text")
				.attr("x", cardX + 40)
				.attr("y", cardY + 12)
				.attr("text-anchor", "middle")
				.attr("font-size", "10px")
				.attr("font-weight", "600")
				.attr("fill", "#1a1a1a")
				.text(() => {
					const name = d.properties.name
					return name.length > 9 ? name.substring(0, 7) + "..." : name
				})
				.attr("opacity", 0)
				.transition()
				.delay(i * 150 + 800)
				.duration(300)
				.attr("opacity", 1)
			
			// Validator count
			group.append("text")
				.attr("x", cardX + 40)
				.attr("y", cardY + 26)
				.attr("text-anchor", "middle")
				.attr("font-size", "9px")
				.attr("font-weight", "500")
				.attr("fill", "#1a1a1a")
				.text(`${d.amount} validators`)
				.attr("opacity", 0)
				.transition()
				.delay(i * 150 + 800)
				.duration(300)
				.attr("opacity", 1)
		})
		} // End of showValidatorLabels check for countries

	} else if (chartView.value === "cities") {
		// Calculate city coordinates using the same projection as the map
		const citiesWithCoords = validatorLocationData.value.map(item => {
			const coords = projection(item.coordinates)
			
			return {
				...item,
				x: coords[0],
				y: coords[1]
			}
		})

		cities = g
			.append("g")
			.selectAll("circle")
			.data(citiesWithCoords)
			.enter()
			.append("circle")
			.attr("transform", (d) => `translate(${d.x}, ${d.y})`)
			.attr("r", 0)
			.style("fill", "var(--brand)")
			.attr("fill-opacity", 0)
			.on("mouseover", mouseover)
			.on("mousemove", mousemove)
			.on("mouseleave", mouseleave)
		
		cities
			.transition()
			.delay((d, i) => i * 3)
			.duration(500)
			.attr("r", (d) => size(+d.amount))
			.attr("fill-opacity", 0.7)

		// Add city arrows and info cards (only if labels are enabled)
		if (showValidatorLabels.value) {
			const allCitiesWithValidators = citiesWithCoords.filter(d => d.amount > 0)
		
		// Sort by validator count and take top ones for display
		const citiesWithValidators = allCitiesWithValidators
			.sort((a, b) => b.amount - a.amount)
			.slice(0, Math.min(20, allCitiesWithValidators.length)) // Show more cities
		
		// Reset position tracking for cities
		const cityUsedPositions = []
		const cityMinDistance = 80 // Smaller minimum distance for cities
		
		// Advanced collision detection for cities
		const getCityArrowDirection = (position, index, total) => {
			const { x, y } = position
			const cardWidth = 90
			const cardHeight = 30
			
			// Test multiple directions and distances for cities
			const possibleDirections = ['up', 'right', 'down', 'left', 'up-right', 'up-left', 'down-right', 'down-left']
			const possibleDistances = [30, 40, 55, 70, 85] // Shorter distances for cities
			
			// Helper function to check if a position overlaps with existing ones
			const checkCityCollision = (cardX, cardY) => {
				return cityUsedPositions.some(pos => {
					const dx = Math.abs(pos.x - cardX)
					const dy = Math.abs(pos.y - cardY)
					return dx < cityMinDistance && dy < cityMinDistance
				})
			}
			
			// Helper function to check if position is within screen bounds
			const isWithinBounds = (cardX, cardY) => {
				return cardX >= 10 && cardY >= 10 && 
					   cardX + cardWidth <= width - 10 && 
					   cardY + cardHeight <= height - 10
			}
			
			// Try to find best position for city
			for (const distance of possibleDistances) {
				for (const direction of possibleDirections) {
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
					}
					
					// Check if this position works
					if (isWithinBounds(cardX, cardY) && !checkCityCollision(cardX, cardY)) {
						// Reserve this position
						cityUsedPositions.push({ x: cardX, y: cardY, width: cardWidth, height: cardHeight })
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
			
			// Reserve fallback position
			cityUsedPositions.push({ x: cardX, y: cardY, width: cardWidth, height: cardHeight })
			return { endX, endY, cardX, cardY, direction, distance: offsetDistance }
		}
		
		labels = g.append("g")
			.selectAll("g")
			.data(citiesWithValidators)
			.enter()
			.append("g")
			.attr("class", "city-arrow-group")

		// Add dashed arrows for cities
		labels.each(function(d, i) {
			const { endX, endY, cardX, cardY, direction, distance } = getCityArrowDirection(d, i, citiesWithValidators.length)
			
			const group = d3.select(this)
			
			// Dashed line - point directly to card center
			const lineEndX = direction.includes('-') ? cardX + 45 : endX
			const lineEndY = direction.includes('-') ? cardY + 15 : endY
			
			group.append("line")
				.attr("x1", d.x)
				.attr("y1", d.y)
				.attr("x2", d.x)
				.attr("y2", d.y)
				.attr("stroke", "#18d2a5")
				.attr("stroke-width", 2.5)
				.attr("stroke-dasharray", "5,3")
				.attr("opacity", 0)
				.transition()
				.delay(i * 100)
				.duration(600)
				.attr("x2", lineEndX)
				.attr("y2", lineEndY)
				.attr("opacity", 0.9)
			
			// Arrow head - adjusted for all directions including diagonals
			const arrowSize = 7
			let arrowPath = ""
			let arrowX = endX
			let arrowY = endY
			
			// For diagonal directions, point arrow towards card center
			if (direction.includes('-')) {
				arrowX = cardX + 45 // Card center X (cities have 90px width)
				arrowY = cardY + 15 // Card center Y (cities have 30px height)
			}
			
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
			}
			
			group.append("path")
				.attr("d", arrowPath)
				.attr("fill", "#18d2a5")
				.attr("stroke", "#ffffff")
				.attr("stroke-width", 0.3)
				.attr("opacity", 0)
				.transition()
				.delay(i * 100 + 300)
				.duration(300)
				.attr("opacity", 0.95)
			
			// Info card background
			group.append("rect")
				.attr("x", cardX)
				.attr("y", cardY)
				.attr("width", 90)
				.attr("height", 30)
				.attr("rx", 6)
				.attr("fill", "rgba(30, 71, 61, 0.92)")
				.attr("stroke", "rgba(24, 210, 165, 0.6)")
				.attr("stroke-width", 1)
				.style("filter", "url(#label-shadow)")
				.attr("opacity", 0)
				.transition()
				.delay(i * 100 + 400)
				.duration(400)
				.attr("opacity", 1)
			
			// City name
			group.append("text")
				.attr("x", cardX + 45)
				.attr("y", cardY + 12)
				.attr("text-anchor", "middle")
				.attr("font-size", "9px")
				.attr("font-weight", "600")
				.attr("fill", "#18d2a5")
				.text(() => {
					const cityName = d.name.split(',')[0]
					return cityName.length > 12 ? cityName.substring(0, 10) + "..." : cityName
				})
				.attr("opacity", 0)
				.transition()
				.delay(i * 100 + 600)
				.duration(300)
				.attr("opacity", 1)
			
			// Validator count
			group.append("text")
				.attr("x", cardX + 45)
				.attr("y", cardY + 23)
				.attr("text-anchor", "middle")
				.attr("font-size", "8px")
				.attr("font-weight", "500")
				.attr("fill", "#a0d4c7")
				.text(`${d.amount} val`)
				.attr("opacity", 0)
				.transition()
				.delay(i * 100 + 600)
				.duration(300)
				.attr("opacity", 1)
		})
		} // End of showValidatorLabels check for cities
	}

	// Add zoom functionality
	const bounds = d3.geoPath().projection(projection).bounds({ type: "FeatureCollection", features: geoMap.value })
	const [[x0, y0], [x1, y1]] = bounds
	const zoom = d3
		.zoom()
		.scaleExtent([1, 20])
		.translateExtent([
			[x0, y0],
			[x1, y1],
		])
		.on("zoom", (event) => {
			tooltip.style.opacity = 0
			zoomScale = event.transform.k
			g.attr("transform", event.transform)
			map.attr("stroke-width", 1 / zoomScale)
			
			if (chartView.value === "cities" && cities) {
				cities.attr("r", (d) => size(+d.amount) / (zoomScale * 1.1))
			}
			
			// Scale arrows and cards with zoom
			if (labels) {
				// Scale text sizes
				labels.selectAll("text")
					.attr("font-size", function() {
						const baseSize = chartView.value === "countries" ? 10 : 9
						return `${Math.max(6, baseSize / Math.sqrt(zoomScale))}px`
					})
				
				// Scale stroke widths and arrow elements
				labels.selectAll("line")
					.attr("stroke-width", function() {
						const baseWidth = chartView.value === "countries" ? 3 : 2.5
						return Math.max(1, baseWidth / zoomScale)
					})
				
				labels.selectAll("rect")
					.attr("stroke-width", 1 / zoomScale)
				
				// Adjust card sizes slightly for better visibility at high zoom
				if (zoomScale > 5) {
					labels.selectAll("rect")
						.attr("rx", function() {
							const baseRadius = chartView.value === "countries" ? 8 : 6
							return baseRadius / Math.sqrt(zoomScale)
						})
				}
			}
		})

	svg.call(zoom)
	svg.on("wheel", (event) => event.preventDefault(), { passive: false })

	if (chart.children[0]) chart.children[0].remove()
	chart.append(svg.node())
}

// Process data when API responses are available
const processMapData = async () => {
	try {
		if (!isLoading.value && !hasError.value && geographicData.value && topologyData.value) {
			// Process geographic distribution data (for city view)
			if (geographicData.value?.data?.distribution) {
				const locations = geographicData.value.data.distribution.map(item => item.location)
				
				// Get coordinates from static cache (fast)
				const coordinatesMap = await batchGetLocationCoordinates(locations)
				
				validatorLocationData.value = geographicData.value.data.distribution.map(item => {
					const coordinates = coordinatesMap.get(item.location) || [0, 0]
					const country = extractCountryFromLocation(item.location)
					
					return {
						name: item.location,
						amount: item.validatorCount,
						coordinates: coordinates,
						originalCountry: country
					}
				})
			}

			// Process topology data for country-level aggregation (for country view)
			if (topologyData.value?.data?.geographicDistribution && geoMap.value) {
				const countryValidatorCounts = {}
				const unmappedCountries = new Set()
				
				// Aggregate validators by country
				Object.entries(topologyData.value.data.geographicDistribution).forEach(([location, count]) => {
					const country = extractCountryFromLocation(location)
					const normalizedCountry = normalizeCountryName(country)
					
					// Find matching GeoJSON feature
					const geoFeature = geoMap.value.find(feature => 
						feature.properties.name === normalizedCountry ||
						feature.properties.name === country ||
						feature.id === normalizedCountry ||
						feature.id === country
					)
					
					if (geoFeature) {
						const featureName = geoFeature.properties.name
						countryValidatorCounts[featureName] = (countryValidatorCounts[featureName] || 0) + count
					} else {
						unmappedCountries.add(country)
					}
				})

				// Log unmapped countries for debugging
				if (unmappedCountries.size > 0) {
					console.warn('Countries not mapped to GeoJSON:', Array.from(unmappedCountries))
				}

				// Map country data to geo features
				geoMap.value = geoMap.value.map((feature) => ({
					...feature,
					amount: countryValidatorCounts[feature.properties.name] || 0,
				}))
			}

			if (chartEl.value?.wrapper && geoMap.value) {
				await buildChart(chartEl.value.wrapper)
			}
		}
	} catch (error) {
		console.error('Error processing map data:', error)
	}
}

// Watch for API data changes
watch([geographicData, topologyData, isLoading], () => {
	processMapData()
}, { immediate: true })

onMounted(async () => {
	try {
		const geoData = await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
		if (geoData?.features.length) {
			geoMap.value = geoData.features.filter((d) => d.properties.name !== "Antarctica")
			// Process data if API data is already available
			await processMapData()
		}
	} catch (error) {
		console.error('Error loading geo map data:', error)
	}
})

watch(
	() => chartView.value,
	async () => {
		await buildChart(chartEl.value.wrapper)
	},
)

watch(
	() => showValidatorLabels.value,
	async () => {
		if (chartEl.value?.wrapper && geoMap.value) {
			await buildChart(chartEl.value.wrapper)
		}
	},
)
</script>

<template>
	<Flex direction="column" justify="start" gap="8" wide :class="$style.wrapper">
        <Flex
            @click="handleChangeChartView"
            align="center"
            gap="12"
            :class="$style.chart_selector"
            :style="{
                background: `linear-gradient(to ${chartView === 'countries' ? 'right' : 'left'}, var(--op-5) 50%, transparent 50%)`,
            }"
        >
            <Icon
                name="earth"
                size="14"
                :style="{ fill: `${chartView === 'countries' ? 'var(--mint)' : 'var(--txt-tertiary)'}` }"
            />

            <Icon
                name="city"
                size="14"
                :style="{ fill: `${chartView === 'cities' ? 'var(--mint)' : 'var(--txt-tertiary)'}` }"
            />
        </Flex>

        <!-- Validator Labels Toggle -->
        <Flex
            @click="toggleValidatorLabels"
            align="center"
            justify="center"
            :class="[$style.labels_toggle, { [$style.active]: showValidatorLabels }]"
            :title="showValidatorLabels ? 'Hide validator labels' : 'Show validator labels'"
        >
            <Icon
                name="eye"
                size="12"
                :style="{ fill: showValidatorLabels ? 'var(--mint)' : 'var(--txt-tertiary)' }"
            />
        </Flex>

        <Tooltip v-if="chartView === 'cities'" position="start" :class="$style.chart_info">
            <Icon name="info" size="16" color="yellow" />

            <template #content>
                <Flex align="center" gap="2" :style="{ width: '200px' }">
                    <Text size="12" weight="600" color="secondary">
                        City view shows validator distribution by specific locations
                    </Text>
                </Flex>
            </template>
        </Tooltip>
        
        <Flex ref="chartEl" :class="$style.chart" />

        <Flex v-if="isLoading" align="center" direction="column" gap="8" :class="$style.loader">
            <Text size="12" color="secondary">Loading Monad validator distribution...</Text>
        </Flex>

        <Flex v-else-if="hasError" align="center" direction="column" gap="8" :class="$style.loader">
            <Text size="12" color="red">Error loading validator distribution data</Text>
        </Flex>
	</Flex>
</template>

<style module>
.wrapper {
	width: 100%;
	height: 100%;
	position: relative;
}

.chart {
	width: 100%;
	height: 100%;
	overflow: hidden;

	& svg {
		overflow: visible;
	}
}

.chart_selector {
	width: 52px;
	position: absolute;
	top: 8px;
	right: 8px;
	padding: 4px 6px;
	box-shadow: inset 0 0 0 1px var(--op-10);
	border-radius: 5px;
	cursor: pointer;
	transition: all 1s ease-in-out;
}

.labels_toggle {
	width: 28px;
	height: 28px;
	position: absolute;
	top: 8px;
	right: 68px;
	padding: 6px;
	background: var(--op-5);
	box-shadow: inset 0 0 0 1px var(--op-10);
	border-radius: 50%;
	cursor: pointer;
	transition: all 0.3s ease;
}

.labels_toggle:hover {
	background: var(--op-10);
	box-shadow: inset 0 0 0 1px var(--op-20);
	transform: scale(1.05);
}

.labels_toggle.active {
	background: linear-gradient(135deg, var(--mint-op-20), var(--mint-op-10));
	box-shadow: inset 0 0 0 1px var(--mint-op-30), 0 2px 8px var(--mint-op-20);
}

.labels_toggle.active:hover {
	background: linear-gradient(135deg, var(--mint-op-30), var(--mint-op-20));
	box-shadow: inset 0 0 0 1px var(--mint-op-40), 0 4px 12px var(--mint-op-30);
}

.chart_info {
	position: absolute;
	top: 8px;
	left: 8px;
}

.loader {
	position: absolute;
	top: 30%;
	right: 50%;
	animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
	0% { opacity: 1; }
	50% { opacity: 0.4; }
	100% { opacity: 1; }
}

@media (max-width: 1000px) {
	.wrapper {
		max-width: initial;
		width: 100%;
	}
}
</style> 