import { EventBus } from './eventBus';
import { NODE_TYPES } from '../constants';

export const DataProcessor = {
  preprocessData(rawData) {
    // 节点类型映射
    const classToType = {
      'Account Holder': 'account',
      'Credit Card': 'credit-card',
      'Payment': 'payment',
      'Loan': 'loan',
      'New Account': 'new-account',
      'Bank branch': 'bank',
      'address': 'address',
      'phone Number': 'phone',
      'Merchant': 'merchant'
    };

    return {
      nodes: rawData.nodes.map(node => ({
        ...node,
        id: String(node.id),
        type: classToType[node.class] || 'default',
        label: node.info?.name || node.info?.amount || node.info?.address || node.info?.phone || `${node.class} ${node.id}`,
        x: node.x,
        y: node.y
      })),
      edges: rawData.edges.map(edge => ({
        ...edge,
        source: String(edge.source),
        target: String(edge.target)
      }))
    };
  },

  loadData(graph, url) {
    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log('成功获取数据文件');
        return response.json();
      })
      .then(data => {
        console.log('原始数据:', data);
        const processedData = this.preprocessData(data);
        console.log('处理后的数据:', processedData);
        
        if (!processedData.nodes || !processedData.edges) {
          throw new Error('数据格式不正确');
        }
        
        graph.data(processedData);
        graph.render();
        EventBus.emit('data:loaded', { data: processedData });
        return processedData;
      });
  }
}; 