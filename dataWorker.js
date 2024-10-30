class DataWorker {
    constructor(rawData) {
        if (!rawData || !rawData.nodes || !Array.isArray(rawData.nodes)) {
            throw new Error('Invalid data format: missing or invalid nodes array');
        }
        this.rawData = rawData;
    }

    processData() {
        try {
            const nodes = this.rawData.nodes.map(node => ({
                id: String(node.id),
                label: node.class || `Node ${node.id}`,
                type: this.getNodeType(node.class),
                data: {
                    info: node.info,
                    enter: node.enter,
                    exit: node.exit
                },
                x: node.x,
                y: node.y
            }));

            const edges = (this.rawData.edges || []).map((edge, index) => ({
                id: `edge-${index}`,
                source: String(edge.source),
                target: String(edge.target)
            }));

            const validEdges = this.validateEdges(edges, nodes);

            return {
                nodes,
                edges: validEdges
            };
        } catch (error) {
            console.error('Data processing error:', error);
            throw error;
        }
    }

    getNodeType(nodeClass) {
        if (!nodeClass) return 'default';
        
        const classLower = nodeClass.toLowerCase();
        if (classLower.includes('account')) return 'account';
        if (classLower.includes('payment') || classLower.includes('transaction')) return 'transaction';
        if (classLower.includes('merchant')) return 'merchant';
        return 'default';
    }

    validateEdges(edges, nodes) {
        const nodeIds = new Set(nodes.map(n => n.id));
        return edges.filter(edge => {
            const sourceExists = nodeIds.has(edge.source);
            const targetExists = nodeIds.has(edge.target);
            if (!sourceExists || !targetExists) {
                console.warn(`Invalid edge: ${edge.source} -> ${edge.target}`);
            }
            return sourceExists && targetExists;
        });
    }
}

if (typeof window !== 'undefined') {
    window.DataWorker = DataWorker;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataWorker;
} 