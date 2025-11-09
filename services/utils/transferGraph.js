/**
 * Transfer Graph Builder
 *
 * Platform-agnostic graph construction from token transfers.
 *
 * Graph structure:
 * - Nodes: Addresses involved in transfers
 * - Edges: Token flows (from → to with amount and token info)
 * - Metrics: Centrality, token diversity, flow patterns
 */

/**
 * Build a directed graph from token transfers
 * @param {Array} transfers - Token transfers from API
 * @param {Object} tx - Transaction metadata
 * @returns {Object} Graph with nodes, edges, and metrics
 */
export function buildTransferGraph(transfers, tx) {
    if (!transfers || transfers.length === 0) {
        return {
            nodes: new Map(),
            edges: [],
            isEmpty: true,
        }
    }

    const nodes = new Map()
    const edges = []

    // Build graph from transfers
    transfers.forEach((transfer, index) => {
        const from = transfer.from?.hash?.toLowerCase()
        const to = transfer.to?.hash?.toLowerCase()
        const amount = transfer.amount || transfer.total?.value || '0'
        const token = transfer.token


        // Skip invalid transfers
        if (!from || !to || from === to) return

        // Add/update nodes
        if (!nodes.has(from)) {
            nodes.set(from, createNode(from, transfer.from))
        }
        if (!nodes.has(to)) {
            nodes.set(to, createNode(to, transfer.to))
        }

        // Add edge
        // Handle multiple token address formats:
        // 1. token.address_hash (string) - API v2 format
        // 2. token.address.hash (object.hash) - nested format
        // 3. token.address (string) - direct format
        const tokenAddress = (
            token?.address_hash ||
            token?.address?.hash ||
            (typeof token?.address === 'string' ? token.address : null)
        )?.toLowerCase()

        const edge = {
            from,
            to,
            amount,
            token: {
                address: tokenAddress,
                symbol: token?.symbol,
                name: token?.name,
                type: token?.type,
                decimals: token?.decimals,
            },
            transferIndex: index,
        }
        edges.push(edge)

        // Update node metrics
        const fromNode = nodes.get(from)
        const toNode = nodes.get(to)

        fromNode.outDegree++
        fromNode.outTokens.add(tokenAddress)
        fromNode.outEdges.push(edge)

        toNode.inDegree++
        toNode.inTokens.add(tokenAddress)
        toNode.inEdges.push(edge)
    })

    // Calculate advanced metrics for each node
    nodes.forEach((node) => {
        calculateNodeMetrics(node, nodes, edges, tx)
    })

    return {
        nodes,
        edges,
        isEmpty: false,
        txFrom: tx?.from?.hash?.toLowerCase(),
        txTo: tx?.to?.hash?.toLowerCase(),
    }
}

/**
 * Create a node object for an address
 */
function createNode(address, addressInfo) {
    return {
        address,
        name: addressInfo?.name || null,

        // Degree metrics
        inDegree: 0,
        outDegree: 0,

        // Token diversity
        inTokens: new Set(),
        outTokens: new Set(),

        // Edge references
        inEdges: [],
        outEdges: [],

        // Calculated metrics (filled later)
        centrality: 0,
        isHub: false,
        isSource: false,
        isSink: false,
        isIntermediary: false,
        tokenDiversity: 0,

        // Role hints
        likelyRoles: [],
    }
}

/**
 * Calculate metrics for a node
 */
function calculateNodeMetrics(node, allNodes, _allEdges, tx) {
    const totalDegree = node.inDegree + node.outDegree

    // Centrality (normalized by total nodes)
    node.centrality = totalDegree / allNodes.size

    // Hub detection (high centrality + multiple tokens)
    node.isHub = node.centrality > 0.4 && (node.inTokens.size > 1 || node.outTokens.size > 1)

    // Source (only sends)
    node.isSource = node.outDegree > 0 && node.inDegree === 0

    // Sink (only receives)
    node.isSink = node.inDegree > 0 && node.outDegree === 0

    // Intermediary (receives and sends)
    node.isIntermediary = node.inDegree > 0 && node.outDegree > 0

    // Token diversity
    const uniqueTokens = new Set([...node.inTokens, ...node.outTokens])
    node.tokenDiversity = uniqueTokens.size

    // Detect likely roles based on patterns
    detectLikelyRoles(node, tx)
}

/**
 * Detect likely roles for a node based on transfer patterns
 * Platform-agnostic - uses only transfer topology
 */
