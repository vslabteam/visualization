class DataWorker {
    constructor(rawData) {
        this.rawData = rawData;
    }

    processData() {
        if (!this.rawData) {
            return {
                nodes: [],
                edges: []
            };
        }

        try {
            return {
                nodes: this.rawData.nodes || [],
                edges: this.rawData.edges || []
            };
        } catch (error) {
            console.error('数据处理错误:', error);
            return {
                nodes: [],
                edges: []
            };
        }
    }
}

if (typeof window !== 'undefined') {
    window.DataWorker = DataWorker;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataWorker;
}