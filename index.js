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

  // 在现有代码中添加以下算法相关函数

  // 图算法实现
  const GraphAlgorithms = {
    // 中心度分析 - 使用G6内置的度中心性算法
    calculateCentrality(graph) {
      const nodes = graph.getNodes();
      const edges = graph.getEdges();
      
      // 使用G6内置的度中心性算法
      const degreeCentrality = G6.Algorithm.degreeCentrality(graph);
      
      // 将结果转换为数组并排序
      const sortedNodes = Object.entries(degreeCentrality)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      // 更新UI
      const top5List = document.getElementById('centralityTop5');
      top5List.innerHTML = '';
      sortedNodes.forEach(([nodeId, score]) => {
        const node = graph.findById(nodeId);
        const nodeInfo = node.getModel();
        const li = document.createElement('li');
        li.textContent = `${nodeInfo.label || nodeId}: ${score.toFixed(2)}`;
        li.className = 'highlight-node';
        top5List.appendChild(li);

        // 高亮重要节点
        graph.setItemState(node, 'highlight', true);
      });

      return sortedNodes;
    },

    // 社区检测 - 使用G6内置的Louvain算法
    detectCommunities(graph) {
      // 使用G6内置的Louvain社区检测算法
      const communities = G6.Algorithm.louvain(graph);
      
      // 统计社区信息
      const communityGroups = new Map();
      let maxSize = 0;

      communities.clusters.forEach((community, nodeId) => {
        if (!communityGroups.has(community)) {
          communityGroups.set(community, []);
        }
        communityGroups.get(community).push(nodeId);
        maxSize = Math.max(maxSize, communityGroups.get(community).length);
      });

      // 更新UI
      document.getElementById('communityCount').textContent = communityGroups.size;
      document.getElementById('maxCommunitySize').textContent = maxSize;

      // 为不同社区的节点设置不同颜色
      communityGroups.forEach((members, communityId) => {
        const color = `hsl(${(communityId * 360) / communityGroups.size}, 70%, 70%)`;
        members.forEach(nodeId => {
          const node = graph.findById(nodeId);
          if (node) {
            graph.updateItem(node, {
              style: {
                fill: color
              }
            });
          }
        });
      });

      return {
        communities: Array.from(communityGroups.values()),
        count: communityGroups.size,
        maxSize
      };
    },

    // 路径分析 - 使用G6内置的最短路径算法
    analyzePaths(graph) {
      const nodes = graph.getNodes();
      let totalLength = 0;
      let pathCount = 0;
      let maxLength = 0;

      // 使用G6内置的SPFA最短路径算法
      const shortestPathFinder = G6.Algorithm.SPFA;

      // 计算所有节点对之间的最短路径
      nodes.forEach((source, i) => {
        const sourceId = source.getModel().id;
        const paths = shortestPathFinder(graph, sourceId);
        
        nodes.forEach((target, j) => {
          if (i < j) {  // 只计算一次
            const targetId = target.getModel().id;
            const distance = paths[targetId]?.distance;
            
            if (distance && distance !== Infinity) {
              totalLength += distance;
              pathCount++;
              maxLength = Math.max(maxLength, distance);

              // 如果是最长路径，高亮显示
              if (distance === maxLength) {
                const path = paths[targetId].path;
                for (let k = 0; k < path.length - 1; k++) {
                  const edge = graph.findEdge(path[k], path[k + 1]);
                  if (edge) {
                    graph.setItemState(edge, 'highlight', true);
                  }
                }
              }
            }
          }
        });
      });

      const avgLength = pathCount > 0 ? totalLength / pathCount : 0;

      // 更新UI
      document.getElementById('avgPathLength').textContent = avgLength.toFixed(2);
      document.getElementById('maxPathLength').textContent = maxLength;

      return {
        avgLength,
        maxLength
      };
    }
  };

  // 运行算法的函数
  function runAlgorithm() {
    const algorithmType = document.getElementById('algorithmSelect').value;
    const button = document.querySelector('.control-button[onclick="runAlgorithm()"]');
    button.disabled = true;
    button.textContent = '计算中...';

    try {
      // 清除之前的高亮
      graph.getNodes().forEach(node => {
        graph.clearItemStates(node);
        graph.updateItem(node, {
          style: {
            fill: getNodeColor(node.getModel().type)
          }
        });
      });
      graph.getEdges().forEach(edge => {
        graph.clearItemStates(edge);
      });

      switch (algorithmType) {
        case 'centrality':
          GraphAlgorithms.calculateCentrality(graph);
          break;
        case 'community':
          GraphAlgorithms.detectCommunities(graph);
          break;
        case 'shortestPath':
          GraphAlgorithms.analyzePaths(graph);
          break;
        case 'cycle':
          alert('环路检测功能正在开发中');
          break;
      }
    } catch (error) {
      console.error('算法运行错误:', error);
      alert('算法运行出错，请查看控制台了解详情');
    } finally {
      button.disabled = false;
      button.textContent = '运行算法';
    }
  }

  // 将runAlgorithm函数绑定到window对象
  window.runAlgorithm = runAlgorithm;
}); 