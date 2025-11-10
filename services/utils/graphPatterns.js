/**
 * Graph Pattern Detection
 *
 * Platform-agnostic pattern detection based purely on transfer graph topology.
 *
 * Detects patterns like:
 * - Swaps (simple and multi-hop)
 * - Liquidity provision/removal
 * - Wrapping/unwrapping
 * - Generic transfers
 */

import { isBurnAddress, detectWrapPattern } from './transferGraph.js'

/**
 * Detect transaction pattern from graph topology
 * @param {Object} graph - Transfer graph from buildTransferGraph()
 * @param {Array} logs - Transaction logs (optional, for enrichment)
 * @returns {Object} Pattern with type, confidence, and metadata
 */
export function detectPattern(graph, logs = []) {
    if (graph.isEmpty) {
        return {
            type: 'EMPTY',
            confidence: 1.0,
            reason: 'No transfers',
        }
    }

    // Try wrap detection first (if has Deposit/Withdrawal events)
    const wrapPattern = detectWrapPattern(graph, logs)
    if (wrapPattern) {
        return wrapPattern
    }

    // Try LP operations (has mint/burn of LP tokens)
    const lpPattern = detectLPPattern(graph, logs)
    if (lpPattern) {
        return lpPattern
    }

    // Try swap detection (most common)
    const swapPattern = detectSwapPattern(graph, logs)
    if (swapPattern) {
        return swapPattern
    }

    // Fallback to generic transfer
    return detectGenericPattern(graph, logs)
}

/**
 * Detect LP (liquidity provision) patterns
 * Pattern: User sends 2 tokens → Pool, Pool sends LP token → User
 * Or reverse for removal
 */
function detectLPPattern(graph, logs) {
    // Look for mint/burn events
    const hasMint = logs.some(log => log.decoded?.name === 'Mint')
    const hasBurn = logs.some(log => log.decoded?.name === 'Burn')

    if (!hasMint && !hasBurn) return null

    // Find LP token transfers (ERC-20 with low liquidity or newly minted)
    const lpTokenTransfers = graph.edges.filter(edge => {
        // LP tokens are often minted from 0x0 or have specific patterns
        const from = edge.from
        const isFromZero = isBurnAddress(from)
        const isMintTransfer = isFromZero && hasMint
        const isBurnTransfer = isBurnAddress(edge.to) && hasBurn

        return isMintTransfer || isBurnTransfer
    })

    if (lpTokenTransfers.length === 0) return null

    // LP ADD: User → Pool (2 tokens) + Pool → User (1 LP token)
    if (hasMint) {
        const lpTransfer = lpTokenTransfers[0]
        const pool = lpTransfer.from === '0x0000000000000000000000000000000000000000'
            ? lpTransfer.to
            : lpTransfer.from

        // Find user's deposits to pool
        const deposits = graph.edges.filter(e =>
            e.to === pool &&
            e.from !== pool &&
            !isBurnAddress(e.from)
        )

        if (deposits.length >= 2) {
            return {
                type: 'LP_ADD',
                pool,
                user: deposits[0].from,
                lpToken: lpTransfer.token,
                depositedTokens: deposits.map(d => d.token),
                confidence: 0.85,
                reason: 'Mint event + multiple token deposits',
            }
        }
    }

    // LP REMOVE: User → Pool (LP token) + Pool → User (2 tokens)
    if (hasBurn) {
        const lpTransfer = lpTokenTransfers[0]
        const pool = isBurnAddress(lpTransfer.to) ? lpTransfer.from : lpTransfer.to
        const user = lpTransfer.from

        // Find withdrawals from pool to user
        const withdrawals = graph.edges.filter(e =>
            e.from === pool &&
            e.to === user &&
            e !== lpTransfer
        )

        if (withdrawals.length >= 2) {
            return {
                type: 'LP_REMOVE',
                pool,
                user,
                lpToken: lpTransfer.token,
                withdrawnTokens: withdrawals.map(w => w.token),
                confidence: 0.85,
                reason: 'Burn event + multiple token withdrawals',
            }
        }
    }

    return null
}

/**
 * Detect swap patterns
 * Simple: A → B → C (user swaps via pool)
 * With router: A → R → B → R → A (user → router → pool → router → user)
 * Multi-hop: A → P1 → P2 → ... → A (multiple pools)
 */
