document.addEventListener('DOMContentLoaded', function() {
  // 检查 G6 是否正确加载
  if (typeof G6 === 'undefined') {
    console.error('G6 未能正确加载');
    return;
  }
  
  console.log('G6 version:', G6.version);

  // 修改统计信息的函数
  const updateStats = (data) => {
    document.getElementById('nodeCount').textContent = data.nodes.length;
    document.getElementById('edgeCount').textContent = data.edges.length;
    document.getElementById('accountCount').textContent = 
      data.nodes.filter(node => node.type === 'account').length;
    document.getElementById('transactionCount').textContent = 
      data.nodes.filter(node => node.type === 'payment').length;
    document.getElementById('merchantCount').textContent = 
      data.nodes.filter(node => node.type === 'merchant').length;
  };

  // 修改节点颜色配置
  const getNodeColor = (type) => {
    const colors = {
      'account': '#91d5ff',
      'credit-card': '#ffd591',
      'payment': '#87e8de',
      'loan': '#ff7875',
      'new-account': '#95de64',
      'bank': '#69c0ff',
      'address': '#b7eb8f',
      'phone': '#adc6ff',
      'merchant': '#ffadd2',
      'default': '#d3adf7'
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

          if (cfg.label) {
            group.addShape('text', {
              attrs: {
                text: cfg.label,
                x: 0,
                y: 30,
                textAlign: 'center',
                textBaseline: 'middle',
                fill: '#666',
                fontSize: 12
              },
              name: 'text-shape'
            });
          }

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

  // 创建图实例
  const graph = new G6.Graph({
    container: 'container',
    width: document.querySelector('.center-panel').offsetWidth,
    height: document.querySelector('.center-panel').offsetHeight,
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

  // 定义控制函数
  const graphControls = {
    zoomIn: () => graph.zoom(1.2),
    zoomOut: () => graph.zoom(0.8),
    resetZoom: () => graph.zoomTo(1),
    fitView: () => graph.fitView(),
    toggleNodeLabels: () => {
      showLabels = !showLabels;
      graph.refresh();
    },
    updateNodeSize: (size) => {
      graph.updateNodes(graph.getNodes(), node => ({
        size: Number(size)
      }));
    },
    updateEdgeWidth: (width) => {
      graph.updateEdges(graph.getEdges(), edge => ({
        style: {
          ...edge.getModel().style,
          lineWidth: Number(width)
        }
      }));
    }
  };

  // 将控制函数绑定到 window 对象
  Object.assign(window, graphControls);

  // 修改数据预处理函数
  const preprocessData = (rawData) => {
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
        // 保留原始坐标信息
        x: node.x,
        y: node.y
      })),
      edges: rawData.edges.map(edge => ({
        ...edge,
        source: String(edge.source),
        target: String(edge.target)
      }))
    };
  };

  // 修改数据加载部分
  fetch('./dataset/bankFraud.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log('成功获取数据文件');
      return response.json();
    })
    .then(data => {
      console.log('原始数据:', data); // 打印原始数据
      const processedData = preprocessData(data);
      console.log('处理后的数据:', processedData); // 打印处理后的数据
      
      if (!processedData.nodes || !processedData.edges) {
        throw new Error('数据格式不正确');
      }
      
      graph.data(processedData);
      graph.render();
      updateStats(processedData);
    })
    .catch(error => {
      console.error('加载数据失败，详细错误:', error);
      console.error('错误堆栈:', error.stack);
      
      // 使用示例数据作为后备
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
      graph.data(sampleData);
      graph.render();
      updateStats(sampleData);
    });

  // 添加窗口大小改变的监听器
  window.addEventListener('resize', () => {
    if (graph) {
      const container = document.querySelector('.center-panel');
      graph.changeSize(container.offsetWidth, container.offsetHeight);
    }
  });
}); 