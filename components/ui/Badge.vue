<template>
	<Flex align="center" gap="8" :class="$style.wrapper">
		<slot />
	</Flex>
</template>

<style module>
.wrapper {
	height: 26px;
	width: fit-content;
	min-width: 0;
	max-width: 100%;

	background: linear-gradient(var(--op-8), var(--op-3));
	box-shadow: inset 0 0 0 1px var(--op-5);
	border-radius: 6px;

	padding: 0 8px;
}
</style>
