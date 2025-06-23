<script setup>
import { ref } from 'vue'

/** API */
// This would fetch from the /validators/geographic endpoint
const geographicData = ref([
  { region: 'North America', count: 45, percentage: 30 },
  { region: 'Europe', count: 38, percentage: 25.3 },
  { region: 'Asia Pacific', count: 42, percentage: 28 },
  { region: 'South America', count: 15, percentage: 10 },
  { region: 'Africa/Middle East', count: 10, percentage: 6.7 }
])

const getRegionColor = (index) => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
  return colors[index % colors.length]
}
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
      
      <Flex direction="column" gap="10">
        <div 
          v-for="(region, index) in geographicData" 
          :key="region.region"
          :class="$style.region_item"
        >
          <Flex align="center" justify="between" style="margin-bottom: 6px;">
            <Flex align="center" gap="8">
              <div 
                :class="$style.region_indicator"
                :style="{ backgroundColor: getRegionColor(index) }"
              ></div>
              <Text size="12" color="primary">{{ region.region }}</Text>
            </Flex>
            
            <Flex align="center" gap="8">
              <Text size="12" color="tertiary">{{ region.count }}</Text>
              <Text size="11" weight="600" color="secondary">
                {{ region.percentage }}%
              </Text>
            </Flex>
          </Flex>
          
          <!-- Progress bar -->
          <div :class="$style.progress_bar">
            <div 
              :class="$style.progress_fill"
              :style="{ 
                width: `${region.percentage}%`,
                backgroundColor: getRegionColor(index)
              }"
            ></div>
          </div>
        </div>
      </Flex>
    </Flex>
  </div>
</template>

<style module>
.wrapper {
  height: 100%;
  min-height: 164px;
  background: var(--card-background);
  border-radius: 12px;
  padding: 16px;
}

.region_item {
  padding: 4px 0;
}

.region_indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.progress_bar {
  width: 100%;
  height: 3px;
  background: var(--op-10);
  border-radius: 2px;
  overflow: hidden;
}

.progress_fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 2px;
}

.view_map_link {
  text-decoration: none;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
}
</style> 