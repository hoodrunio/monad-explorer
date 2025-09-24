/**
 * RPC Request Batcher
 * Batches multiple RPC calls to reduce rate limiting
 */

class RPCBatcher {
	constructor(delay = 100, maxBatchSize = 5) {
		this.delay = delay
		this.maxBatchSize = maxBatchSize
		this.queue = []
		this.processing = false
	}

	async add(fn) {
		return new Promise((resolve, reject) => {
			this.queue.push({ fn, resolve, reject })
			this.processQueue()
		})
	}

	async processQueue() {
		if (this.processing || this.queue.length === 0) return

		this.processing = true

		while (this.queue.length > 0) {
			const batch = this.queue.splice(0, this.maxBatchSize)
			
			// Process batch with delay
			const results = await Promise.allSettled(
				batch.map(async (item) => {
					try {
						const result = await item.fn()
						item.resolve(result)
						return result
					} catch (error) {
						item.reject(error)
						throw error
					}
				})
			)

			// Add delay between batches
			if (this.queue.length > 0) {
				await new Promise(resolve => setTimeout(resolve, this.delay))
			}
		}

		this.processing = false
	}
}

// Global batcher instance
export const rpcBatcher = new RPCBatcher(200, 3) // 200ms delay, max 3 calls per batch
