<script setup>
import { ref } from 'vue'

/** API */
// This would fetch from the /events endpoint
const recentEvents = ref([
  {
    id: 1,
    type: 'validator_joined',
    validator: 'validator_123abc456def',
    timestamp: '2024-01-15T10:30:00Z',
    details: 'New validator joined the network'
  },
  {
    id: 2,
    type: 'performance_warning',
    validator: 'validator_456def789ghi',
    timestamp: '2024-01-15T10:25:00Z',
    details: 'Uptime score dropped below 95%'
  },
  {
    id: 3,
    type: 'consensus_participation',
    validator: 'validator_789ghi123jkl',
    timestamp: '2024-01-15T10:20:00Z',
    details: 'Missing QC participation'
  },
  {
    id: 4,
    type: 'block_proposal',
    validator: 'validator_101jkl456mno',
    timestamp: '2024-01-15T10:15:00Z',
    details: 'Successfully proposed block #12457'
  }
])

const getEventIcon = (type) => {
  switch (type) {
    case 'validator_joined': return 'plus-circle'
    case 'performance_warning': return 'warning'
    case 'consensus_participation': return 'clock'
    case 'block_proposal': return 'check-circle'
    default: return 'info'
  }
}

const getEventColor = (type) => {
  switch (type) {
    case 'validator_joined': return 'green'
    case 'performance_warning': return 'yellow'
    case 'consensus_participation': return 'red'
    case 'block_proposal': return 'blue'
    default: return 'tertiary'
  }
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Flex align="center" justify="between">
        <Text size="14" weight="600" color="primary">Recent Events</Text>
        <NuxtLink to="/validators" :class="$style.view_all_link">
          <Text size="12" color="secondary">View Validators</Text>
        </NuxtLink>
      </Flex>
      
      <Flex direction="column" gap="8">
        <div 
          v-for="event in recentEvents.slice(0, 4)" 
          :key="event.id"
          :class="$style.event_item"
        >
          <Flex align="center" gap="12">
            <Icon 
              :name="getEventIcon(event.type)" 
              size="14" 
              :color="getEventColor(event.type)"
            />
            
            <Flex direction="column" gap="2" style="flex: 1;">
              <Flex align="center" justify="between">
                <Text size="12" weight="500" color="primary">
                  {{ event.details }}
                </Text>
                <Text size="11" color="tertiary">
                  {{ formatTime(event.timestamp) }}
                </Text>
              </Flex>
              
              <Text size="11" color="secondary">
                {{ event.validator.slice(0, 12) }}...
              </Text>
            </Flex>
          </Flex>
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

.event_item {
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;

  &:hover {
    background: var(--op-5);
  }
}

.view_all_link {
  text-decoration: none;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
}
</style> 