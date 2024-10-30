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

  try {
    registerCustomNodes();
  } catch (error) {
    console.error('注册节点时出错:', error);
  }

  // 创建图实例（只创建一次）
  const graph = new G6.Graph({
    container: 'container',
    width: window.innerWidth,
    height: window.innerHeight,
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
    layout: {
      type: 'force',
      preventOverlap: true,
      linkDistance: 100,
      nodeStrength: -50,
      edgeStrength: 0.1
    }
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

  // 初始化和加载数据
  const graph = initGraph();
  if (graph) {
    // 加载 bankFraud.json 数据
    fetch('./dataset/bankFraud.json')
        .then(response => response.json())
        .then(data => {
            const dataWorker = new DataWorker(data);
            const processedData = dataWorker.processData();
            graph.data(processedData);
            graph.render();
            updateStats(processedData);
        })
        .catch(error => {
            console.error('加载数据失败:', error);
            // 如果加载失败，使用示例数据作为后备
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
            const dataWorker = new DataWorker(sampleData);
            const processedData = dataWorker.processData();
            graph.data(processedData);
            graph.render();
            updateStats(processedData);
        });
  }

  // 添加窗口大小改变的监听器
  window.addEventListener('resize', () => {
    if (graph) {
      graph.changeSize(window.innerWidth, window.innerHeight);
    }
  });
}); 