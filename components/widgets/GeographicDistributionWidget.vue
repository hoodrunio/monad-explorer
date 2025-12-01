<script setup>
import { ref, computed, watch } from 'vue'
import * as d3 from 'd3'

/** API */
import { fetchGeographicDistribution } from "@/services/api/main"

const { data: geoData, pending: isLoading, error } = await fetchGeographicDistribution()

const chartRef = ref(null)
const hoveredRegion = ref(null)

const geographicData = computed(() => {
  if (!geoData.value?.data?.distribution || !Array.isArray(geoData.value.data.distribution)) {
    return []
  }

  return geoData.value.data.distribution.map(region => ({
    location: region.location || 'Unknown',
    validatorCount: region.validatorCount || region.validator_count || 0,
    percentage: region.percentage || 0
  }))
})

const totalValidators = computed(() => {
  return geoData.value?.data?.totalValidators || 0
})

const getRegionColor = (index) => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
  return colors[index % colors.length]
}

const createDonutChart = () => {
  if (!chartRef.value || geographicData.value.length === 0) return

  const container = chartRef.value
  const width = 140
  const height = 140
  const radius = Math.min(width, height) / 2
  const innerRadius = radius * 0.65

  // Clear previous chart
  d3.select(container).selectAll('*').remove()

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`)

  // Create gradient definitions
  const defs = svg.append('defs')

  geographicData.value.slice(0, 5).forEach((region, index) => {
    const color = getRegionColor(index)
    const gradient = defs.append('linearGradient')
      .attr('id', `gradient-${index}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%')

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color)
      .attr('stop-opacity', 1)

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color)
      .attr('stop-opacity', 0.7)
  })

  const pie = d3.pie()
    .value(d => d.percentage)
    .sort(null)

  const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(radius)

  const arcHover = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(radius + 8)

  const data = pie(geographicData.value.slice(0, 5))

  // Draw arcs
  const arcs = svg.selectAll('path')
    .data(data)
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', (d, i) => `url(#gradient-${i})`)
    .attr('stroke', '#20212529')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .style('opacity', 0)
    .style('transition', 'all 0.3s ease')

  // Animate on load
  arcs.transition()
    .delay((d, i) => i * 100)
    .duration(600)
    .style('opacity', 1)
    .attrTween('d', function(d) {
      const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d)
      return function(t) {
        return arc(interpolate(t))
      }
    })

  // Hover effects
  arcs.on('mouseenter', function(event, d) {
    hoveredRegion.value = d.index
    d3.select(this)
      .transition()
      .duration(200)
      .attr('d', arcHover)
      .style('opacity', 1)

    // Dim others
    arcs.filter((_, i) => i !== d.index)
      .transition()
      .duration(200)
      .style('opacity', 0.4)
  })
  .on('mouseleave', function() {
    hoveredRegion.value = null
    arcs.transition()
      .duration(200)
      .attr('d', arc)
      .style('opacity', 1)
  })

  // Center text
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.1em')
    .style('font-size', '22px')
    .style('font-weight', '700')
    .style('fill', 'var(--txt-primary)')
    .text(totalValidators.value)
    .style('opacity', 0)
    .transition()
    .delay(500)
    .duration(400)
    .style('opacity', 1)

  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1em')
    .style('font-size', '9px')
    .style('font-weight', '500')
    .style('fill', 'var(--txt-tertiary)')
    .text('Validators')
    .style('opacity', 0)
    .transition()
    .delay(600)
    .duration(400)
    .style('opacity', 1)
}

