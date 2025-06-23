<script setup>
import { ref, computed } from 'vue'

/** UI */
import Badge from "@/components/ui/Badge.vue"

/** API */
// This would fetch from the /validators/centralization endpoint
const centralizationData = ref({
  nakamocoEfficient: 67,
  giniCoefficient: 0.23,
  topValidatorsControl: 0.15, // percentage controlled by top 10 validators
  herfindahlIndex: 0.082,
  decentralizationScore: 8.7
})

const riskLevel = computed(() => {
  const score = centralizationData.value.decentralizationScore
  if (score >= 8) return { level: 'Low', color: 'green' }
  if (score >= 6) return { level: 'Medium', color: 'yellow' }
  return { level: 'High', color: 'red' }
})

const formatPercentage = (value) => {
  return `${(value * 100).toFixed(1)}%`
}
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Flex align="center" justify="between">
        <Text size="14" weight="600" color="primary">Centralization Risk</Text>
        <Badge :class="[$style.risk_badge, $style[riskLevel.color]]">
          <Text size="12" weight="600" color="primary">{{ riskLevel.level }} Risk</Text>
        </Badge>
      </Flex>
      
      <Flex direction="column" gap="12">
        <!-- Decentralization Score -->
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Decentralization Score</Text>
          <Text size="14" weight="600" color="primary">
            {{ centralizationData.decentralizationScore }}/10
          </Text>
        </Flex>
        
        <!-- Progress bar for score -->
        <div :class="$style.score_bar">
          <div 
            :class="$style.score_progress" 
            :style="{ width: `${centralizationData.decentralizationScore * 10}%` }"
          ></div>
        </div>
        
        <!-- Divider -->
        <div :class="$style.divider"></div>
        
        <!-- Metrics -->
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Nakamoto Coefficient</Text>
          <Text size="14" weight="600" color="primary">
            {{ centralizationData.nakamocoEfficient }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Gini Coefficient</Text>
          <Text size="14" weight="600" color="primary">
            {{ centralizationData.giniCoefficient.toFixed(3) }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Top 10 Control</Text>
          <Text size="14" weight="600" color="primary">
            {{ formatPercentage(centralizationData.topValidatorsControl) }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Herfindahl Index</Text>
          <Text size="14" weight="600" color="primary">
            {{ centralizationData.herfindahlIndex.toFixed(3) }}
          </Text>
        </Flex>
        
        <!-- Info note -->
        <div :class="$style.info_note">
          <Text size="11" color="tertiary">
            Lower values indicate better decentralization
          </Text>
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

.risk_badge {
  &.green {
    background: linear-gradient(var(--green-op-10), var(--green-op-5));
    box-shadow: inset 0 0 0 1px var(--green);
  }
  
  &.yellow {
    background: linear-gradient(var(--yellow-op-10), var(--yellow-op-5));
    box-shadow: inset 0 0 0 1px var(--yellow);
  }
  
  &.red {
    background: linear-gradient(var(--red-op-10), var(--red-op-5));
    box-shadow: inset 0 0 0 1px var(--red);
  }
}

.score_bar {
  width: 100%;
  height: 4px;
  background: var(--op-10);
  border-radius: 2px;
  overflow: hidden;
}

.score_progress {
  height: 100%;
  background: linear-gradient(to right, #ef4444, #f59e0b, #10b981);
  transition: width 0.3s ease;
  border-radius: 2px;
}

.divider {
  height: 1px;
  background: var(--op-10);
  margin: 4px 0;
}

.info_note {
  padding: 8px;
  background: var(--op-5);
  border-radius: 4px;
  margin-top: 8px;
}
</style> 