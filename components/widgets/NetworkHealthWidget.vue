<script setup>
import { computed, ref } from 'vue'

/** UI */
import Badge from "@/components/ui/Badge.vue"

/** API */
// This would fetch from the new API structure
const networkHealth = ref({
  totalValidators: 150,
  activeValidators: 142,
  consensusRounds: 1247,
  averageUptimeScore: 95.7,
  networkStatus: 'healthy'
})

const healthPercentage = computed(() => {
  return (networkHealth.value.activeValidators / networkHealth.value.totalValidators) * 100
})

const statusColor = computed(() => {
  if (healthPercentage.value >= 95) return 'green'
  if (healthPercentage.value >= 90) return 'yellow'
  return 'red'
})
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Flex align="center" justify="between">
        <Text size="14" weight="600" color="primary">Network Health</Text>
        <Badge :class="[$style.status_badge, $style[statusColor]]">
          <Text size="12" weight="600" color="primary">{{ networkHealth.networkStatus }}</Text>
        </Badge>
      </Flex>
      
      <Flex direction="column" gap="12">
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Active Validators</Text>
          <Text size="14" weight="600" color="primary">
            {{ networkHealth.activeValidators }}/{{ networkHealth.totalValidators }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Consensus Rounds</Text>
          <Text size="14" weight="600" color="primary">
            {{ networkHealth.consensusRounds.toLocaleString() }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Avg Uptime Score</Text>
          <Text size="14" weight="600" color="primary">
            {{ networkHealth.averageUptimeScore }}%
          </Text>
        </Flex>
        
        <!-- Health Progress Bar -->
        <div :class="$style.health_bar">
          <div :class="$style.health_progress" :style="{ width: `${healthPercentage}%` }"></div>
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

.status_badge {
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

.health_bar {
  width: 100%;
  height: 4px;
  background: var(--op-10);
  border-radius: 2px;
  overflow: hidden;
}

.health_progress {
  height: 100%;
  background: var(--brand);
  transition: width 0.3s ease;
  border-radius: 2px;
}
</style> 