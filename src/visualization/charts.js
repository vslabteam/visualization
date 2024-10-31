import G2 from '@antv/g2';
import { EventBus } from '../utils/eventBus';

export const ChartVisualization = {
  charts: {
    timeDistribution: null,
    amountDistribution: null,
    networkTopology: null,
    riskDistribution: null
  },

  // 初始化图表
  initialize() {
    this.charts.timeDistribution = this.createTimeDistributionChart();
    this.charts.amountDistribution = this.createAmountDistributionChart();
    this.charts.networkTopology = this.createNetworkTopologyChart();
    this.charts.riskDistribution = this.createRiskDistributionChart();
    EventBus.on('data:updated', this.updateCharts.bind(this));
  },

  // 创建时间分布图表
  createTimeDistributionChart() {
    return new G2.Chart({
      container: 'timeDistributionChart',
      autoFit: true,
      height: 200,
      padding: [20, 20, 30, 40]
    });
  },

  // 创建金额分布图表
  createAmountDistributionChart() {
    return new G2.Chart({
      container: 'amountDistributionChart',
      autoFit: true,
      height: 200,
      padding: [20, 20, 30, 40]
    });
  },

  // 创建网络拓扑图表
  createNetworkTopologyChart() {
    return new G2.Chart({
      container: 'networkTopologyChart',
      autoFit: true,
      height: 200,
      padding: [20, 20, 30, 40]
    });
  },

  // 创建风险分布图表
  createRiskDistributionChart() {
    return new G2.Chart({
      container: 'riskDistributionChart',
      autoFit: true,
      height: 200,
      padding: [20, 20, 30, 40]
    });
  },

  // 更新所有图表
  updateCharts(data) {
    this.updateTimeDistribution(data);
    this.updateAmountDistribution(data);
    this.updateNetworkTopology(data);
    this.updateRiskDistribution(data);
  },

  // 更新时间分布图表
  updateTimeDistribution(data) {
    const timeData = this.processTimeData(data);
    this.charts.timeDistribution.data(timeData);
    this.charts.timeDistribution.interval()
      .position('hour*count')
      .color('count', '#1890ff-#69c0ff')
      .label('count');
    this.charts.timeDistribution.render();
  },

  // 处理时间数据
  processTimeData(data) {
    const hourlyStats = new Array(24).fill(0);
    data.edges
      .filter(edge => edge.timestamp)
      .forEach(edge => {
        const hour = new Date(edge.timestamp).getHours();
        hourlyStats[hour]++;
      });
    
    return hourlyStats.map((count, hour) => ({
      hour: `${hour}:00`,
      count
    }));
  }
}; 