<script setup>
import { ref, computed } from 'vue'

/** API */
import { fetchRecentEvents } from "@/services/api/main"

const { data: eventsData, pending: isLoading, error } = await fetchRecentEvents({ type: 'block_proposal', limit: 8 })

const recentProposalEvents = computed(() => {
  if (!eventsData.value?.events || !Array.isArray(eventsData.value.events)) {
    return []
  }
  
  return eventsData.value.events.map(event => ({
    id: `${event.validator_id}-${event.round_number}-${event.timestamp}`,
    type: event.event_type || 'unknown',
    validatorId: event.validator_id || 'unknown',
    validatorName: event.infrastructure?.validator_name || 'Unknown',
    timestamp: event.timestamp || new Date().toISOString(),
    roundNumber: event.round_number || 0,
    status: event.details?.status || '',
    participated: event.details?.participated,
    location: event.infrastructure?.location || 'Unknown'
  }))
})

const getEventIcon = (type) => {
  switch (type) {
    case 'block_proposal': return 'check-circle'
    case 'block_skipped': return 'x-circle'
    case 'qc_participation': return 'users'
    default: return 'info'
  }
}

const getEventColor = (type, status, participated) => {
  switch (type) {
    case 'block_proposal': return status === 'proposed' ? 'green' : 'tertiary'
    case 'block_skipped': return 'red'
    case 'qc_participation': return participated ? 'blue' : 'yellow'
    default: return 'tertiary'
  }
}

const getEventDescription = (event) => {
  switch (event.type) {
    case 'block_proposal':
      return event.status === 'proposed' ? 'Block proposed' : 'Block proposal'
    case 'block_skipped':
      return 'Block skipped'
    case 'qc_participation':
      return event.participated ? 'QC participated' : 'QC missed'
    default:
      return event.type
  }
}

const formatTime = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

const truncateValidator = (name) => {
  if (typeof name !== 'string') return 'Unknown'
  return name.length > 15 ? `${name.slice(0, 15)}...` : name
}
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Flex align="center" justify="between">
        <Text size="14" weight="600" color="primary">Recent Proposals</Text>
        <NuxtLink to="/validators" :class="$style.view_all_link">
          <Text size="12" color="secondary">View All</Text>
        </NuxtLink>
      </Flex>
      
      <Flex v-if="isLoading" direction="column" gap="8">
        <Text size="12" color="tertiary">Loading recent events...</Text>
      </Flex>
      
      <Flex v-else-if="error" direction="column" gap="8">
        <Text size="12" color="red">Error loading events</Text>
      </Flex>
      
      <Flex v-else-if="recentProposalEvents.length === 0" direction="column" gap="8">
        <Text size="12" color="tertiary">No recent events</Text>
      </Flex>
      
      <Flex v-else direction="column" gap="8">
        <div 
          v-for="event in recentProposalEvents.slice(0, 10)" 
          :key="event.id"
          :class="$style.event_item"
        >
          <Flex align="center" gap="12">
            <Icon 
              :name="getEventIcon(event.type)" 
              size="14" 
              :color="getEventColor(event.type, event.status, event.participated)"
            />
            
            <Flex direction="column" gap="2" style="flex: 1;">
              <Flex align="center" justify="between">
                <Text size="12" weight="500" color="primary">
                  {{ getEventDescription(event) }}
                </Text>
                <Text size="11" color="tertiary">
                  {{ formatTime(event.timestamp) }}
                </Text>
              </Flex>
              
              <Flex align="center" justify="between">
                <Text size="11" color="secondary">
                  {{ truncateValidator(event.validatorName) }}
                </Text>
                <Text size="10" color="tertiary">
                  #{{ event.roundNumber }}
                </Text>
              </Flex>
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