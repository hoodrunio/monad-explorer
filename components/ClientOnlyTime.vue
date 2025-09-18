<template>
  <ClientOnly>
    <slot />
    <template #fallback>
      <Text v-if="fallbackText" :size="fallbackSize" :color="fallbackColor">
        {{ fallbackText }}
      </Text>
      <span v-else>...</span>
    </template>
  </ClientOnly>
</template>

<script setup>
defineProps({
  fallbackText: {
    type: String,
    default: ''
  },
  fallbackSize: {
    type: String,
    default: '11'
  },
  fallbackColor: {
    type: String,
    default: 'tertiary'
  }
})
</script>