watch(
  [geographicData, isLoading],
  ([newData, loading]) => {
    if (!loading && newData.length > 0 && chartRef.value) {
      createDonutChart()
    }
  },
  { immediate: true, flush: 'post' }
)
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Flex align="center" justify="between">
        <Text size="14" weight="600" color="primary">Geographic Distribution</Text>
        <NuxtLink to="/validators" :class="$style.view_map_link">
          <Text size="12" color="secondary">View All</Text>
        </NuxtLink>
      </Flex>

      <Flex v-if="isLoading" direction="column" gap="8" align="center" justify="center" style="min-height: 160px;">
        <div :class="$style.skeleton_circle"></div>
        <Text size="11" color="tertiary">Loading...</Text>
      </Flex>

      <Flex v-else-if="error" direction="column" gap="6" align="center" justify="center" style="min-height: 160px;">
        <Icon name="alert" size="20" color="red" />
        <Text size="11" color="red">Error loading data</Text>
      </Flex>

      <Flex v-else-if="geographicData.length === 0" direction="column" gap="6" align="center" justify="center" style="min-height: 160px;">
        <Icon name="info" size="20" color="tertiary" />
        <Text size="11" color="tertiary">No data available</Text>
      </Flex>

      <Flex v-else :class="$style.content" gap="16">
        <!-- Donut Chart -->
        <div :class="$style.chart_container">
          <div ref="chartRef" :class="$style.chart"></div>
        </div>

        <!-- List -->
        <Flex direction="column" gap="6" :class="$style.list_container">
          <div
            v-for="(region, index) in geographicData.slice(0, 5)"
            :key="region.location"
            :class="[$style.region_item, { [$style.hovered]: hoveredRegion === index }]"
            @mouseenter="hoveredRegion = index"
            @mouseleave="hoveredRegion = null"
          >
            <Flex align="center" gap="10">
              <div
                :class="$style.region_indicator"
                :style="{
                  backgroundColor: getRegionColor(index),
                  boxShadow: hoveredRegion === index ? `0 0 10px ${getRegionColor(index)}` : 'none'
                }"
              ></div>

              <Flex direction="column" gap="2" style="flex: 1;">
                <Flex align="center" justify="between">
                  <Text size="12" weight="500" color="primary">{{ region.location }}</Text>
                  <Text size="12" weight="600" color="primary">
                    {{ region.percentage.toFixed(1) }}%
                  </Text>
                </Flex>

                <Flex align="center" justify="between">
                  <Text size="10" color="secondary">{{ region.validatorCount }} validators</Text>
                  <div :class="$style.mini_bar">
                    <div
                      :class="$style.mini_bar_fill"
                      :style="{
                        width: `${region.percentage}%`,
                        background: `linear-gradient(90deg, ${getRegionColor(index)}00, ${getRegionColor(index)})`
                      }"
                    ></div>
                  </div>
                </Flex>
              </Flex>
            </Flex>
          </div>
        </Flex>
      </Flex>
    </Flex>
  </div>
</template>

<style module>
.wrapper {
  height: 100%;
  min-height: 240px;
  background: var(--card-background);
  border-radius: 12px;
  padding: 14px;
  position: relative;
  overflow: hidden;
}

.wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent,
    rgba(59, 130, 246, 0.3) 20%,
    rgba(16, 185, 129, 0.3) 40%,
    rgba(245, 158, 11, 0.3) 60%,
    rgba(139, 92, 246, 0.3) 80%,
    transparent
  );
  opacity: 0.5;
}

.content {
  animation: fadeIn 0.6s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chart_container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 140px;
}

.chart {
  width: 140px;
  height: 140px;
}

.list_container {
  flex: 1;
  min-width: 0;
}

.region_item {
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--op-5);
  transition: all 0.3s ease;
  cursor: pointer;
  animation: slideIn 0.4s ease backwards;
  border: 1px solid transparent;
}

.region_item:nth-child(1) { animation-delay: 0.1s; }
.region_item:nth-child(2) { animation-delay: 0.15s; }
.region_item:nth-child(3) { animation-delay: 0.2s; }
.region_item:nth-child(4) { animation-delay: 0.25s; }
.region_item:nth-child(5) { animation-delay: 0.3s; }

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.region_item:hover,
.region_item.hovered {
  background: var(--op-10);
  transform: translateX(3px);
  border-color: var(--op-10);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.region_indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.region_item:hover .region_indicator,
.region_item.hovered .region_indicator {
  transform: scale(1.2);
}

.mini_bar {
  width: 50px;
  height: 3px;
  background: var(--op-10);
  border-radius: 2px;
  overflow: hidden;
}

.mini_bar_fill {
  height: 100%;
  transition: width 0.6s ease;
  border-radius: 2px;
}

.skeleton_circle {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: linear-gradient(
    90deg,
    var(--op-5) 0%,
    var(--op-10) 50%,
    var(--op-5) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.view_map_link {
  text-decoration: none;
  transition: all 0.2s ease;
  padding: 4px 8px;
  border-radius: 4px;
}

.view_map_link:hover {
  background: var(--op-5);
}

@media (max-width: 768px) {
  .content {
    flex-direction: column;
    align-items: center;
  }

  .chart_container {
    margin-bottom: 16px;
  }

  .list_container {
    width: 100%;
  }
}
</style>