function detectSwapPattern(graph, logs) {
    const stats = getGraphStats(graph)

    // Look for Swap/Trade events as hints
    const swapEvents = logs.filter(log => {
        // Skip logs without decoded data
        if (!log.decoded) return false

        // Handle Vue Proxy objects - need to access the raw value
        const decoded = log.decoded

        // Get event name from method_call (format: "EventName(params...)")
        const methodCall = decoded?.method_call || ''
        const eventName = methodCall.split('(')[0]

        return eventName === 'Swap' || eventName === 'Trade' || eventName === 'CrocSwap'
    })

    // Pattern 1: Simple 2-4 node swap (includes burn address for mint/wrap scenarios)
    if (stats.nodeCount <= 4 && stats.tokenCount === 2) {
        const pattern = detectSimpleSwap(graph, swapEvents)
        if (pattern) return pattern
    }

    // Pattern 2: Multi-hop swap (multiple pools)
    if (stats.tokenCount >= 2) {
        const pattern = detectMultiHopSwap(graph, swapEvents)
        if (pattern) return pattern
    }

    return null
}

/**
 * Detect simple swap: User → Pool → User (or with router)
 */
function detectSimpleSwap(graph, swapEvents) {
    // Find pool (highest centrality or address in Swap event)
    let pool = null

    // Try to find pool from events
    if (swapEvents.length > 0) {
        // Handle both raw API format (address.hash) and transformed format (address string)
        pool = (typeof swapEvents[0].address === 'string'
            ? swapEvents[0].address
            : swapEvents[0].address?.hash)?.toLowerCase()
    }

    // Fallback: Find node with highest centrality
    if (!pool) {
        let maxCentrality = 0
        graph.nodes.forEach((node) => {
            if (node.centrality > maxCentrality && node.isIntermediary) {
                maxCentrality = node.centrality
                pool = node.address
            }
        })
    }

    if (!pool) return null

    // Find user (tx initiator)
    const user = graph.txFrom

    // Find tokens involved
    const poolNode = graph.nodes.get(pool)
    if (!poolNode) return null

    const tokensIn = Array.from(poolNode.inTokens)
    const tokensOut = Array.from(poolNode.outTokens)

    // Must have different tokens in and out
    if (tokensIn.length === 0 || tokensOut.length === 0) return null

    // Check if there's a router (intermediary between user and pool)
    const router = detectRouter(graph, user, pool)

    return {
        type: 'SWAP',
        pool,
        user,
        router,
        tokenIn: tokensIn[0],
        tokenOut: tokensOut[0],
        confidence: swapEvents.length > 0 ? 0.9 : 0.7,
        reason: swapEvents.length > 0 ? 'Swap event + topology' : 'Swap topology',
    }
}

/**
 * Detect multi-hop swap: User → Pool1 → Pool2 → ... → User
 */
function detectMultiHopSwap(graph, swapEvents) {
    // Multiple swap events = multi-hop
    if (swapEvents.length < 2) return null

    const pools = swapEvents.map(e => e.address?.toLowerCase()).filter(Boolean)
    const user = graph.txFrom

    // Trace path through pools
    const path = tracePath(graph, user, pools)

    if (!path || path.length < 2) return null

    return {
        type: 'MULTIHOP_SWAP',
        user,
        pools,
        path,
        confidence: 0.85,
        reason: `Multi-hop swap through ${pools.length} pools`,
    }
}

/**
 * Detect router (intermediary between user and pool)
 */
function detectRouter(graph, user, pool) {
    // Look for node that is between user and pool
    const candidates = []

    graph.nodes.forEach((node) => {
        if (node.address === user || node.address === pool) return

        // Pattern 1: Router receives from user and sends to pool
        const receivesFromUser = node.inEdges.some(e => e.from === user)
        const sendsToPool = node.outEdges.some(e => e.to === pool)

        // Pattern 2: Router is intermediary between pool and user
        // (common in wrap+swap where user doesn't directly send)
        const receivesFromNonUser = node.inEdges.some(e =>
            e.from !== user && e.from !== pool
        )
        const sendsToPoolOrFromPool =
            node.outEdges.some(e => e.to === pool) ||
            node.inEdges.some(e => e.from === pool)

        // Pattern 3: Node sends to pool and pool sends to user
        // (router is intermediary even if user doesn't send directly)
        const sendsToPoolAndUserReceives =
            node.outEdges.some(e => e.to === pool) &&
            graph.edges.some(e => e.from === pool && e.to === user)

        if (receivesFromUser && sendsToPool) {
            candidates.push({ address: node.address, score: 10 })
        } else if (sendsToPoolAndUserReceives && receivesFromNonUser) {
            candidates.push({ address: node.address, score: 8 })
        } else if (receivesFromNonUser && sendsToPoolOrFromPool) {
            candidates.push({ address: node.address, score: 5 })
        }
    })

    // Return highest scored candidate
    if (candidates.length === 0) return null
    candidates.sort((a, b) => b.score - a.score)
    return candidates[0].address
}

