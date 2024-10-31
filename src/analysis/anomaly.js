import { CONFIG } from '../config';
import { EventBus } from '../utils/eventBus';

export const AnomalyDetection = {
  // 检测异常交易模式
  detectAnomalies(graph) {
    const data = graph.save();
    const anomalies = [];

    // 检测循环交易
    const cycles = this.detectCycles(data);
    if (cycles.length > 0) {
      anomalies.push({
        type: 'cycle',
        description: '发现循环交易',
        paths: cycles,
        severity: this.calculateCycleSeverity(cycles)
      });
    }

    // 检测快速连续交易
    const rapidTransactions = this.detectRapidTransactions(data);
    if (rapidTransactions.length > 0) {
      anomalies.push({
        type: 'rapid',
        description: '发现快速连续交易',
        transactions: rapidTransactions,
        severity: this.calculateTransactionSeverity(rapidTransactions)
      });
    }

    return anomalies;
  },

  // 检测循环交易
  detectCycles(data) {
    const cycles = [];
    const visited = new Set();
    const stack = new Set();

    const dfs = (nodeId, path = []) => {
      if (stack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          cycles.push({
            path: path.slice(cycleStart),
            type: this.analyzeCycleType(path.slice(cycleStart), data),
            risk: this.calculateCycleRisk(path.slice(cycleStart), data)
          });
        }
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      stack.add(nodeId);
      path.push(nodeId);

      const edges = data.edges.filter(edge => edge.source === nodeId);
      for (const edge of edges) {
        dfs(edge.target, [...path]);
      }

      stack.delete(nodeId);
      path.pop();
    };

    data.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    });

    return cycles;
  },

  // 检测快速连续交易
  detectRapidTransactions(data) {
    const rapidTransactions = [];
    const timeWindow = 300000; // 5分钟内
    const minTransactions = 3; // 最少3笔交易

    // 按账户分组交易
    const accountTransactions = {};
    data.edges.forEach(edge => {
      if (edge.source && edge.timestamp) {
        if (!accountTransactions[edge.source]) {
          accountTransactions[edge.source] = [];
        }
        accountTransactions[edge.source].push({
          time: new Date(edge.timestamp).getTime(),
          edge: edge
        });
      }
    });

    // 检测快速连续交易
    Object.entries(accountTransactions).forEach(([accountId, transactions]) => {
      transactions.sort((a, b) => a.time - b.time);
      
      for (let i = 0; i < transactions.length - minTransactions + 1; i++) {
        const windowTransactions = transactions.slice(i, i + minTransactions);
        const timeSpan = windowTransactions[windowTransactions.length - 1].time - windowTransactions[0].time;
        
        if (timeSpan <= timeWindow) {
          rapidTransactions.push({
            accountId,
            transactions: windowTransactions.map(t => t.edge),
            timeSpan
          });
        }
      }
    });

    return rapidTransactions;
  },

  // 添加事件监听
  initialize(graph) {
    this.graph = graph;
    EventBus.on('anomaly:detected', this.handleAnomalyDetected.bind(this));
  }
}; 