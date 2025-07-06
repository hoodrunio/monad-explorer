import * as d3 from "d3"
import { getArrowDirection, getCityArrowDirection, generateArrowPath, resetPositionTracking } from "@/utils/arrowPositioning"

export const useGeoMapChart = () => {
	// Create tooltip HTML and styles
	const createTooltipContainer = () => {
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
		return container
	}

	// Create tooltip event handlers
	const createTooltipHandlers = (tooltip, chartView) => {
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

		return { mouseover, mousemove, mouseleave }
	}

	// Create SVG with custom styles
	const createSVGWithStyles = (svg) => {
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
	}

	// Render countries view
	const renderCountriesView = (map, geoMap, countryColor, showValidatorLabels, zoomScale, path, width, height, g) => {
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
			
			const labels = g.append("g")
				.selectAll("g")
				.data(countriesWithValidators)
				.enter()
				.append("g")
				.attr("class", "country-arrow-group")

			// Add dashed arrows
			labels.each(function(d, i) {
				const centroid = path.centroid(d)
				const [startX, startY] = centroid
				const { endX, endY, cardX, cardY, direction, distance } = getArrowDirection(centroid, i, countriesWithValidators.length, d.properties.name, width, height)
				
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
				let arrowX = endX
				let arrowY = endY
				
				// For diagonal directions, point arrow towards card center
				if (direction.includes('-')) {
					arrowX = cardX + 40 // Card center X
					arrowY = cardY + 17.5 // Card center Y
				}
				
				const arrowPath = generateArrowPath(direction, arrowX, arrowY, arrowSize)
				
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
			
			return labels
		}
		
		return null
	}

	// Render cities view
	const renderCitiesView = (g, validatorLocationData, projection, size, showValidatorLabels, width, height) => {
		// Calculate city coordinates using the same projection as the map
		const citiesWithCoords = validatorLocationData.value.map(item => {
			const coords = projection(item.coordinates)
			
			return {
				...item,
				x: coords[0],
				y: coords[1]
			}
		})

		const cities = g
			.append("g")
			.selectAll("circle")
			.data(citiesWithCoords)
			.enter()
			.append("circle")
			.attr("transform", (d) => `translate(${d.x}, ${d.y})`)
			.attr("r", 0)
			.style("fill", "var(--brand)")
			.attr("fill-opacity", 0)
		
		cities
			.transition()
			.delay((d, i) => i * 3)
			.duration(500)
			.attr("r", (d) => size(+d.amount))
			.attr("fill-opacity", 0.7)

		// Add city arrows and info cards (only if labels are enabled)
		let labels = null
		if (showValidatorLabels.value) {
			const allCitiesWithValidators = citiesWithCoords.filter(d => d.amount > 0)
			
			// Sort by validator count and take top ones for display
			const citiesWithValidators = allCitiesWithValidators
				.sort((a, b) => b.amount - a.amount)
				.slice(0, Math.min(20, allCitiesWithValidators.length)) // Show more cities
			
			labels = g.append("g")
				.selectAll("g")
				.data(citiesWithValidators)
				.enter()
				.append("g")
				.attr("class", "city-arrow-group")

			// Add dashed arrows for cities
			labels.each(function(d, i) {
				const { endX, endY, cardX, cardY, direction, distance } = getCityArrowDirection(d, i, citiesWithValidators.length, width, height)
				
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
				let arrowX = endX
				let arrowY = endY
				
				// For diagonal directions, point arrow towards card center
				if (direction.includes('-')) {
					arrowX = cardX + 45 // Card center X (cities have 90px width)
					arrowY = cardY + 15 // Card center Y (cities have 30px height)
				}
				
				const arrowPath = generateArrowPath(direction, arrowX, arrowY, arrowSize)
				
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
		}
		
		return { cities, labels }
	}

	// Add zoom functionality
	const addZoomFunctionality = (svg, g, geoMap, projection, map, cities, labels, size, chartView, tooltip) => {
		const bounds = d3.geoPath().projection(projection).bounds({ type: "FeatureCollection", features: geoMap.value })
		const [[x0, y0], [x1, y1]] = bounds
		let zoomScale = 1
		
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
		
		return zoomScale
	}

	// Main chart building function
	const buildChart = async (chart, geoMap, validatorLocationData, chartView, showValidatorLabels) => {
		// Reset position tracking for collision detection
		resetPositionTracking()
		
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
		createSVGWithStyles(svg)

		// Tooltip
		const container = createTooltipContainer()
		container.appendChild(svg.node())
		document.body.appendChild(container)

		const tooltip = container.querySelector(".tooltip")
		const { mouseover, mousemove, mouseleave } = createTooltipHandlers(tooltip, chartView)

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

			labels = renderCountriesView(map, geoMap, countryColor, showValidatorLabels, zoomScale, path, width, height, g)
		} else if (chartView.value === "cities") {
			const cityResult = renderCitiesView(g, validatorLocationData, projection, size, showValidatorLabels, width, height)
			cities = cityResult.cities
			labels = cityResult.labels
			
			// Add tooltip events to cities
			if (cities) {
				cities
					.on("mouseover", mouseover)
					.on("mousemove", mousemove)
					.on("mouseleave", mouseleave)
			}
		}

		// Add zoom functionality
		zoomScale = addZoomFunctionality(svg, g, geoMap, projection, map, cities, labels, size, chartView, tooltip)

		if (chart.children[0]) chart.children[0].remove()
		chart.append(svg.node())
	}

	return {
		buildChart
	}
} 