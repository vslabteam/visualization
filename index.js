document.addEventListener('DOMContentLoaded', function() {
  // 检查 G6 是否正确加载
  if (typeof G6 === 'undefined') {
    console.error('G6 未能正确加载');
    return;
  }
  
  console.log('G6 version:', G6.version);

  // 创建图实例
  const graph = new G6.Graph({
    container: 'container',
    width: 800,
    height: 600,
    defaultNode: {
      type: 'circle',
      size: 40,
      style: {
        fill: '#91d5ff',
        stroke: '#5b8ff9',
        lineWidth: 2,
      },
      labelCfg: {
        position: 'bottom',
        offset: 10,
        style: {
          fill: '#333',
  // 注册不同类型的节点
  const registerCustomNodes = () => {
    const nodeTypes = ['account', 'transaction', 'merchant', 'default'];
    
    nodeTypes.forEach(type => {
      G6.registerNode(type, {
        draw(cfg, group) {
          const keyShape = group.addShape('circle', {
            attrs: {
              x: 0,
              y: 0,
              r: 20,
              fill: getNodeColor(type),
              stroke: '#5b8ff9',
            },
            name: 'circle-shape',
          });

          // 添加图标
          group.addShape('image', {
            attrs: {
              x: -12,
              y: -12,
              width: 24,
              height: 24,
              img: `images/${type}.svg`
            },
            name: 'icon-shape',
          });

          return keyShape;
        },
      }, 'circle');
    });
  };

  const getNodeColor = (type) => {
    const colors = {
      account: '#91d5ff',
      transaction: '#87e8de',
      merchant: '#ffd591',
      default: '#d3adf7'
    };
    return colors[type] || colors.default;
  };

  try {
    registerCustomNodes();
  } catch (error) {
    console.error('注册节点时出错:', error);
  }

  // 创建图实例
  const graph = new G6.Graph({
    container: 'container',
    width: 800,
    height: 600,
    defaultNode: {
      type: 'default',
      size: 40,
      labelCfg: {
        position: 'bottom',
        offset: 10,
        style: {
          fill: '#333',
          fontSize: 12,
        },
      },
    },
    defaultEdge: {
      type: 'line',
      style: {
        stroke: '#e2e2e2',
        lineWidth: 1,
        endArrow: true,
      },
    },
    modes: {
      default: ['drag-canvas', 'zoom-canvas', 'drag-node'],
    },
  });

  // 使用 DataWorker 处理数据
  const processAndRenderData = (rawData) => {
    try {
      const dataWorker = new DataWorker(rawData);
      const processedData = dataWorker.processData();
      graph.data(processedData);
      graph.render();
    } catch (error) {
      console.error('数据处理错误:', error);
    }
  };

  // 测试数据
  const testData = {
    nodes: [
      { id: '1', class: 'account', x: 100, y: 100 },
      { id: '2', class: 'transaction', x: 200, y: 200 },
      { id: '3', class: 'merchant', x: 300, y: 100 }
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '2', target: '3' }
    ]
  };

  processAndRenderData(testData);

  // 创建示例数据
  const sampleData = {
    nodes: [
      { id: '1', label: '账户1', type: 'account' },
      { id: '2', label: '账户2', type: 'account' },
      { id: '3', label: '交易1', type: 'transaction' },
      { id: '4', label: '商户1', type: 'merchant' }
    ],
    edges: [
      { source: '1', target: '3' },
      { source: '3', target: '2' },
      { source: '2', target: '4' }
    ]
  };

  // 初始化图实例
  const graph = window.graph;

  // 如果没有成功加载数据文件，使用示例数据
  if (!graph.get('data')) {
    const dataWorker = new DataWorker(sampleData);
    const processedData = dataWorker.processData();
    graph.data(processedData);
    graph.render();
  }
}); 