function detectLikelyRoles(node, tx) {
    const roles = []
    const txFrom = tx?.from?.hash?.toLowerCase()

    // Transaction initiator
    if (node.address === txFrom) {
        roles.push({ role: 'user', confidence: 0.9, reason: 'Transaction initiator' })
    }

    // Hub with multiple tokens = likely pool or router
    if (node.isHub && node.tokenDiversity >= 2) {
        roles.push({ role: 'pool', confidence: 0.7, reason: 'High centrality with multiple tokens' })
    }

    // Only receives different token than sent = likely swap participant
    if (node.isIntermediary && node.tokenDiversity === 2) {
        const inTokens = Array.from(node.inTokens)
        const outTokens = Array.from(node.outTokens)

        // Different tokens in and out
        if (inTokens.length === 1 && outTokens.length === 1 && inTokens[0] !== outTokens[0]) {
            roles.push({ role: 'swap-participant', confidence: 0.8, reason: 'Received different token than sent' })
        }
    }

    // Pass-through (same token in and out, similar amounts)
    if (node.isIntermediary && node.inTokens.size === 1 && node.outTokens.size === 1) {
        const inToken = Array.from(node.inTokens)[0]
        const outToken = Array.from(node.outTokens)[0]

        if (inToken === outToken) {
            roles.push({ role: 'intermediary', confidence: 0.6, reason: 'Pass-through same token' })
        }
    }

    // Final recipient (only receives, not tx initiator)
    if (node.isSink && node.address !== txFrom) {
        roles.push({ role: 'recipient', confidence: 0.7, reason: 'Final recipient' })
    }

    node.likelyRoles = roles
}

/**
 * Get the most likely role for a node
 */
export function getMostLikelyRole(node) {
    if (!node.likelyRoles || node.likelyRoles.length === 0) {
        return { role: 'unknown', confidence: 0, reason: 'No pattern detected' }
    }

    // Sort by confidence and return highest
    return node.likelyRoles.sort((a, b) => b.confidence - a.confidence)[0]
}

/**
 * Find nodes by role
 */
export function findNodesByRole(graph, role) {
    const matches = []

    graph.nodes.forEach((node) => {
        const hasRole = node.likelyRoles.some(r => r.role === role)
        if (hasRole) {
            matches.push(node)
        }
    })

    return matches
}

/**
 * Get graph statistics
 */
export function getGraphStats(graph) {
    if (graph.isEmpty) {
        return {
            nodeCount: 0,
            edgeCount: 0,
            avgDegree: 0,
            maxDegree: 0,
            tokenCount: 0,
        }
    }

    const degrees = Array.from(graph.nodes.values()).map(n => n.inDegree + n.outDegree)
    const allTokens = new Set()

    graph.edges.forEach(e => {
        if (e.token?.address) {
            allTokens.add(e.token.address)
        }
    })

    return {
        nodeCount: graph.nodes.size,
        edgeCount: graph.edges.length,
        avgDegree: degrees.reduce((a, b) => a + b, 0) / degrees.length,
        maxDegree: Math.max(...degrees),
        tokenCount: allTokens.size,
    }
}

/**
 * Check if address is a burn address
 * Platform-agnostic detection
 */
export function isBurnAddress(address) {
    if (!address) return false
    const addr = address.toLowerCase()

    // Common burn addresses
    return (
        addr === '0x0000000000000000000000000000000000000000' ||
        addr === '0x000000000000000000000000000000000000dead' ||
        addr.match(/^0x0+$/) || // All zeros
        addr.match(/^0x(dead)+[0-9a-f]*$/) // Contains "dead"
    )
}

/**
 * Detect if this is a wrap/unwrap pattern
 * Platform-agnostic - looks for deposit/withdrawal with equal amounts
 */
export function detectWrapPattern(graph, logs) {
    // Look for Deposit or Withdrawal events
    const hasDepositOrWithdraw = logs?.some(log => {
        const eventType = log.decoded?.name
        return eventType === 'Deposit' || eventType === 'Withdrawal'
    })

    if (!hasDepositOrWithdraw) return null

    // Look for equal amount transfers in opposite directions
    const edges = graph.edges
    if (edges.length < 2) return null

    for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
            const e1 = edges[i]
            const e2 = edges[j]

            // Check if reverse direction
            if (e1.from === e2.to && e1.to === e2.from) {
                // Check if similar amounts (allow 1% difference for gas)
                const amount1 = BigInt(e1.amount || 0)
                const amount2 = BigInt(e2.amount || 0)

                if (amount1 > 0 && amount2 > 0) {
                    const ratio = Number((amount1 * 100n) / amount2)
                    if (ratio >= 99 && ratio <= 101) {
                        return {
                            type: 'WRAP',
                            wrapContract: e1.to,
                            user: e1.from,
                            tokenIn: e1.token,
                            tokenOut: e2.token,
                            confidence: 0.9,
                        }
                    }
                }
            }
        }
    }

    return null
}
