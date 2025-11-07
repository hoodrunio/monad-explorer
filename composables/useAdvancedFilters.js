import { DateTime } from "luxon"

/**
 * Composable for managing advanced filter state and URL synchronization
 * @returns {Object} Filter state and utility functions
 */
export const useAdvancedFilters = () => {
	const route = useRoute()
	const router = useRouter()

	// Initialize filter state
	const filters = reactive({
		transaction_types: [],
		methods: [],
		age_from: null,
		age_to: null,
		from_addresses_include: [],
		from_addresses_exclude: [],
		to_addresses_include: [],
		to_addresses_exclude: [],
		address_relation: 'or',
		amount_from: null,
		amount_to: null,
		token_contracts_include: [],
		token_contracts_exclude: [],
	})

	// Available transaction types (based on API documentation)
	const transactionTypes = [
		{ id: 'coin_transfer', label: 'Coin Transfer' },
		{ id: 'ERC-20', label: 'ERC-20 Token' },
		{ id: 'ERC-404', label: 'ERC-404 Token' },
		{ id: 'ERC-721', label: 'ERC-721 NFT' },
		{ id: 'ERC-1155', label: 'ERC-1155 Multi Token' },
	]

	// Parse URL query params to filter state
	const parseUrlFilters = () => {
		const query = route.query

		// Transaction types
		if (query.tx_types) {
			filters.transaction_types = query.tx_types.split(',').filter(Boolean)
		}

		// Methods
		if (query.methods) {
			filters.methods = query.methods.split(',').filter(Boolean)
		}

		// Date range
		if (query.age_from) {
			try {
				filters.age_from = DateTime.fromISO(query.age_from).toJSDate()
			} catch (e) {
				console.warn('Invalid age_from:', e)
			}
		}
		if (query.age_to) {
			try {
				filters.age_to = DateTime.fromISO(query.age_to).toJSDate()
			} catch (e) {
				console.warn('Invalid age_to:', e)
			}
		}

		// From addresses
		if (query.from_include) {
			filters.from_addresses_include = query.from_include.split(',').filter(Boolean)
		}
		if (query.from_exclude) {
			filters.from_addresses_exclude = query.from_exclude.split(',').filter(Boolean)
		}

		// To addresses
		if (query.to_include) {
			filters.to_addresses_include = query.to_include.split(',').filter(Boolean)
		}
		if (query.to_exclude) {
			filters.to_addresses_exclude = query.to_exclude.split(',').filter(Boolean)
		}

		// Address relation
		if (query.addr_rel && ['or', 'and'].includes(query.addr_rel)) {
			filters.address_relation = query.addr_rel
		}

		// Amount range
		if (query.amt_from) {
			const val = parseFloat(query.amt_from)
			if (!isNaN(val)) filters.amount_from = val
		}
		if (query.amt_to) {
			const val = parseFloat(query.amt_to)
			if (!isNaN(val)) filters.amount_to = val
		}

		// Token contracts
		if (query.token_include) {
			filters.token_contracts_include = query.token_include.split(',').filter(Boolean)
		}
		if (query.token_exclude) {
			filters.token_contracts_exclude = query.token_exclude.split(',').filter(Boolean)
		}
	}

	// Serialize filter state to URL query params
	const serializeToUrl = () => {
		const query = {}

		if (filters.transaction_types.length > 0) {
			query.tx_types = filters.transaction_types.join(',')
		}

		if (filters.methods.length > 0) {
			query.methods = filters.methods.join(',')
		}

		if (filters.age_from) {
			query.age_from = DateTime.fromJSDate(filters.age_from).toISO()
		}

		if (filters.age_to) {
			query.age_to = DateTime.fromJSDate(filters.age_to).toISO()
		}

		if (filters.from_addresses_include.length > 0) {
			query.from_include = filters.from_addresses_include.join(',')
		}

		if (filters.from_addresses_exclude.length > 0) {
			query.from_exclude = filters.from_addresses_exclude.join(',')
		}

		if (filters.to_addresses_include.length > 0) {
			query.to_include = filters.to_addresses_include.join(',')
		}

		if (filters.to_addresses_exclude.length > 0) {
			query.to_exclude = filters.to_addresses_exclude.join(',')
		}

		if (filters.address_relation !== 'or') {
			query.addr_rel = filters.address_relation
		}

		if (filters.amount_from !== null && filters.amount_from !== '') {
			query.amt_from = filters.amount_from.toString()
		}

		if (filters.amount_to !== null && filters.amount_to !== '') {
			query.amt_to = filters.amount_to.toString()
		}

		if (filters.token_contracts_include.length > 0) {
			query.token_include = filters.token_contracts_include.join(',')
		}

		if (filters.token_contracts_exclude.length > 0) {
			query.token_exclude = filters.token_contracts_exclude.join(',')
		}

		return query
	}

	// Convert filter state to API params
	const toApiParams = () => {
		const params = {}

		if (filters.transaction_types.length > 0) {
			params.transaction_types = filters.transaction_types.join(',')
		}

		if (filters.methods.length > 0) {
			params.methods = filters.methods.join(',')
		}

		if (filters.age_from) {
			params.age_from = DateTime.fromJSDate(filters.age_from).toISO()
		}

		if (filters.age_to) {
			params.age_to = DateTime.fromJSDate(filters.age_to).toISO()
		}

		if (filters.from_addresses_include.length > 0) {
			params.from_address_hashes_to_include = filters.from_addresses_include.join(',')
		}

		if (filters.from_addresses_exclude.length > 0) {
			params.from_address_hashes_to_exclude = filters.from_addresses_exclude.join(',')
		}

		if (filters.to_addresses_include.length > 0) {
			params.to_address_hashes_to_include = filters.to_addresses_include.join(',')
		}

		if (filters.to_addresses_exclude.length > 0) {
			params.to_address_hashes_to_exclude = filters.to_addresses_exclude.join(',')
		}

		if (filters.address_relation) {
			params.address_relation = filters.address_relation
		}

		if (filters.amount_from !== null && filters.amount_from !== '') {
			params.amount_from = filters.amount_from
		}

		if (filters.amount_to !== null && filters.amount_to !== '') {
			params.amount_to = filters.amount_to
		}

		if (filters.token_contracts_include.length > 0) {
			params.token_contract_address_hashes_to_include = filters.token_contracts_include.join(',')
		}

		if (filters.token_contracts_exclude.length > 0) {
			params.token_contract_address_hashes_to_exclude = filters.token_contracts_exclude.join(',')
		}

		return params
	}

	// Update URL with current filter state
	const updateUrl = () => {
		const query = serializeToUrl()
		router.push({ query })
	}

	// Reset all filters
	const resetFilters = () => {
		filters.transaction_types = []
		filters.methods = []
		filters.age_from = null
		filters.age_to = null
		filters.from_addresses_include = []
		filters.from_addresses_exclude = []
		filters.to_addresses_include = []
		filters.to_addresses_exclude = []
		filters.address_relation = 'or'
		filters.amount_from = null
		filters.amount_to = null
		filters.token_contracts_include = []
		filters.token_contracts_exclude = []
	}

	// Check if any filters are active
	const hasActiveFilters = computed(() => {
		return (
			filters.transaction_types.length > 0 ||
			filters.methods.length > 0 ||
			filters.age_from !== null ||
			filters.age_to !== null ||
			filters.from_addresses_include.length > 0 ||
			filters.from_addresses_exclude.length > 0 ||
			filters.to_addresses_include.length > 0 ||
			filters.to_addresses_exclude.length > 0 ||
			filters.amount_from !== null ||
			filters.amount_to !== null ||
			filters.token_contracts_include.length > 0 ||
			filters.token_contracts_exclude.length > 0
		)
	})

	// Count active filters
	const activeFilterCount = computed(() => {
		let count = 0
		if (filters.transaction_types.length > 0) count++
		if (filters.methods.length > 0) count++
		if (filters.age_from !== null || filters.age_to !== null) count++
		if (filters.from_addresses_include.length > 0 || filters.from_addresses_exclude.length > 0) count++
		if (filters.to_addresses_include.length > 0 || filters.to_addresses_exclude.length > 0) count++
		if (filters.amount_from !== null || filters.amount_to !== null) count++
		if (filters.token_contracts_include.length > 0 || filters.token_contracts_exclude.length > 0) count++
		return count
	})

	return {
		filters,
		transactionTypes,
		parseUrlFilters,
		serializeToUrl,
		toApiParams,
		updateUrl,
		resetFilters,
		hasActiveFilters,
		activeFilterCount,
	}
}
