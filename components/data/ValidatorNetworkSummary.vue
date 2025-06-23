<script setup>
import { ref, computed } from 'vue'

/** API */
// This would fetch from the /validators/summary endpoint
const networkSummary = ref({
  totalValidators: 150,
  activeValidators: 142,
  inactiveValidators: 8,
  totalStaked: 125000000,
  averageStaked: 833333,
  networkUptimePercentage: 99.2,
  currentEpoch: 1247,
  consensusRoundsCompleted: 45230,
  slashingEvents: 3,
  averageBlockTime: 1.2
})

const activityPercentage = computed(() => {
  return (networkSummary.value.activeValidators / networkSummary.value.totalValidators) * 100
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const formatLargeNumber = (num) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="20">
      <Text size="18" weight="700" color="primary">Network Summary</Text>
      
      <!-- Top metrics grid -->
      <div :class="$style.metrics_grid">
        <div :class="$style.metric_card">
          <Flex direction="column" gap="8">
            <Text size="12" color="tertiary">Total Validators</Text>
            <Text size="24" weight="700" color="primary">
              {{ networkSummary.totalValidators }}
            </Text>
            <Flex align="center" gap="4">
              <div :class="[$style.status_dot, $style.active]"></div>
              <Text size="11" color="green">
                {{ networkSummary.activeValidators }} Active
              </Text>
            </Flex>
          </Flex>
        </div>
        
        <div :class="$style.metric_card">
          <Flex direction="column" gap="8">
            <Text size="12" color="tertiary">Total Staked</Text>
            <Text size="24" weight="700" color="primary">
              {{ formatLargeNumber(networkSummary.totalStaked) }}
            </Text>
            <Text size="11" color="secondary">
              Avg: {{ formatLargeNumber(networkSummary.averageStaked) }}
            </Text>
          </Flex>
        </div>
        
        <div :class="$style.metric_card">
          <Flex direction="column" gap="8">
            <Text size="12" color="tertiary">Network Uptime</Text>
            <Text size="24" weight="700" color="green">
              {{ networkSummary.networkUptimePercentage }}%
            </Text>
            <Text size="11" color="secondary">
              Last 30 days
            </Text>
          </Flex>
        </div>
        
        <div :class="$style.metric_card">
          <Flex direction="column" gap="8">
            <Text size="12" color="tertiary">Current Epoch</Text>
            <Text size="24" weight="700" color="primary">
              {{ networkSummary.currentEpoch }}
            </Text>
            <Text size="11" color="secondary">
              {{ networkSummary.consensusRoundsCompleted.toLocaleString() }} rounds
            </Text>
          </Flex>
        </div>
      </div>
      
      <!-- Activity bar -->
      <div :class="$style.activity_section">
        <Flex align="center" justify="between" style="margin-bottom: 8px;">
          <Text size="14" weight="600" color="primary">Validator Activity</Text>
          <Text size="14" weight="600" color="primary">
            {{ activityPercentage.toFixed(1) }}%
          </Text>
        </Flex>
        
        <div :class="$style.activity_bar">
          <div 
            :class="$style.activity_progress" 
            :style="{ width: `${activityPercentage}%` }"
          ></div>
        </div>
        
        <Flex align="center" justify="between" style="margin-top: 8px;">
          <Text size="11" color="secondary">
            {{ networkSummary.inactiveValidators }} Inactive
          </Text>
          <Text size="11" color="secondary">
            {{ networkSummary.slashingEvents }} Slashing Events
          </Text>
        </Flex>
      </div>
      
      <!-- Performance metrics -->
      <div :class="$style.performance_section">
        <Text size="14" weight="600" color="primary" style="margin-bottom: 12px;">
          Performance Metrics
        </Text>
        
        <Flex direction="column" gap="8">
          <Flex align="center" justify="between">
            <Text size="12" color="tertiary">Average Block Time</Text>
            <Text size="12" weight="600" color="primary">
              {{ networkSummary.averageBlockTime }}s
            </Text>
          </Flex>
          
          <Flex align="center" justify="between">
            <Text size="12" color="tertiary">Consensus Efficiency</Text>
            <Text size="12" weight="600" color="green">
              99.7%
            </Text>
          </Flex>
        </Flex>
      </div>
    </Flex>
  </div>
</template>

<style module>
.wrapper {
  padding: 24px;
  background: var(--card-background);
  border-radius: 12px;
}

.metrics_grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.metric_card {
  padding: 16px;
  border: 1px solid var(--op-8);
  border-radius: 8px;
  background: var(--op-3);
}

.status_dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;

  &.active {
    background: var(--green);
  }
}

.activity_section {
  padding: 16px;
  border: 1px solid var(--op-8);
  border-radius: 8px;
  background: var(--op-3);
}

.activity_bar {
  width: 100%;
  height: 6px;
  background: var(--op-10);
  border-radius: 3px;
  overflow: hidden;
}

.activity_progress {
  height: 100%;
  background: linear-gradient(to right, var(--green), var(--brand));
  transition: width 0.3s ease;
  border-radius: 3px;
}

.performance_section {
  padding: 16px;
  border: 1px solid var(--op-8);
  border-radius: 8px;
  background: var(--op-3);
}

@media (max-width: 768px) {
  .metrics_grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .metrics_grid {
    grid-template-columns: 1fr;
  }
}
</style> 