/**
 * Trace path through nodes
 */
function tracePath(graph, start, intermediaries) {
    const path = [start]
    let current = start

    for (const intermediate of intermediaries) {
        // Find edge from current to intermediate
        const edge = graph.edges.find(e => e.from === current && e.to === intermediate)
        if (!edge) break

        path.push(intermediate)
        current = intermediate
    }

    return path
}

/**
 * Detect generic transfer pattern (fallback)
 */
function detectGenericPattern(graph) {
    const stats = getGraphStats(graph)

    // Check if all transfers are NFTs
    const allNFT = graph.edges.every(e =>
        e.token?.type === 'ERC-721' || e.token?.type === 'ERC-1155'
    )

    if (allNFT) {
        return {
            type: 'NFT_TRANSFER',
            confidence: 1.0,
            reason: 'All transfers are NFTs',
            tokenCount: stats.tokenCount,
            nodeCount: stats.nodeCount,
        }
    }

    // Mixed or fungible token transfers
    return {
        type: 'TRANSFER',
        confidence: 0.5,
        reason: 'Generic token transfer',
        tokenCount: stats.tokenCount,
        nodeCount: stats.nodeCount,
    }
}

/**
 * Get graph statistics
 */
function getGraphStats(graph) {
    const allTokens = new Set()

    graph.edges.forEach(e => {
        if (e.token?.address) {
            allTokens.add(e.token.address)
        }
    })

    return {
        nodeCount: graph.nodes.size,
        edgeCount: graph.edges.length,
        tokenCount: allTokens.size,
    }
}

/**
 * Enrich pattern with event data (optional enhancement)
 * Adds extra metadata if events are available
 */
export function enrichPatternWithEvents(pattern, logs = []) {
    if (logs.length === 0) return pattern

    const enriched = { ...pattern }

    // Add event metadata
    const decodedLogs = logs.filter(log => log.decoded)
    enriched.eventCount = decodedLogs.length

    // Extract amounts from Swap events if available
    if (pattern.type === 'SWAP' || pattern.type === 'MULTIHOP_SWAP') {
        const swapEvent = decodedLogs.find(log =>
            log.decoded?.name === 'Swap' ||
            log.decoded?.name === 'Trade' ||
            log.decoded?.name === 'CrocSwap'
        )

        if (swapEvent) {
            enriched.eventDetails = extractSwapEventDetails(swapEvent)
            enriched.confidence = Math.min(enriched.confidence + 0.1, 1.0)
        }
    }

    // Extract amounts from Mint/Burn events
    if (pattern.type === 'LP_ADD' || pattern.type === 'LP_REMOVE') {
        const lpEvent = decodedLogs.find(log =>
            log.decoded?.name === 'Mint' || log.decoded?.name === 'Burn'
        )

        if (lpEvent) {
            enriched.eventDetails = extractLPEventDetails(lpEvent)
            enriched.confidence = Math.min(enriched.confidence + 0.1, 1.0)
        }
    }

    return enriched
}

/**
 * Extract details from Swap event
 * Platform-agnostic - extracts whatever parameters are available
 */
function extractSwapEventDetails(log) {
    const params = log.decoded?.parameters || []
    const details = {}

    params.forEach(param => {
        const name = param.name?.toLowerCase()

        // Extract amounts (multiple naming conventions)
        if (name?.includes('amount') || name?.includes('value') || name?.includes('qty')) {
            if (name.includes('in') || name.includes('0')) {
                details.amountIn = param.value
            } else if (name.includes('out') || name.includes('1')) {
                details.amountOut = param.value
            }
        }

        // Extract addresses
        if (name === 'sender' || name === 'from') {
            details.sender = param.value
        }
        if (name === 'recipient' || name === 'to' || name === 'dst') {
            details.recipient = param.value
        }

        // CrocSwap specific
        if (name === 'baseflow') details.baseFlow = param.value
        if (name === 'quoteflow') details.quoteFlow = param.value
    })

    return details
}

/**
 * Extract details from LP event
 */
function extractLPEventDetails(log) {
    const params = log.decoded?.parameters || []
    const details = {}

    params.forEach(param => {
        const name = param.name?.toLowerCase()

        if (name === 'sender') details.sender = param.value
        if (name === 'to' || name === 'recipient') details.recipient = param.value
        if (name?.includes('amount')) {
            if (!details.amounts) details.amounts = []
            details.amounts.push(param.value)
        }
        if (name === 'liquidity') details.liquidity = param.value
    })

    return details
}
