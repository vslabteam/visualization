document.addEventListener('DOMContentLoaded', function() {
  // 检查 G6 是否正确加载
  if (typeof G6 === 'undefined') {
    console.error('G6 未能正确加载');
    return;
  }
  
  console.log('G6 version:', G6.version);

  // 节点颜色配置
  const getNodeColor = (type) => {
    const colors = {
      account: '#91d5ff',
      transaction: '#87e8de',
      merchant: '#ffd591',
      default: '#d3adf7'
    };
    return colors[type] || colors.default;
  };

  // 注册不同类型的节点
  try {
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

          if (cfg.label) {
            group.addShape('text', {
              attrs: {
                text: cfg.label,
                x: 0,
                y: 35,
                textAlign: 'center',
                textBaseline: 'middle',
                fill: '#333',
                fontSize: 12
              },
              name: 'text-shape'
            });
          }

          return keyShape;
        },
      }, 'circle');
    });
  } catch (error) {
    console.error('注册节点时出错:', error);
  }

  // 创建图实例
  const graph = new G6.Graph({
    container: 'container',
    width: window.innerWidth,
    height: window.innerHeight,
    defaultNode: {
      type: 'account',
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
    layout: {
      type: 'force',
      preventOverlap: true,
      linkDistance: 100,
      nodeStrength: -50,
      edgeStrength: 0.1
    }
  });

  // 加载并处理 bankFraud.json 数据
  fetch('dataset/bankFraud.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      // 使用 DataWorker 处理数据
      const dataWorker = new DataWorker(data);
      const processedData = dataWorker.processData();
      
      // 渲染数据
      graph.data(processedData);
      graph.render();
    })
    .catch(error => {
      console.error('加载数据失败:', error);
      // 如果加载失败，使用示例数据
      const sampleData = {
        nodes: [
          { id: '1', label: '账户1', type: 'account' },
          { id: '2', label: '账户2', type: 'account' },
          { id: '3', label: '账户3', type: 'account' },
          { id: '4', label: '交易1', type: 'transaction' },
          { id: '5', label: '交易2', type: 'transaction' },
          { id: '6', label: '商户1', type: 'merchant' }
        ],
        edges: [
          { source: '1', target: '4' },
          { source: '4', target: '2' },
          { source: '2', target: '6' },
          { source: '3', target: '5' },
          { source: '5', target: '6' }
        ]
      };
      graph.data(sampleData);
      graph.render();
    });

  // 添加窗口大小改变的监听器
  window.addEventListener('resize', () => {
    if (graph) {
      graph.changeSize(window.innerWidth, window.innerHeight);
    }
  });
}); 