<script setup>
import { ref } from 'vue'

/** API */
// This would fetch from the /events endpoint
const events = ref([
  {
    id: 1,
    type: 'validator_joined',
    validator: 'validator_123abc456def',
    timestamp: '2024-01-15T10:30:00Z',
    details: 'New validator joined the network',
    blockHeight: 12457
  },
  {
    id: 2,
    type: 'performance_warning',
    validator: 'validator_456def789ghi',
    timestamp: '2024-01-15T10:25:00Z',
    details: 'Uptime score dropped below 95%',
    blockHeight: 12456
  },
  {
    id: 3,
    type: 'consensus_participation',
    validator: 'validator_789ghi123jkl',
    timestamp: '2024-01-15T10:20:00Z',
    details: 'Missing QC participation',
    blockHeight: 12455
  },
  {
    id: 4,
    type: 'block_proposal',
    validator: 'validator_101jkl456mno',
    timestamp: '2024-01-15T10:15:00Z',
    details: 'Successfully proposed block #12454',
    blockHeight: 12454
  },
  {
    id: 5,
    type: 'validator_slashed',
    validator: 'validator_222pqr789stu',
    timestamp: '2024-01-15T10:10:00Z',
    details: 'Validator slashed for double signing',
    blockHeight: 12453
  }
])

const getEventIcon = (type) => {
  switch (type) {
    case 'validator_joined': return 'plus-circle'
    case 'performance_warning': return 'warning'
    case 'consensus_participation': return 'clock'
    case 'block_proposal': return 'check-circle'
    case 'validator_slashed': return 'x-circle'
    default: return 'info'
  }
}

const getEventColor = (type) => {
  switch (type) {
    case 'validator_joined': return 'green'
    case 'performance_warning': return 'yellow'
    case 'consensus_participation': return 'red'
    case 'block_proposal': return 'blue'
    case 'validator_slashed': return 'red'
    default: return 'tertiary'
  }
}

const truncateValidator = (validator) => {
  return `${validator.slice(0, 8)}...${validator.slice(-6)}`
}
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Flex align="center" justify="between">
        <Text size="16" weight="600" color="primary">Recent Network Events</Text>
        <NuxtLink to="/validators" :class="$style.view_all_link">
          <Text size="14" color="secondary">View Validators</Text>
        </NuxtLink>
      </Flex>
      
      <div :class="$style.table_container">
        <table :class="$style.events_table_grid">
          <thead>
            <tr>
              <th>Type</th>
              <th>Validator</th>
              <th>Details</th>
              <th>Block</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in events" :key="event.id" :class="$style.event_row">
              <td :class="$style.type_cell">
                <Flex align="center" gap="8">
                  <Icon 
                    :name="getEventIcon(event.type)" 
                    size="14" 
                    :color="getEventColor(event.type)"
                  />
                  <Text size="12" color="primary" style="text-transform: capitalize;">
                    {{ event.type.replace('_', ' ') }}
                  </Text>
                </Flex>
              </td>
              
              <td :class="$style.validator_cell">
                <NuxtLink to="/validators" :class="$style.validator_link">
                  <Text size="12" color="secondary">
                    {{ truncateValidator(event.validator) }}
                  </Text>
                </NuxtLink>
              </td>
              
              <td :class="$style.details_cell">
                <Text size="12" color="primary">
                  {{ event.details }}
                </Text>
              </td>
              
              <td :class="$style.block_cell">
                <NuxtLink to="/blocks" :class="$style.block_link">
                  <Text size="12" color="tertiary" :class="$style.block_height">
                    #{{ event.blockHeight.toLocaleString("en-US") }}
                  </Text>
                </NuxtLink>
              </td>
              
              <td :class="$style.time_cell">
                <Text size="11" color="tertiary">
                  {{
                    new Date(event.timestamp).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  }}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Flex>
  </div>
</template>

<style module>
.wrapper {
  padding: 20px;
  background: var(--card-background);
  border-radius: 12px;
}

.table_container {
  overflow-x: auto;
}

.events_table_grid {
  width: 100%;
  border-collapse: collapse;
}

.events_table_grid th {
  text-align: left;
  padding: 12px 8px;
  border-bottom: 1px solid var(--op-10);
  color: var(--txt-tertiary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.events_table_grid td {
  padding: 12px 8px;
  border-bottom: 1px solid var(--op-5);
}

.event_row:hover {
  background: var(--op-3);
}

.validator_link, .block_link {
  text-decoration: none;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
}

.view_all_link {
  text-decoration: none;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
}

.type_cell {
  min-width: 140px;
}

.validator_cell {
  min-width: 120px;
}

.details_cell {
  min-width: 200px;
}

.block_cell {
  min-width: 80px;
}

.time_cell {
  min-width: 140px;
}

.block_height {
  font-weight: 600;
}
</style> 