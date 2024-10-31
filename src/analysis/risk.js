import { CONFIG } from '../config';
import { EventBus } from '../utils/eventBus';

export const RiskAssessment = {
  calculateNodeRisk(node, edges) {
    let score = 0;

    // 交易金额异常
    const amounts = edges.map(e => e.amount || 0);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);
    if (maxAmount > avgAmount * 3) {
      score += 30;
    }

    // 交易频率异常
    const frequency = this.calculateTransactionFrequency(edges);
    if (frequency > 10) { // 每天超过10笔交易
      score += 20;
    }

    // 交易对手多样性
    const counterparties = new Set(edges.map(e => 
      e.source === node.id ? e.target : e.source
    ));
    if (counterparties.size > 10) {
      score += 20;
    }

    const finalScore = Math.min(100, score);
    EventBus.emit('risk:calculated', {
      nodeId: node.id,
      score: finalScore
    });

    return finalScore;
  },

  // 计算交易频率
  calculateTransactionFrequency(edges) {
    if (edges.length < 2) return 0;
    
    const timestamps = edges
      .filter(e => e.timestamp)
      .map(e => new Date(e.timestamp))
      .sort((a, b) => a - b);

    if (timestamps.length < 2) return 0;

    const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
    return edges.length / (timeSpan / (24 * 60 * 60 * 1000)); // 每天的交易频率
  },

  // 计算总体风险评分
  calculateOverallRisk(anomalies) {
    const riskScore = anomalies.reduce((score, anomaly) => {
      return score + (anomaly.severity || 1);
    }, 0);

    const riskLevel = riskScore > 50 ? "高风险" : 
                     riskScore > 20 ? "中风险" : "低风险";

    EventBus.emit('risk:overall-calculated', {
      score: riskScore,
      level: riskLevel
    });

    return riskLevel;
  }
}; 