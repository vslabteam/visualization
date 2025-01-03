// 在文件开头添加 toggleSection 函数的定义
window.toggleSection = function(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  
  const header = section.previousElementSibling;
  const icon = header.querySelector('.toggle-icon');
  
  // 切换折叠状态
  section.classList.toggle('collapsed');
  
  // 更新图标
  if (icon) {
    icon.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
  }
  
  // 保存状态到本地存储
  const sectionStates = JSON.parse(localStorage.getItem('sectionStates') || '{}');
  sectionStates[sectionId] = !section.classList.contains('collapsed');
  localStorage.setItem('sectionStates', JSON.stringify(sectionStates));
};

// 等待 DOM 加载完成后再初始化
document.addEventListener('DOMContentLoaded', function() {
  // 首先定义 RenderOptimizer
  const RenderOptimizer = {
    // 基础渲染优化
    enableBasicOptimizations() {
      if (!graph || !graph.getNodes) return;

      // 节点数量大时禁用动画
      if (graph.getNodes().length > 1000) {
        graph.updateLayout({
          animate: false
        });
      }

      // 使用 GPU 加速
      const canvas = graph.get('canvas');
      if (canvas) {
        canvas.set('enableCSSTransforms', true);
      }
    },

    // 根据缩放级别调整节点细节
    adjustNodeDetail(node, zoom) {
      if (!node || !node.getModel) return;
      
      if (zoom < 0.5) {
        graph.updateItem(node, {
          labelCfg: { style: { opacity: 0 } },
          style: { lineWidth: 1 }
        });
      } else if (zoom < 1) {
        graph.updateItem(node, {
          labelCfg: { style: { opacity: 0.5 } },
          style: { lineWidth: 2 }
        });
      } else {
        graph.updateItem(node, {
          labelCfg: { style: { opacity: 1 } },
          style: { lineWidth: 3 }
        });
      }
    }
  };

  // 获取容器元素
  const container = document.getElementById('container');
  
  if (!container) {
    console.error('找不到容器元素');
    return;
  }

  // 清空容器
  container.innerHTML = '';
  
  // 设置容器样式
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.minHeight = '500px';
  container.style.background = '#fff';
  container.style.position = 'relative';

  console.log('G6 version:', G6.version);

  // 修改图实例初始化代码
  const graph = new G6.Graph({
    container: 'container', // 使用容器的 ID
    width: container.offsetWidth,
    height: container.offsetHeight,
    // 移除 autofit 配置
    fitView: true,
    fitViewPadding: [20, 40, 20, 40],
    // 使用 canvas 渲染器
    renderer: 'canvas',
    // 修改布局配置
    layout: {
      type: 'force',
      preventOverlap: true,
      nodeStrength: -50,
      edgeStrength: 0.1,
      linkDistance: 100,
      // 移除布局回调
      alphaDecay: 0.01,
      alphaMin: 0.001
    },
    // 修改默认节点配置
    defaultNode: {
      size: 30,
      style: {
        fill: '#91d5ff',
        stroke: '#40a9ff',
        lineWidth: 2
      },
      labelCfg: {
        style: {
          fill: '#333',
          fontSize: 12
        }
      }
    },
    // 修改默认边配置
    defaultEdge: {
      style: {
        stroke: '#91d5ff',
        lineWidth: 2,
        endArrow: true
      },
      labelCfg: {
        style: {
          fill: '#666',
          fontSize: 10
        }
      }
    },
    // 添加基础交互模式
    modes: {
      default: ['drag-canvas', 'zoom-canvas', 'drag-node', 'click-select']
    }
  });

  // 添加容器大小变化监听
  window.addEventListener('resize', () => {
    if (!graph || graph.get('destroyed')) return;
    const container = document.getElementById('container');
    if (!container) return;
    
    graph.changeSize(container.offsetWidth, container.offsetHeight);
    graph.fitView();
  });

  // 添加图实例就绪检查
  graph.on('afterrender', () => {
    const canvas = document.querySelector('#container canvas');
    if (canvas) {
      console.log('Canvas 创建成功:', {
        width: canvas.width,
        height: canvas.height,
        style: canvas.style.cssText
      });
    } else {
      console.error('Canvas 未能创建');
      // 尝试重新初始化
      setTimeout(() => {
        graph.render();
      }, 100);
    }
  });

  // 创建并初始化 ResizeObserver
  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      const { width, height } = entry.contentRect;
      console.log('容器大小变化:', width, height);
      if (graph) {
        graph.changeSize(width, height);
      }
    }
  });

  // 开始观察容器大小变化
  resizeObserver.observe(container);

  // 在数据加载前显示加载提示
  const loadingContainer = document.createElement('div');
  loadingContainer.className = 'loading-container';
  loadingContainer.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-text">数据加载中...</div>
  `;
  container.appendChild(loadingContainer);

  // 初始化时调用基础优化
  RenderOptimizer.enableBasicOptimizations();

  // 添加缩放事件监听
  graph.on('afterzoom', (e) => {
    const zoom = e.getZoom ? e.getZoom() : 1;
    graph.getNodes().forEach(node => {
      RenderOptimizer.adjustNodeDetail(node, zoom);
    });
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

  // 将控制函数定到 window 对象
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

  // 在 DOMContentLoaded 事件处理函数内，图实例初始化之后添加
  // 修改统计信息的函数
  const updateStats = (data) => {
    // 更新节点统计
    document.getElementById('nodeCount').textContent = data.nodes.length || 0;
    document.getElementById('edgeCount').textContent = data.edges.length || 0;
    
    // 更新不同类型节点统计
    document.getElementById('accountCount').textContent = 
      data.nodes.filter(node => node.type === 'account').length || 0;
    document.getElementById('transactionCount').textContent = 
      data.nodes.filter(node => node.type === 'payment').length || 0;
    document.getElementById('merchantCount').textContent = 
      data.nodes.filter(node => node.type === 'merchant').length || 0;
  };

  // 修改数据加载部分
  fetch('./dataset/bankFraud.json')
    .then(response => response.json())
    .then(data => {
      console.log('原始数据:', data);
      console.log('开始处理数据...');
      const processedData = preprocessData(data);
      console.log('处理后的数据:', processedData);
      
      try {
        // 获取并移除加载提示
        const loadingContainer = document.querySelector('.loading-container');
        if (loadingContainer) {
          console.log('移除加载提示');
          loadingContainer.remove(); // 使用 remove() 而不是修改 innerHTML
        }

        // 确保容器是空的
        const container = document.getElementById('container');
        console.log('清空容器内容');
        container.innerHTML = '';

        // 重新初始化图实例
        console.log('初始化图实例');
        const graph = new G6.Graph({
          container: container, // 直接传入 DOM 元素
          width: container.offsetWidth,
          height: container.offsetHeight,
          modes: {
            default: ['drag-canvas', 'zoom-canvas', 'drag-node', 'click-select']
          },
          defaultNode: {
            size: 30,
            style: {
              fill: '#91d5ff',
              stroke: '#40a9ff',
              lineWidth: 2
            }
          },
          defaultEdge: {
            style: {
              stroke: '#91d5ff',
              lineWidth: 2,
              endArrow: true
            }
          },
          renderer: 'canvas',
          layout: {
            type: 'force',
            preventOverlap: true,
            nodeStrength: -50,
            edgeStrength: 0.1,
            linkDistance: 100
          },
          fitView: true,
          animate: true
        });

        // 渲染数据
        console.log('渲染数据');
        graph.data(processedData);
        graph.render();
        
        // 更新统计信息
        console.log('更新统计信息');
        updateStats(processedData);
        
        // 适应画布
        console.log('适应画布');
        graph.fitView();
        
        console.log('图渲染完成');
        console.log('节点数量:', graph.getNodes().length);
        console.log('边数量:', graph.getEdges().length);

        // 检查渲染结果
        setTimeout(() => {
          const canvas = container.querySelector('canvas');
          if (canvas) {
            console.log('Canvas 创建成功:', {
              width: canvas.width,
              height: canvas.height,
              style: canvas.style.cssText
            });
          } else {
            console.error('Canvas 未能创建');
            console.log('容器状态:', {
              width: container.offsetWidth,
              height: container.offsetHeight,
              innerHTML: container.innerHTML,
              style: container.style.cssText
            });
          }
        }, 100);

      } catch (error) {
        console.error('渲染过程中出错:', error);
        const container = document.getElementById('container');
        container.innerHTML = `
          <div class="error-message">
            渲染失败，请刷新页面重试<br>
            错误信息: ${error.message}
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('数据加载失败:', error);
      const container = document.getElementById('container');
      container.innerHTML = `
        <div class="error-message">
          数据加载失败，请刷新页面重试<br>
          错误信息: ${error.message}
        </div>
      `;
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
    // 中心度分析 - 使用 G6 内置的 degreeCentrality 算法
    calculateCentrality(graph) {
        const data = {
            nodes: graph.save().nodes,
            edges: graph.save().edges
        };
        
        // 使用 G6 内置的度中心性算法
        const centralityResults = G6.Util.degreeCentrality(data);
        
        // 将结果转换为数组并排序
        const sortedNodes = Object.entries(centralityResults)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        // 更新UI
        const top5List = document.getElementById('centralityTop5');
        if (top5List) {
          top5List.innerHTML = '';
          sortedNodes.forEach(([nodeId, score]) => {
            const node = graph.findById(nodeId);
            const nodeInfo = node.getModel();
            const li = document.createElement('li');
            li.textContent = `${nodeInfo.label || nodeId}: ${score.toFixed(3)}`;
            top5List.appendChild(li);
            
            // 高亮重要节点
            graph.setItemState(node, 'highlight', true);
          });
        }

        return sortedNodes;
    },

    // 测 - 使用 G6 内置的 louvain 算法
    detectCommunities(graph) {
        const data = {
            nodes: graph.save().nodes,
            edges: graph.save().edges
        };
        
        // 使用 G6 内置的 Louvain 社区检测算法
        const communities = G6.Util.louvain(data);
        
        // 统计社区信息
        const communityCount = Object.keys(communities).length;
        const communitySizes = Object.values(communities).reduce((acc, curr) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
        }, {});
        const maxCommunitySize = Math.max(...Object.values(communitySizes));

        // 更新UI
        document.getElementById('communityCount').textContent = communityCount;
        document.getElementById('maxCommunitySize').textContent = maxCommunitySize;

        // 为不同社区的节点设置不同颜色
        Object.entries(communities).forEach(([nodeId, communityId]) => {
            const node = graph.findById(nodeId);
            if (node) {
                const color = `hsl(${(communityId * 360) / communityCount}, 70%, 70%)`;
                graph.updateItem(node, {
                    style: {
                        fill: color
                    }
                });
            }
        });

        return {
            communities,
            count: communityCount,
            maxSize: maxCommunitySize
        };
    },

    // 路径分析 - 使用 G6 内置的 findShortestPath 算法
    analyzePaths(graph) {
        const data = graph.save();
        const nodes = data.nodes;
        const edges = data.edges;
        let maxLength = 0;
        let maxPath = null;
        let totalLength = 0;
        let pathCount = 0;

        // 计算所有节点对之间的最短路径
        nodes.forEach(source => {
            nodes.forEach(target => {
                if (source.id !== target.id) {
                    const paths = this.findAllShortestPaths(source.id, target.id, edges);
                    if (paths.length > 0) {
                        paths.forEach(path => {
                            const length = path.length - 1;
                            totalLength += length;
                            pathCount++;
                            if (length > maxLength) {
                                maxLength = length;
                                maxPath = path;
                            }
                        });
                    }
                }
            });
        });

        const avgLength = pathCount > 0 ? totalLength / pathCount : 0;

        // 更新UI
        document.getElementById('avgPathLength').textContent = avgLength.toFixed(2);
        document.getElementById('maxPathLength').textContent = maxLength;

        // 高亮显示最长路径
        if (maxPath) {
            for (let i = 0; i < maxPath.length - 1; i++) {
                const edge = graph.findEdge(maxPath[i], maxPath[i + 1]);
                if (edge) {
                    graph.setItemState(edge, 'highlight', true);
                }
            }
        }

        return {
            avgLength,
            maxLength,
            maxPath
        };
    },

    // 介数中心性分析
    betweennessCentrality(graph) {
      const data = graph.save();
      const nodes = data.nodes;
      const edges = data.edges;
      const betweenness = {};
      
      nodes.forEach(node => betweenness[node.id] = 0);

      // 对每对节点计算最短路径
      nodes.forEach(source => {
        nodes.forEach(target => {
          if (source.id === target.id) return;
          
          const paths = this.findAllShortestPaths(source.id, target.id, edges);
          paths.forEach(path => {
            // 更新路径上中间节点的介数中心性
            path.slice(1, -1).forEach(nodeId => {
              betweenness[nodeId] += 1 / paths.length;
            });
          });
        });
      });

      return betweenness;
    },

    // 查找所有短路径
    findAllShortestPaths(start, end, edges) {
      const paths = [];
      const queue = [[start]];
      const visited = new Set();
      let shortestLength = Infinity;

      while (queue.length > 0) {
        const path = queue.shift();
        const lastNode = path[path.length - 1];

        if (path.length > shortestLength) continue;

        if (lastNode === end) {
          shortestLength = path.length;
          paths.push(path);
          continue;
        }

        edges.forEach(edge => {
          if (edge.source === lastNode) {
            const nextNode = edge.target;
            if (!path.includes(nextNode)) {
              queue.push([...path, nextNode]);
            }
          }
        });
      }

      return paths;
    },

    // 层次聚类分析
    hierarchicalClustering(graph) {
      const data = graph.save();
      const nodes = data.nodes;
      const edges = data.edges;
      
      // 计算节点间距离矩阵
      const distances = this.calculateDistanceMatrix(nodes, edges);
      
      // 初始化每个节点为一个簇
      let clusters = nodes.map(node => ({
        id: node.id,
        nodes: [node.id]
      }));

      // 迭代合并最近的簇
      while (clusters.length > 1) {
        let minDistance = Infinity;
        let mergePair = null;

        // 找到最近的两个簇
        for (let i = 0; i < clusters.length; i++) {
          for (let j = i + 1; j < clusters.length; j++) {
            const distance = this.calculateClusterDistance(
              clusters[i],
              clusters[j],
              distances
            );
            if (distance < minDistance) {
              minDistance = distance;
              mergePair = [i, j];
            }
          }
        }

        // 并
        if (mergePair) {
          const [i, j] = mergePair;
          const newCluster = {
            id: `cluster_${Date.now()}`,
            nodes: [...clusters[i].nodes, ...clusters[j].nodes],
          };
          clusters.splice(j, 1);
          clusters.splice(i, 1, newCluster);
        }
      }

      return clusters;
    },

    // 计算距离阵
    calculateDistanceMatrix(nodes, edges) {
      const distances = {};
      nodes.forEach(source => {
        distances[source.id] = {};
        nodes.forEach(target => {
          if (source.id === target.id) {
            distances[source.id][target.id] = 0;
          } else {
            distances[source.id][target.id] = Infinity;
          }
        });
      });

      // 初始化直接连接的节点距离
      edges.forEach(edge => {
        distances[edge.source][edge.target] = 1;
        distances[edge.target][edge.source] = 1;
      });

      // Floyd-Warshall 算法计算所有节点对最短路径
      nodes.forEach(k => {
        nodes.forEach(i => {
          nodes.forEach(j => {
            const throughK = distances[i.id][k.id] + distances[k.id][j.id];
            if (throughK < distances[i.id][j.id]) {
              distances[i.id][j.id] = throughK;
            }
          });
        });
      });

      return distances;
    },

    // 计算簇间距离
    calculateClusterDistance(cluster1, cluster2, distances) {
      let totalDistance = 0;
      let count = 0;

      cluster1.nodes.forEach(node1 => {
        cluster2.nodes.forEach(node2 => {
          totalDistance += distances[node1][node2];
          count++;
        });
      });

      return totalDistance / count;
    },

    // 子图掘
    mineSubgraphs(graph, minSize = 3, minDensity = 0.5) {
      const data = graph.save();
      const subgraphs = [];
      const visited = new Set();

      // 从未访问的节点开始展子图
      data.nodes.forEach(startNode => {
        if (visited.has(startNode.id)) return;

        const subgraph = this.expandSubgraph(
          startNode.id,
          data,
          visited,
          minSize,
          minDensity
        );

        if (subgraph && this.isValidSubgraph(subgraph, minSize, minDensity)) {
          subgraphs.push(subgraph);
        }
      });

      return subgraphs;
    },

    // 扩展子图
    expandSubgraph(startNodeId, data, visited, minSize, minDensity) {
      const subgraph = {
        nodes: new Set([startNodeId]),
        edges: new Set()
      };
      const queue = [startNodeId];
      visited.add(startNodeId);

      while (queue.length > 0) {
        const currentId = queue.shift();
        
        // 查找相关边和节点
        data.edges.forEach(edge => {
          if (edge.source === currentId || edge.target === currentId) {
            const neighborId = edge.source === currentId ? edge.target : edge.source;
            
            if (!visited.has(neighborId)) {
              const density = this.calculateDensity(subgraph, data);
              if (density >= minDensity) {
                subgraph.nodes.add(neighborId);
                subgraph.edges.add(edge.id);
                queue.push(neighborId);
                visited.add(neighborId);
              }
            } else if (subgraph.nodes.has(neighborId)) {
              subgraph.edges.add(edge.id);
            }
          }
        });
      }

      return {
        nodes: Array.from(subgraph.nodes),
        edges: Array.from(subgraph.edges)
      };
    },

    // 计算子图密度
    calculateDensity(subgraph, data) {
      const nodeCount = subgraph.nodes.size;
      const edgeCount = subgraph.edges.size;
      const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
      return maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    },

    // 验证子图是否满足条件
    isValidSubgraph(subgraph, minSize, minDensity) {
      return (
        subgraph.nodes.length >= minSize &&
        this.calculateDensity(
          {nodes: new Set(subgraph.nodes), edges: new Set(subgraph.edges)},
          subgraph
        ) >= minDensity
      );
    },

    // 环路检测算
    detectCycles(graph) {
      const data = graph.save();
      const cycles = [];
      const visited = new Set();
      const recursionStack = new Set();

      const dfs = (nodeId, path = []) => {
        if (recursionStack.has(nodeId)) {
          const cycleStart = path.indexOf(nodeId);
          if (cycleStart !== -1) {
            const cyclePath = path.slice(cycleStart);
            cycles.push({
              path: cyclePath,
              type: this.analyzeCycleType(cyclePath, data),
              risk: this.calculateCycleRisk(cyclePath, data)
            });
          }
          return;
        }

        if (visited.has(nodeId)) return;

        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);

        const edges = data.edges.filter(edge => edge.source === nodeId);
        for (const edge of edges) {
          dfs(edge.target, [...path]);
        }

        recursionStack.delete(nodeId);
        path.pop();
      };

      // 对每个节点进行检测
      data.nodes.forEach(node => {
        if (!visited.has(node.id)) {
          dfs(node.id);
        }
      });

      return this.filterSignificantCycles(cycles);
    },

    // 分环路类
    analyzeCycleType(cycle, data) {
      const nodeTypes = cycle.map(nodeId => {
        const node = data.nodes.find(n => n.id === nodeId);
        return node.type;
      });

      // 检查是否为资金循环
      if (nodeTypes.every(type => type === 'account')) {
        return 'MONEY_CYCLE';
      }

      // 检查是否为商户套现
      if (nodeTypes.includes('merchant') && nodeTypes.includes('account')) {
        return 'CASHOUT_CYCLE';
      }

      // 检查是否为分散转账
      if (nodeTypes.filter(type => type === 'account').length > 3) {
        return 'DISPERSE_CYCLE';
      }

      return 'UNKNOWN_CYCLE';
    },

    // 计算环路风险分数
    calculateCycleRisk(cycle, data) {
      let riskScore = 0;

      // 基础分数：环长度
      riskScore += cycle.length * 10;

      // 计算环路中的交易总额
      let totalAmount = 0;
      for (let i = 0; i < cycle.length; i++) {
        const currentNode = cycle[i];
        const nextNode = cycle[(i + 1) % cycle.length];
        const edge = data.edges.find(e => 
          e.source === currentNode && e.target === nextNode
        );
        if (edge && edge.amount) {
          totalAmount += edge.amount;
        }
      }

      // 交易金额分数
      riskScore += Math.min(totalAmount / 10000, 50);

      // 时间因素分数
      const timeRisk = this.calculateTimeRisk(cycle, data);
      riskScore += timeRisk;

      // 节点类型分数
      const typeRisk = this.calculateTypeRisk(cycle, data);
      riskScore += typeRisk;

      return Math.min(100, Math.round(riskScore));
    },

    // 计算时间风险分数
    calculateTimeRisk(cycle, data) {
      const transactions = [];
      for (let i = 0; i < cycle.length; i++) {
        const currentNode = cycle[i];
        const nextNode = cycle[(i + 1) % cycle.length];
        const edge = data.edges.find(e => 
          e.source === currentNode && e.target === nextNode
        );
        if (edge && edge.timestamp) {
          transactions.push({
            timestamp: new Date(edge.timestamp),
            amount: edge.amount
          });
        }
      }

      if (transactions.length < 2) return 0;

      // 按时间排序
      transactions.sort((a, b) => a.timestamp - b.timestamp);

      // 计算平均时间间隔
      let totalInterval = 0;
      for (let i = 1; i < transactions.length; i++) {
        totalInterval += transactions[i].timestamp - transactions[i-1].timestamp;
      }
      const avgInterval = totalInterval / (transactions.length - 1);

      // 间间隔越，风险越高
      return Math.min(30, Math.round(30 * (1 - avgInterval / (24 * 60 * 60 * 1000))));
    },

    // 算节点类型风险分数
    calculateTypeRisk(cycle, data) {
      const nodeTypes = cycle.map(nodeId => {
        const node = data.nodes.find(n => n.id === nodeId);
        return node.type;
      });

      let typeRisk = 0;

      // 账户节点数量
      const accountCount = nodeTypes.filter(type => type === 'account').length;
      typeRisk += accountCount * 5;

      // 商户节点
      if (nodeTypes.includes('merchant')) {
        typeRisk += 15;
      }

      // 多类型节点混合
      const uniqueTypes = new Set(nodeTypes);
      if (uniqueTypes.size > 2) {
        typeRisk += 10;
      }

      return Math.min(20, typeRisk);
    },

    // 过滤重要环路
    filterSignificantCycles(cycles) {
      // 按风险分数排序
      cycles.sort((a, b) => b.risk - a);

      // 移除重复或相似的环路
      const filteredCycles = [];
      const seenPatterns = new Set();

      cycles.forEach(cycle => {
        const pattern = this.generateCyclePattern(cycle.path);
        if (!seenPatterns.has(pattern) && cycle.risk >= 50) {
          seenPatterns.add(pattern);
          filteredCycles.push(cycle);
        }
      });

      return filteredCycles;
    },

    // 生成环路模式识
    generateCyclePattern(path) {
      const normalized = [...path];
      const minIndex = normalized.indexOf(Math.min(...normalized));
      return [...normalized.slice(minIndex), ...normalized.slice(0, minIndex)].join('-');
    },

    // 高亮显示环路
    highlightCycle(cycle) {
      // 清除现有高亮
      graph.getNodes().forEach(node => {
        graph.clearItemStates(node);
      });
      graph.getEdges().forEach(edge => {
        graph.clearItemStates(edge);
      });

      // 高亮环路节点和边
      cycle.path.forEach((nodeId, index) => {
        const node = graph.findById(nodeId);
        if (node) {
          graph.setItemState(node, 'cycle', true);
          
          // 高亮相
          const nextNodeId = cycle.path[(index + 1) % cycle.path.length];
          const edge = graph.findEdge(nodeId, nextNodeId);
          if (edge) {
            graph.setItemState(edge, 'cycle', true);
          }
        }
      });

      // 显示环路信息
      this.showCycleInfo(cycle);
    },

    // 显示环路信息
    showCycleInfo(cycle) {
      const info = document.createElement('div');
      info.className = 'cycle-info';
      info.innerHTML = `
        <h3>环路详情</h3>
        <div class="cycle-type">类型: ${this.getCycleTypeLabel(cycle.type)}</div>
        <div class="cycle-risk">风险评分: ${cycle.risk}</div>
        <div class="cycle-path">
          路径: ${cycle.path.join(' → ')} → ${cycle.path[0]}
        </div>
      `;

      const container = document.querySelector('.info-panel-container') || 
                       document.createElement('div');
      container.className = 'info-panel-container';
      container.innerHTML = '';
      container.appendChild(info);
      
      if (!container.parentElement) {
        document.body.appendChild(container);
      }
    },

    // 获取环路类型标签
    getCycleTypeLabel(type) {
      const labels = {
        'MONEY_CYCLE': '资金循环',
        'CASHOUT_CYCLE': '商户套现',
        'DISPERSE_CYCLE': '分散转账',
        'UNKNOWN_CYCLE': '未知类型'
      };
      return labels[type] || type;
    }
  };

// 运行算法的函数
function runAlgorithm() {
  const algorithmType = document.getElementById('algorithmSelect').value;
  const button = document.querySelector('.control-button[onclick="runAlgorithm()"]');
  button.disabled = true;
  button.textContent = '计算���...';

  try {
    // 清除前的高亮
    graph.getNodes().forEach(node => {
      graph.clearItemStates(node);
      graph.updateItem(node, {
        style: {
          fill: getNodeColor(node.getModel().type)
        }
      }); // 结束 graph.updateItem

    }); // 添加闭合括号以结束 graph.getNodes().forEach

    graph.getEdges().forEach(edge => {
      graph.clearItemStates(edge);
    }); // 添加闭合括号以结束 graph.getEdges().forEach

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
        const cycles = GraphAlgorithms.detectCycles(graph);
        // 更新UI显示检测结果
        const cycleList = document.getElementById('cycleList');
        if (cycleList) {
          cycleList.innerHTML = cycles.map((cycle, index) => `
            <div class="cycle-item">
              <div class="cycle-header">
                环路 ${index + 1} (风险评分: ${cycle.risk})
                <button onclick="GraphAlgorithms.highlightCycle(${JSON.stringify(cycle)})">
                  查看详情
                </button>
              </div>
              <div class="cycle-type">${GraphAlgorithms.getCycleTypeLabel(cycle.type)}</div>
            </div>
          `).join('');
        }
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



  // 将 runAlgorithm 函数绑定到全局
  window.runAlgorithm = runAlgorithm;

  // 注册右键菜单
  const registerContextMenu = () => {
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    document.body.appendChild(contextMenu);

    // 监听右键事件
    graph.on('node:contextmenu', (evt) => {
      evt.preventDefault();
      const node = evt.item;
      const { x, y } = evt;
      
      contextMenu.innerHTML = `
        <div class="menu-item" onclick="markNode('${node.get('id')}')">标记节点</div>
        <div class="menu-item" onclick="expandNode('${node.get('id')}')">展开关联节点</div>
        <div class="menu-item" onclick="hideNode('${node.get('id')}')">隐藏节点</div>
        <div class="menu-item" onclick="addToEvidence('${node.get('id')}')">加到证据</div>
      `;
      
      contextMenu.style.display = 'block';
      contextMenu.style.left = `${x}px`;
      contextMenu.style.top = `${y}px`;
    });

    // 点击其他地方关闭菜单
    document.addEventListener('click', () => {
      contextMenu.style.display = 'none';
    });
  };

  // 注册键盘快捷键
  const registerKeyboardShortcuts = () => {
    const history = {
      undoStack: [],
      redoStack: []
    };

    document.addEventListener('keydown', (e) => {
      // Ctrl + Z: 撤销
      if (e.ctrlKey && e.key === 'z') {
        if (history.undoStack.length > 0) {
          const lastState = history.undoStack.pop();
          history.redoStack.push(graph.save());
          graph.changeData(lastState);
        }
      }
      // Ctrl + Y: 重做
      if (e.ctrlKey && e.key === 'y') {
        if (history.redoStack.length > 0) {
          const nextState = history.redoStack.pop();
          history.undoStack.push(graph.save());
          graph.changeData(nextState);
        }
      }
      // Ctrl + F: 搜索
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('nodeSearch').focus();
      }
      // Delete: 删除选中的节点
      if (e.key === 'Delete') {
        const selectedNodes = graph.findAllByState('node', 'selected');
        history.undoStack.push(graph.save());
        graph.removeItems(selectedNodes);
      }
    });

    // 记录操作历史
    graph.on('afterchangedata', () => {
      history.undoStack.push(graph.save());
      history.redoStack = [];
    });
  };

  // 添加框选功能 - 修复版本
  const enableLasso = () => {
    // 添加框选为
    graph.addBehaviors(
      {
        type: 'lasso-select',
        selectedState: 'selected',
        trigger: 'shift', // 按住 shift 键进行框选
        onSelect: (nodes, edges) => {
          console.log('框选的节点:', nodes);
          console.log('框选的边:', edges);
          
          // 高亮选中的元素
          nodes.forEach(node => {
            graph.setItemState(node, 'selected', true);
          });
          edges.forEach(edge => {
            graph.setItemState(edge, 'selected', true);
          });
        }
      },
      'default'
    );
  };

  // 添加缩略图
  const addMinimap = () => {
    const minimap = new G6.Minimap({
      size: [150, 100],
      className: 'minimap',
      type: 'delegate'
    });
    
    graph.addPlugin(minimap);
  };

  // 添加拖拽上传支持
  const enableDragUpload = () => {
    const container = document.getElementById('container');
    
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.classList.add('drag-over');
    });

    container.addEventListener('dragleave', () => {
      container.classList.remove('drag-over');
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.classList.remove('drag-over');
      
      const file = e.dataTransfer.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            graph.changeData(preprocessData(data));
          } catch (error) {
            console.error('文件解析错误:', error);
            alert('文件格式不正确');
          }
        };
        reader.readAsText(file);
      }
    });
  };

  // 在图实例创建后调用这些函数
  registerContextMenu();
  registerKeyboardShortcuts();
  enableLasso();
  addMinimap();
  enableDragUpload();

  // 在图实例创建后添以下代码

  // 创建加载提示
  const createLoadingTip = () => {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-tip';
    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中 <span id="loadingProgress">0</span>%</div>
    `;
    document.body.appendChild(loadingDiv);
    return loadingDiv;
  };

  // 数据加载和染优化
  const optimizeDataRendering = () => {
    let currentChunk = 0;
    let totalChunks = 0;
    const loadingTip = createLoadingTip();
    const worker = new Worker('dataWorker.js');

    // 处理 Worker 消息
    worker.onmessage = function(e) {
        const { type, data, meta } = e.data;

        switch(type) {
            case 'initData':
                // 初始化图数据
                totalChunks = meta.totalChunks;
                graph.data(data.chunk);
                graph.render();
                updateLoadingProgress(1, totalChunks);
                
                // 如果数据量大，启动分块加载
                if (totalChunks > 1) {
                    requestNextChunk();
                } else {
                    hideLoading();
                }
                break;

            case 'chunkData':
                // 添加新的数据块
                currentChunk++;
                const { nodes, edges } = data;
                
                // 批量添加新节点和边
                graph.addItems('node', nodes);
                graph.addItems('edge', edges);
                
                updateLoadingProgress(currentChunk, totalChunks);
                
                if (currentChunk < totalChunks) {
                    requestNextChunk();
                } else {
                    hideLoading();
                    graph.fitView();
                }
                break;

            case 'error':
                console.error('数据处理错误:', data.error);
                hideLoading();
                break;
        }
    };

    // 请求下一块数据
    const requestNextChunk = () => {
        worker.postMessage({
            type: 'loadChunk',
            params: { startIndex: currentChunk * CHUNK_SIZE }
        });
    };

    // 更新加载进度
    const updateLoadingProgress = (current, total) => {
        const progress = Math.round((current / total) * 100);
        document.getElementById('loadingProgress').textContent = progress;
    };

    // 隐藏加载提示
    const hideLoading = () => {
        loadingTip.style.display = 'none';
    };

    return {
        worker
    };
  };

  // 在图实例创建后初始化优化
  const { worker } = optimizeDataRendering();

  // 添加相关样式
  const style = document.createElement('style');
  style.textContent = `
    /* 加载提示样式 */
    .loading-tip {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 10px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* 面板样式 */
    .section-content {
      overflow: hidden;
      transition: max-height 0.3s ease;
      max-height: 1000px; /* 设置一个足够大的值 */
    }

    .section-content.collapsed {
      max-height: 0;
      padding: 0;
      margin: 0;
    }

    .section-header {
      cursor: pointer;
      padding: 10px;
      background: #f5f5f5;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-header:hover {
      background: #e6f7ff;
    }

    .toggle-icon {
      transition: transform 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  // 在现有码后添加新的功能模块

  // 异检测模块
  const AnomalyDetection = {
    // 检测常交易模式
    detectAnomalies() {
      const data = graph.save();
      const anomalies = [];

      // 循环模式检
      const cycles = this.detectCycles(data);
      if (cycles.length > 0) {
        anomalies.push({
          type: 'cycle',
          description: '发现循环交易',
          paths: cycles
        });
      }

      // 快速连续交易检测
      const rapidTransactions = this.detectRapidTransactions(data);
      if (rapidTransactions.length > 0) {
        anomalies.push({
          type: 'rapid',
          description: '发现快速连续交易',
          transactions: rapidTransactions
        });
      }

      // 更新异常检测面板
      this.updateAnomalyPanel(anomalies);
      return anomalies;
    },

    // 更新异常检测板
    updateAnomalyPanel(anomalies) {
      const anomalyList = document.getElementById('anomalyList');
      anomalyList.innerHTML = anomalies.map(anomaly => `
        <div class="anomaly-item">
          <div class="anomaly-type">${anomaly.type}</div>
          <div class="anomaly-description">${anomaly.description}</div>
          <button onclick="highlightAnomaly('${anomaly.type}')">查看详</button>
        </div>
      `).join('');
    },

    // 检测循环交
    detectCycles(data) {
      const cycles = [];
      const visited = new Set();
      const stack = new Set();

      const dfs = (nodeId, path = []) => {
        if (stack.has(nodeId)) {
          const cycleStart = path.indexOf(nodeId);
          if (cycleStart !== -1) {
            const cyclePath = path.slice(cycleStart);
            cycles.push({
              path: cyclePath,
              type: this.analyzeCycleType(cyclePath, data),
              risk: this.calculateCycleRisk(cyclePath, data)
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

    // 检测快速连交易
    detectRapidTransactions(data) {
      const rapidTransactions = [];
      const timeWindow = 300000; // 5分钟内
      const minTransactions = 3; // 最少3笔交易

      // 按账户分组交易
      const accountTransactions = {};
      data.edges.forEach(edge => {
        const sourceNode = data.nodes.find(n => n.id === edge.source);
        if (sourceNode && sourceNode.type === 'account') {
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

    // 高亮显示异常
    highlightAnomaly(type) {
      // 清除现有高亮
      graph.getNodes().forEach(node => {
        graph.clearItemStates(node);
      });
      graph.getEdges().forEach(edge => {
        graph.clearItemStates(edge);
      });

      const anomalies = this.detectAnomalies();
      const anomaly = anomalies.find(a => a.type === type);

      if (anomaly) {
        switch(type) {
          case 'cycle':
            anomaly.paths.forEach(path => {
              path.forEach((nodeId, index) => {
                const node = graph.findById(nodeId);
                if (node) {
                  graph.setItemState(node, 'highlight', true);
                  if (index < path.length - 1) {
                    const edge = graph.findEdge(nodeId, path[index + 1]);
                    if (edge) {
                      graph.setItemState(edge, 'highlight', true);
                    }
                  }
                }
              });
            });
            break;
          case 'rapid':
            anomaly.transactions.forEach(transaction => {
              const edge = graph.findById(transaction.id);
              if (edge) {
                graph.setItemState(edge, 'highlight', true);
                const sourceNode = graph.findById(transaction.source);
                const targetNode = graph.findById(transaction.target);
                if (sourceNode) graph.setItemState(sourceNode, 'highlight', true);
                if (targetNode) graph.setItemState(targetNode, 'highlight', true);
              }
            });
            break;
        }
      }
    }
  };

  // 报告导出模块
  const ReportExport = {
    async generateReport() {
      const report = {
        timestamp: new Date().toISOString(),
        graphInfo: {
          nodes: graph.getNodes().length,
          edges: graph.getEdges().length
        },
        anomalies: AnomalyDetection.detectAnomalies(),
        timeline: this.generateTimeline(),
        analysis: {
          centrality: GraphAlgorithms.calculateCentrality(graph),
          communities: GraphAlgorithms.detectCommunities(graph)
        },
        evidence: this.collectEvidence()
      };

      return report;
    },

    // 导出为PDF或HTML
    async exportReport() {
      const report = await this.generateReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `fraud-analysis-report-${new Date().toISOString()}.json`;
      a.click();
    },

    // 生成时间线
    generateTimeline() {
      const timelineEvents = [];
      const data = graph.save();

      // 收集所有时关的事件
      data.edges.forEach(edge => {
        const sourceNode = data.nodes.find(n => n.id === edge.source);
        const targetNode = data.nodes.find(n => n.id === edge.target);
        
        timelineEvents.push({
          timestamp: edge.timestamp,
          type: 'transaction',
          description: `从 ${sourceNode.label} 到 ${targetNode.label} 的交易`,
          amount: edge.amount,
          risk: edge.risk
        });
      });

      // 添加分析事件
      ForensicsTools.evidence.markers.forEach(marker => {
        timelineEvents.push({
          timestamp: marker.timestamp,
          type: 'marker',
          description: marker.label
        });
      });

      ForensicsTools.evidence.comments.forEach(comment => {
        timelineEvents.push({
          timestamp: comment.timestamp,
          type: 'comment',
          description: comment.content
        });
      });

      // 按时间序
      return timelineEvents.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    },

    // 集证据
    collectEvidence() {
      return {
        markers: ForensicsTools.evidence.markers,
        comments: ForensicsTools.evidence.comments,
        screenshots: ForensicsTools.evidence.screenshots,
        anomalies: AnomalyDetection.detectAnomalies(),
        analysisResults: {
          centrality: GraphAlgorithms.calculateCentrality(graph),
          communities: GraphAlgorithms.detectCommunities(graph),
          groups: RelationshipAnalysis.detectGroups(graph.save())
        }
      };
    },

    // 生成HTML报告
    generateHTMLReport(report) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <title>欺诈分析报告 - ${new Date().toLocaleString()}</title>
            <style>
              /* 添加报告样式 */
            </style>
          </head>
          <body>
            <h1>欺诈分析报告</h1>
            <div class="metadata">
              <p>成时间：${report.timestamp}</p>
              <p>分析人员：${report.metadata.investigator}</p>
              <p>案编号：${report.metadata.caseId}</p>
            </div>
            
            <div class="summary">
              <h2>数据概览</h2>
              <p>节点总数：${report.graphInfo.nodes}</p>
              <p>边总数：${report.graphInfo.edges}</p>
            </div>

            <div class="timeline">
              <h2>事件时间线</h2>
              ${this.renderTimeline(report.timeline)}
            </div>

            <div class="anomalies">
              <h2>异常发现</h2>
              ${this.renderAnomalies(report.anomalies)}
            </div>

            <div class="evidence">
              <h2>取证记录</h2>
              ${this.renderEvidence(report.evidence)}
            </div>
          </body>
        </html>
      `;
    },

    // 渲染时间线
    renderTimeline(timeline) {
      return `
        <div class="timeline-view">
          ${timeline.map(event => `
            <div class="timeline-event ${event.type}">
              <div class="event-time">${new Date(event.timestamp).toLocaleString()}</div>
              <div class="event-type">${this.getEventTypeLabel(event.type)}</div>
              <div class="event-description">${event.description}</div>
              ${event.amount ? `<div class="event-amount">金额: ${event.amount}</div>` : ''}
              ${event.risk ? `<div class="event-risk">风险等级: ${event.risk}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    },

    // 获取事件类型标签
    getEventTypeLabel(type) {
      const labels = {
        'transaction': '交易',
        'marker': '标记',
        'comment': '注释'
      };
      return labels[type] || type;
    },

    // 渲染异常发现
    renderAnomalies(anomalies) {
      return `
        <div class="anomalies-view">
          ${anomalies.map(anomaly => `
            <div class="anomaly-item ${anomaly.type}">
              <h3>${anomaly.description}</h3>
              ${this.renderAnomalyDetails(anomaly)}
            </div>
          `).join('')}
        </div>
      `;
    },

    // 渲染异常详情
    renderAnomalyDetails(anomaly) {
      switch(anomaly.type) {
        case 'cycle':
          return this.renderCycleDetails(anomaly.paths);
        case 'rapid':
          return this.renderRapidTransactionDetails(anomaly.transactions);
        default:
          return '';
      }
    },

    // 渲染循环交易详情
    renderCycleDetails(paths) {
      return `
        <div class="cycle-details">
          <h4>发现 ${paths.length} 个交易循环</h4>
          ${paths.map(path => `
            <div class="cycle-path">
              ${path.join(' → ')} → ${path[0]}
            </div>
          `).join('')}
        </div>
      `;
    },

    // 渲染快速连续交易详情
    renderRapidTransactionDetails(transactions) {
      return `
        <div class="rapid-transaction-details">
          <h4>发现 ${transactions.length} 组快速连续交易</h4>
          ${transactions.map(t => `
            <div class="transaction-group">
              <div>账户: ${t.accountId}</div>
              <div>交易数量: ${t.transactions.length}</div>
              <div>时间跨度: ${t.timeSpan / 1000}</div>
            </div>
          `).join('')}
        </div>
      `;
    },

    // 染证据记录
    renderEvidence(evidence) {
      return `
        <div class="evidence-view">
          <div class="markers-section">
            <h3>标记记录 (${evidence.markers.length})</h3>
            ${this.renderMarkers(evidence.markers)}
          </div>
          <div class="comments-section">
            <h3>注释记 (${evidence.comments.length})</h3>
            ${this.renderComments(evidence.comments)}
          </div>
          <div class="analysis-section">
            <h3>分析结果</h3>
            ${this.renderAnalysisResults(evidence.analysisResults)}
          </div>
        </div>
      `;
    },

    // 渲染标记记录
    renderMarkers(markers) {
      return `
        <div class="markers-list">
          ${markers.map(marker => `
            <div class="marker-item">
              <div class="marker-time">${new Date(marker.timestamp).toLocaleString()}</div>
              <div class="marker-label">${marker.label}</div>
              <div class="marker-nodes">
                涉及节点: ${marker.nodes.map(n => n.label || n.id).join(', ')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },

    // 渲染注释记录
    renderComments(comments) {
      return `
        <div class="comments-list">
          ${comments.map(comment => `
            <div class="comment-item">
              <div class="comment-time">${new Date(comment.timestamp).toLocaleString()}</div>
              <div class="comment-content">${comment.content}</div>
              <div class="comment-elements">
                涉及元素: ${comment.elements.nodes.length} 个节点, 
                ${comment.elements.edges.length} 条边
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },

    // 渲染分析结果
    renderAnalysisResults(results) {
      return `
        <div class="analysis-results">
          <div class="centrality-section">
            <h4>中心度分析</h4>
            ${this.renderCentralityResults(results.centrality)}
          </div>
          <div class="community-section">
            <h4>社区检测</h4>
            ${this.renderCommunityResults(results.communities)}
          </div>
          <div class="group-section">
            <h4>团伙分析</h4>
            ${this.renderGroupResults(results.groups)}
          </div>
        </div>
      `;
    },

    // 渲染中心分析结果
    renderCentralityResults(centrality) {
      const sortedNodes = Object.entries(centrality)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      return `
        <div class="centrality-results">
          <div class="top-nodes">
            <h5>重要节点 Top5：</h5>
            <ul>
              ${sortedNodes.map(([nodeId, score]) => `
                <li>${nodeId}: ${score.toFixed(3)}</li>
              `).join('')}
            </ul>
          </div>
        </div>
      `;
    },

    // 渲染社区检测结果
    renderCommunityResults(communities) {
      const communityStats = this.calculateCommunityStats(communities);
      return `
        <div class="community-results">
          <div>社区总数: ${communityStats.count}</div>
          <div>最大社区规模: ${communityStats.maxSize}</div>
          <div>平社区规模: ${communityStats.avgSize.toFixed(2)}</div>
          <div class="community-distribution">
            ${this.renderCommunityDistribution(communityStats.distribution)}
          </div>
        </div>
      `;
    },

    // 计算社区统计信息
    calculateCommunityStats(communities) {
      const communitySizes = {};
      Object.values(communities).forEach(communityId => {
        communitySizes[communityId] = (communitySizes[communityId] || 0) + 1;
      });

      const sizes = Object.values(communitySizes);
      return {
        count: Object.keys(communitySizes).length,
        maxSize: Math.max(...sizes),
        avgSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
        distribution: communitySizes
      };
    },

    // 渲染社区分
    renderCommunityDistribution(distribution) {
      return `
        <div class="distribution-chart">
          ${Object.entries(distribution).map(([communityId, size]) => `
            <div class="distribution-bar">
              <div class="bar" style="height: ${size * 2}px"></div>
              <div class="label">社区 ${communityId}</div>
            </div>
          `).join('')}
        </div>
      `;
    },

    // 渲染团伙分析结果
    renderGroupResults(groups) {
      return `
        <div class="group-results">
          <h5>发现 ${groups.length} 个可疑团伙</h5>
          ${groups.map((group, index) => `
            <div class="group-item">
              <div class="group-header">
                团伙 ${index + 1} (${group.length} 个节点)
              </div>
              <div class="group-details">
                <div>核心成员: ${this.renderCoreMembers(group)}</div>
                <div>风险评分: ${this.calculateGroupRiskScore(group)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },

    // 渲染核心成员
    renderCoreMembers(group) {
      const coreMembers = group.slice(0, 3);
      return coreMembers.map(nodeId => {
        const node = graph.findById(nodeId)?.getModel();
        return node ? (node.label || nodeId) : nodeId;
      }).join(', ') + (group.length > 3 ? ` 等${group.length}人` : '');
    },

    // 计算团伙风险评分
    calculateGroupRiskScore(group) {
      // 基分数
      let score = group.length * 10;

      // 计算内部交易
      const internalTransactions = graph.getEdges().filter(edge => {
        const source = edge.getSource().getModel().id;
        const target = edge.getTarget().getModel().id;
        return group.includes(source) && group.includes(target);
      });

      // 交易密度加分
      const maxPossibleTransactions = (group.length * (group.length - 1)) / 2;
      const density = internalTransactions.length / maxPossibleTransactions;
      score += density * 50;

      // 交易金额加分
      const totalAmount = internalTransactions.reduce((sum, edge) => {
        return sum + (edge.getModel().amount || 0);
      }, 0);
      score += Math.min(totalAmount / 10000, 50); // 最高50分

      return Math.min(100, Math.round(score)); // 最高100分
    },

    // 生成完整报告
    generateFullReport() {
      const report = {
        title: "欺诈分析调查报告",
        timestamp: new Date().toISOString(),
        metadata: {
          caseId: `CASE-${Date.now()}`,
          investigator: localStorage.getItem('investigatorName') || 'Unknown',
          analysisTime: new Date().toLocaleString()
        },
        summary: this.generateSummary(),
        details: {
          graphStats: this.collectGraphStats(),
          anomalies: AnomalyDetection.detectAnomalies(),
          analysis: {
            centrality: GraphAlgorithms.calculateCentrality(graph),
            communities: GraphAlgorithms.detectCommunities(graph),
            groups: RelationshipAnalysis.detectGroups(graph.save())
          },
          evidence: ForensicsTools.evidence,
          timeline: this.generateTimeline()
        },
        visualizations: {
          screenshots: ForensicsTools.evidence.screenshots,
          charts: this.generateCharts()
        }
      };

      return report;
    },

    // 生成报告摘要
    generateSummary() {
      const stats = this.collectGraphStats();
      const anomalies = AnomalyDetection.detectAnomalies();
      
      return {
        totalNodes: stats.nodeCount,
        totalEdges: stats.edgeCount,
        anomalyCount: anomalies.length,
        riskLevel: this.calculateOverallRisk(anomalies),
        keyFindings: this.generateKeyFindings(stats, anomalies)
      };
    },

    // 收集图统计息
    collectGraphStats() {
      return {
        nodeCount: graph.getNodes().length,
        edgeCount: graph.getEdges().length,
        nodeTypes: this.countNodeTypes(),
        edgeTypes: this.countEdgeTypes(),
        density: this.calculateGraphDensity(),
        connectivity: this.analyzeConnectivity()
      };
    },

    // 计算总体风险等级
    calculateOverallRisk(anomalies) {
      const riskScore = anomalies.reduce((score, anomaly) => {
        return score + (anomaly.severity || 1);
      }, 0);

      if (riskScore > 50) return "高风险";
      if (riskScore > 20) return "中风险";
      return "低风险";
    },

    // 生成关键发现
    generateKeyFindings(stats, anomalies) {
      const findings = [];

      // 添加网络结构相关发现
      if (stats.density > 0.7) {
        findings.push("网结构高度紧密，可能存在密切协作关系");
      }

      // 添加异常相关发现
      anomalies.forEach(anomaly => {
        if (anomaly.severity > 0.8) {
          findings.push(`发现高度异常行为: ${anomaly.description}`);
        }
      });

      // 添加社区发现
      const communities = GraphAlgorithms.detectCommunities(graph);
      if (Object.keys(communities).length > 3) {
        findings.push(`发现${Object.keys(communities).length}个独立社区，疑似存在多个团伙`);
      }

      return findings;
    },

    // 生成可视化图表
    generateCharts() {
      return {
        timeDistribution: this.generateTimeDistributionChart(),
        amountDistribution: this.generateAmountDistributionChart(),
        networkTopology: this.generateNetworkTopologyChart()
      };
    },

    // 生成时间分布图
    generateTimeDistributionChart() {
      const data = graph.save();
      const timeData = data.edges
        .filter(edge => edge.timestamp)
        .map(edge => new Date(edge.timestamp));

      // 按小时统计
      const hourlyStats = new Array(24).fill(0);
      timeData.forEach(time => {
        hourlyStats[time.getHours()]++;
      });

      return {
        type: 'timeDistribution',
        data: hourlyStats,
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        title: '交易时间分布'
      };
    },

    // 生成金额分布图
    generateAmountDistributionChart() {
      const data = graph.save();
      const amounts = data.edges
        .filter(edge => edge.amount)
        .map(edge => edge.amount)
        .sort((a, b) => a - b);

      // 计算分布区间
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      const range = max - min;
      const bucketCount = 10;
      const bucketSize = range / bucketCount;
      const distribution = new Array(bucketCount).fill(0);

      amounts.forEach(amount => {
        const index = Math.min(
          Math.floor((amount - min) / bucketSize),
          bucketCount - 1
        );
        distribution[index]++;
      });

      return {
        type: 'amountDistribution',
        data: distribution,
        labels: distribution.map((_, i) => 
          `${(min + i * bucketSize).toFixed(2)}-${(min + (i + 1) * bucketSize).toFixed(2)}`
        ),
        title: '交易金分布'
      };
    },

    // 生成网络拓扑图
    generateNetworkTopologyChart() {
      const data = graph.save();
      const nodeTypes = {};
      const edgeTypes = {};

      // 统计节点和边的类型
      data.nodes.forEach(node => {
        nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
      });

      data.edges.forEach(edge => {
        edgeTypes[edge.type] = (edgeTypes[edge.type] || 0) + 1;
      });

      return {
        type: 'networkTopology',
        nodeStats: nodeTypes,
        edgeStats: edgeTypes,
        title: '网络拓扑统计'
      };
    },

    // 计算的密度
    calculateGraphDensity() {
      const data = graph.save();
      const nodeCount = data.nodes.length;
      const edgeCount = data.edges.length;
      const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
      
      return {
        density: edgeCount / maxPossibleEdges,
        nodeCount,
        edgeCount,
        maxPossibleEdges
      };
    },

    // 分析图的连接性
    analyzeConnectivity() {
      const data = graph.save();
      const visited = new Set();
      const components = [];

      // 深度优先搜索找连通分量
      const dfs = (nodeId, component) => {
        visited.add(nodeId);
        component.push(nodeId);

        data.edges.forEach(edge => {
          if (edge.source === nodeId && !visited.has(edge.target)) {
            dfs(edge.target, component);
          }
          if (edge.target === nodeId && !visited.has(edge.source)) {
            dfs(edge.source, component);
          }
        });
      };

      // 找出所有连通分量
      data.nodes.forEach(node => {
        if (!visited.has(node.id)) {
          const component = [];
          dfs(node.id, component);
          components.push(component);
        }
      });

      return {
        componentCount: components.length,
        largestComponentSize: Math.max(...components.map(c => c.length)),
        components: components,
        isConnected: components.length === 1
      };
    },

    // 计算节点类型数量
    countNodeTypes() {
      const data = graph.save();
      const typeCounts = {};
      
      data.nodes.forEach(node => {
        typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
      });

      return {
        counts: typeCounts,
        total: data.nodes.length,
        distribution: Object.entries(typeCounts).map(([type, count]) => ({
          type,
          count,
          percentage: (count / data.nodes.length * 100).toFixed(2)
        }))
      };
    },

    // 计边类型数量
    countEdgeTypes() {
      const data = graph.save();
      const typeCounts = {};
      
      data.edges.forEach(edge => {
        typeCounts[edge.type] = (typeCounts[edge.type] || 0) + 1;
      });

      return {
        counts: typeCounts,
        total: data.edges.length,
        distribution: Object.entries(typeCounts).map(([type, count]) => ({
          type,
          count,
          percentage: (count / data.edges.length * 100).toFixed(2)
        }))
      };
    }
  };

  // 快照管理模块
  const SnapshotManager = {
    // 保存快照
    saveSnapshot() {
      const snapshot = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        name: prompt('请输入快照名称：', `快照 ${new Date().toLocaleString()}`),
        data: graph.save(),
        view: {
          zoom: graph.getZoom(),
          center: graph.getCenter()
        },
        filters: MultiDimensionalFilter.getFilterValues(),
        layout: document.getElementById('layoutSelect').value,
        highlights: this.captureHighlights(),
        metadata: {
          nodeCount: graph.getNodes().length,
          edgeCount: graph.getEdges().length,
          creator: localStorage.getItem('username') || 'unknown'
        }
      };

      // 保存到本地存储
      this.persistSnapshot(snapshot);
      this.updateSnapshotList();
      return snapshot.id;
    },

    // 持久化快照
    persistSnapshot(snapshot) {
      const snapshots = this.loadSnapshots();
      snapshots.push(snapshot);
      
      // 限制快照数量
      if (snapshots.length > 50) {
        snapshots.shift();
      }

      localStorage.setItem('graphSnapshots', JSON.stringify(snapshots));
      
      // 同时保存到 IndexedDB
      this.saveToIndexedDB(snapshot);
    },

    // 保存到 IndexedDB
    async saveToIndexedDB(snapshot) {
      const db = await this.openDB();
      const transaction = db.transaction(['snapshots'], 'readwrite');
      const store = transaction.objectStore('snapshots');
      await store.put(snapshot);
    },

    // 打开 IndexedDB
    openDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('GraphAnalysis', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('snapshots')) {
            db.createObjectStore('snapshots', { keyPath: 'id' });
          }
        };
      });
    },

    // 加载快照
    async loadSnapshot(snapshotId) {
      const snapshot = await this.getSnapshot(snapshotId);
      if (!snapshot) return;

      // 恢复图数据
        graph.changeData(snapshot.data);
      
      // 恢复视图状态
        graph.zoomTo(snapshot.view.zoom);
        graph.moveTo(snapshot.view.center.x, snapshot.view.center.y);
      
      // 恢复过滤器状态
      this.restoreFilters(snapshot.filters);
      
      // 恢复布局
      document.getElementById('layoutSelect').value = snapshot.layout;
      graph.updateLayout({
        type: snapshot.layout
      });
      
      // 恢复高亮状态
      this.restoreHighlights(snapshot.highlights);
    },

    // 获取快照
    async getSnapshot(snapshotId) {
      // 先从 IndexedDB 获取
      try {
        const db = await this.openDB();
        const transaction = db.transaction(['snapshots'], 'readonly');
        const store = transaction.objectStore('snapshots');
        const snapshot = await store.get(snapshotId);
        if (snapshot) return snapshot;
      } catch (error) {
        console.error('从 IndexedDB 获取照失败:', error);
      }

      // 回退到 localStorage
      const snapshots = this.loadSnapshots();
      return snapshots.find(s => s.id === snapshotId);
    },

    // 从本地存储加载快照列表
    loadSnapshots() {
      try {
        const snapshots = localStorage.getItem('graphSnapshots');
        return snapshots ? JSON.parse(snapshots) : [];
      } catch (error) {
        console.error('加载快照失败:', error);
        return [];
      }
    },

    // 捕获高亮状态
    captureHighlights() {
      const highlights = {
        nodes: [],
        edges: []
      };

      graph.getNodes().forEach(node => {
        if (node.hasState('selected') || node.hasState('highlighted')) {
          highlights.nodes.push({
            id: node.getModel().id,
            state: node.getStates()
          });
        }
      });

      graph.getEdges().forEach(edge => {
        if (edge.hasState('selected') || edge.hasState('highlighted')) {
          highlights.edges.push({
            id: edge.getModel().id,
            state: edge.getStates()
          });
        }
      });

      return highlights;
    },

    // 恢复高亮状态
    restoreHighlights(highlights) {
      highlights.nodes.forEach(highlight => {
        const node = graph.findById(highlight.id);
        if (node) {
          highlight.state.forEach(state => {
            graph.setItemState(node, state, true);
          });
        }
      });

      highlights.edges.forEach(highlight => {
        const edge = graph.findById(highlight.id);
        if (edge) {
          highlight.state.forEach(state => {
            graph.setItemState(edge, state, true);
          });
        }
      });
    },

    // 更新快照列表UI
    updateSnapshotList() {
      const snapshots = this.loadSnapshots();
      const container = document.getElementById('snapshotList');
      if (!container) return;

      container.innerHTML = snapshots.map(snapshot => `
        <div class="snapshot-item">
          <div class="snapshot-header">
            <span class="snapshot-name">${snapshot.name}</span>
            <span class="snapshot-time">${new Date(snapshot.timestamp).toLocaleString()}</span>
          </div>
          <div class="snapshot-meta">
            节点: ${snapshot.metadata.nodeCount}, 
            : ${snapshot.metadata.edgeCount}
          </div>
          <div class="snapshot-actions">
          <button onclick="SnapshotManager.loadSnapshot(${snapshot.id})">加载</button>
          <button onclick="SnapshotManager.deleteSnapshot(${snapshot.id})">删除</button>
            <button onclick="SnapshotManager.exportSnapshot(${snapshot.id})">导出</button>
        </div>
        </div>
      `).join('');
    },

    // 删除快照
    async deleteSnapshot(snapshotId) {
      // 从 IndexedDB 删除
      try {
        const db = await this.openDB();
        const transaction = db.transaction(['snapshots'], 'readwrite');
        const store = transaction.objectStore('snapshots');
        await store.delete(snapshotId);
      } catch (error) {
        console.error('从 IndexedDB 删除快照失败:', error);
      }

      // 从 localStorage 删除
      const snapshots = this.loadSnapshots().filter(s => s.id !== snapshotId);
      localStorage.setItem('graphSnapshots', JSON.stringify(snapshots));
      
      this.updateSnapshotList();
    },

    // 导出快照
    exportSnapshot(snapshotId) {
      this.getSnapshot(snapshotId).then(snapshot => {
        const blob = new Blob(
          [JSON.stringify(snapshot, null, 2)], 
          { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `snapshot-${snapshot.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  };

  // 绑定全局
  window.saveSnapshot = () => SnapshotManager.saveSnapshot();
  window.loadSnapshot = (id) => SnapshotManager.loadSnapshot(id);

  // 多维度过滤器模块
  const MultiDimensionalFilter = {
    // 应用过滤器
    applyFilters() {
      const filters = this.getFilterValues();
      const data = graph.save();
      
      // 过滤节点
      const filteredNodes = data.nodes.filter(node => 
        this.nodeMatchesFilters(node, filters)
      );

      // 过滤边
      const filteredEdges = data.edges.filter(edge =>
        this.edgeMatchesFilters(edge, filters) &&
        filteredNodes.some(n => n.id === edge.source) &&
        filteredNodes.some(n => n.id === edge.target)
      );

      // 更新图显示
      graph.changeData({
        nodes: filteredNodes,
        edges: filteredEdges
      });
    },

    // 获取过滤器值
    getFilterValues() {
      return {
        time: {
          start: new Date(document.getElementById('startDate').value),
          end: new Date(document.getElementById('endDate').value)
        },
        amount: {
          min: parseFloat(document.getElementById('minAmount').value) || 0,
          max: parseFloat(document.getElementById('maxAmount').value) || Infinity
        },
        risk: document.getElementById('riskLevel').value,
        nodeType: document.getElementById('nodeFilter').value
      };
    },

    // 检节点是否匹配过滤条件
    nodeMatchesFilters(node, filters) {
      // 节点类型过滤
      if (filters.nodeType !== 'all' && node.type !== filters.nodeType) {
        return false;
      }

      // 风险等级过滤
      if (filters.risk !== 'all') {
        const nodeRisk = this.calculateNodeRisk(node);
        if (!this.matchesRiskLevel(nodeRisk, filters.risk)) {
          return false;
        }
      }

      return true;
    },

    // 检查边是否匹配过滤条件
    edgeMatchesFilters(edge, filters) {
      // 时间过滤
      if (edge.timestamp) {
        const time = new Date(edge.timestamp);
        if (time < filters.time.start || time > filters.time.end) {
          return false;
        }
      }

      // 金额过滤
      if (edge.amount) {
        if (edge.amount < filters.amount.min || 
            edge.amount > filters.amount.max) {
          return false;
        }
      }

      return true;
    },

    // 计算节点风等级
    calculateNodeRisk(node) {
      // 实现节点风险评估逻辑
      let risk = 0;
      
      // 基于节点类型的风险
      const typeRisk = {
        'account': 30,
        'merchant': 20,
        'transaction': 10
      };
      risk += typeRisk[node.type] || 0;

      // 基于节点属性的风险
      if (node.properties) {
        if (node.properties.age < 30) risk += 10;
        if (node.properties.suspicious) risk += 20;
        if (node.properties.previousViolations) risk += 30;
      }

      return risk;
    },

    // 检查风险等级匹配
    matchesRiskLevel(risk, level) {
      switch (level) {
        case 'high': return risk >= 70;
        case 'medium': return risk >= 30 && risk < 70;
        case 'low': return risk < 30;
        default: return true;
      }
    }
  };

  // 绑定到全局
  window.applyFilters = () => MultiDimensionalFilter.applyFilters();

  // 关系分工具
  const RelationshipAnalysis = {
    // 团伙发现
    async findGroups() {
      const groups = await this.detectGroups(graph.save());
      this.highlightGroups(groups);
      this.updateRelationshipPanel('groups', groups);
    },

    // 关系路径分析
    async analyzeRelationPath() {
      const selectedNodes = graph.findAllByState('node', 'selected');
      if (selectedNodes.length !== 2) {
        alert('请选择两个节点进关系路径分析');
        return;
      }

      const paths = await this.findAllPaths(
        selectedNodes[0].getModel().id,
        selectedNodes[1].getModel().id
      );
      this.highlightPaths(paths);
      this.updateRelationshipPanel('paths', paths);
    },

    // 更新关系分析面板
    updateRelationshipPanel(type, data) {
      const panel = document.getElementById('relationshipResults');
      switch(type) {
        case 'groups':
          panel.innerHTML = this.renderGroupResults(data);
          break;
        case 'paths':
          panel.innerHTML = this.renderPathResults(data);
          break;
      }
    },

    // 团伙发现算法
    async detectGroups(graphData) {
      // 使用改进的 DBSCAN 算法
      const groups = this.improvedDBSCAN(graphData);
      // 使用社交网络分析方法进行验证
      const validatedGroups = this.validateGroups(groups, graphData);
      // 计算团伙特征
      return this.analyzeGroupCharacteristics(validatedGroups, graphData);
    },

    // 改进 DBSCAN 算法
    improvedDBSCAN(graphData) {
      const eps = 0.3; // 邻域半径
      const minPts = 3; // 最小点数
      const nodes = graphData.nodes;
      const visited = new Set();
      const groups = [];

      nodes.forEach(node => {
        if (visited.has(node.id)) return;

        const neighbors = this.findDensityNeighbors(node, graphData, eps);
        if (neighbors.length >= minPts) {
          const group = this.expandCluster(node, neighbors, visited, graphData, eps, minPts);
          if (group.length >= this.minClusterSize) {
            groups.push(group);
          }
        }
      });

      return groups;
    },

    // 查找密度邻居
    findDensityNeighbors(node, graphData, eps) {
      const neighbors = [];
      const nodeMetrics = this.calculateNodeMetrics(node, graphData);

      graphData.nodes.forEach(other => {
        if (other.id !== node.id) {
          const otherMetrics = this.calculateNodeMetrics(other, graphData);
          const similarity = this.calculateNodeSimilarity(nodeMetrics, otherMetrics);
          if (similarity >= eps) {
            neighbors.push(other.id);
          }
        }
      });

      return neighbors;
    },

    // 计算节点特征指标
    calculateNodeMetrics(node, graphData) {
      const edges = graphData.edges.filter(e => 
        e.source === node.id || e.target === node.id
      );

      return {
        degree: edges.length,
        inDegree: edges.filter(e => e.target === node.id).length,
        outDegree: edges.filter(e => e.source === node.id).length,
        transactionAmount: edges.reduce((sum, e) => sum + (e.amount || 0), 0), // 加上缺少的右括号和逗号
        transactionFrequency: this.calculateTransactionFrequency(edges),
        riskScore: this.calculateNodeRiskScore(node, edges)
      };
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

    // 计算点风险分数
    calculateNodeRiskScore(node, edges) {
      let score = 0;

      // 金额异常
      const amounts = edges.map(e => e.amount || 0);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const maxAmount = Math.max(...amounts);
      if (maxAmount > avgAmount * 3) {
        score += 30;
      }

      // 交易频率异常
      const frequency = this.calculateTransactionFrequency(edges);
      if (frequency > 10) { // 每天过10笔交易
        score += 20;
      }

      // 交易对手多样性
      const counterparties = new Set(edges.map(e => 
        e.source === node.id ? e.target : e.source
      ));
      if (counterparties.size > 10) {
        score += 20;
      }

      return Math.min(100, score);
    },

    // 计算节点相似度
    calculateNodeSimilarity(metrics1, metrics2) {
      const features = [
        'degree',
        'inDegree',
        'outDegree',
        'transactionAmount',
        'transactionFrequency',
        'riskScore'
      ];

      // 使用余弦相似度
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      features.forEach(feature => {
        dotProduct += metrics1[feature] * metrics2[feature];
        norm1 += metrics1[feature] * metrics1[feature];
        norm2 += metrics2[feature] * metrics2[feature];
      });

      return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    },

    // 验证团伙
    validateGroups(groups, graphData) {
      return groups.filter(group => {
        // 计算团伙内部接密度
        const density = this.calculateGroupDensity(group, graphData);
        // 计算团伙交易模式
        const patterns = this.analyzeGroupPatterns(group, graphData);
        // 计算团伙风险分数
        const risk = this.calculateGroupRisk(group, graphData);

        return density > 0.3 && patterns.suspicious && risk > 60;
      });
    },

    // 计算团伙特征
    analyzeGroupCharacteristics(groups, graphData) {
      return groups.map(group => ({
        members: group,
        size: group.length,
        density: this.calculateGroupDensity(group, graphData),
        patterns: this.analyzeGroupPatterns(group, graphData),
        risk: this.calculateGroupRisk(group, graphData),
        roles: this.identifyMemberRoles(group, graphData),
        timeline: this.createGroupTimeline(group, graphData)
      }));
    },

    // 识别成员角色
    identifyMemberRoles(group, graphData) {
      const roles = {};
      
      group.forEach(nodeId => {
        const metrics = this.calculateNodeMetrics(
          { id: nodeId }, 
          graphData
        );

        // 根据节点特征确定角色
        if (metrics.outDegree / metrics.degree > 0.8) {
          roles[nodeId] = 'source'; // 资金源
        } else if (metrics.inDegree / metrics.degree > 0.8) {
          roles[nodeId] = 'sink'; // 资金汇集点
        } else if (metrics.degree > 10) {
          roles[nodeId] = 'hub'; // 中转节点
        } else {
          roles[nodeId] = 'regular'; // 普通成员
        }
      });

      return roles;
    },

    // 建团伙时间线
    createGroupTimeline(group, graphData) {
      const events = [];
      
      // 收集所有相关交易
      graphData.edges
        .filter(edge => 
          group.includes(edge.source) && group.includes(edge.target)
        )  // 添加缺失的右括号
        .forEach(edge => {
          events.push({
            time: new Date(edge.timestamp),
            type: 'transaction',
            source: edge.source,
            target: edge.target,
            amount: edge.amount
          });
        });  // 添加缺失的右括号

      // 按时间排序
      events.sort((a, b) => a.time - b.time);

      return events;
    },

    // 查找邻居节点
    findNeighbors(nodeId, graphData) {
      const neighbors = new Set();
      graphData.edges.forEach(edge => {
        if (edge.source === nodeId) {
          neighbors.add(edge.target);
        }
        if (edge.target === nodeId) {
          neighbors.add(edge.source);
        }
      });
      return Array.from(neighbors);
    },

    // 高亮显示团伙
    highlightGroups(groups) {
      const colors = [
        '#ff7875', '#ff9c6e', '#ffc069', '#ffd666', 
        '#fff566', '#bae637', '#73d13d', '#36cfc9'
      ];

      groups.forEach((group, index) => {
        const color = colors[index % colors.length];
        group.forEach(nodeId => {
          const node = graph.findById(nodeId);
          if (node) {
            graph.updateItem(node, {
              style: {
                fill: color,
                stroke: '#fff',
                lineWidth: 2
              }
            });
          }
        });
      });
    },

    // 查找所有路径
    async findAllPaths(sourceId, targetId) {
      const paths = [];
      const visited = new Set();

      const dfs = (currentId, path = []) => {
        path.push(currentId);
        visited.add(currentId);

        if (currentId === targetId) {
          paths.push([...path]);
        } else {
          const edges = graph.save().edges.filter(edge => edge.source === currentId);
          edges.forEach(edge => {
            if (!visited.has(edge.target)) {
              dfs(edge.target, path);
            }
          });
        }

        path.pop();
        visited.delete(currentId);
      };

      dfs(sourceId);
      return paths;
    },

    // 高亮显示路径
    highlightPaths(paths) {
      // 清除现有高亮
      graph.getNodes().forEach(node => {
        graph.clearItemStates(node);
      });
      graph.getEdges().forEach(edge => {
        graph.clearItemStates(edge);
      });

      // 高亮路
      paths.forEach((path, pathIndex) => {
        path.forEach((nodeId, index) => {
          const node = graph.findById(nodeId);
          if (node) {
            graph.setItemState(node, 'highlight', true);
            if (index < path.length - 1) {
              const edge = graph.findEdge(nodeId, path[index + 1]);
              if (edge) {
                graph.setItemState(edge, 'highlight', true);
              }
            }
          }
        });
      });
    },

    // 渲染团伙分析结果
    renderGroupResults(groups) {
      return `
        <div class="group-results">
          <h5>现 ${groups.length} 个可疑团伙</h5>
          ${groups.map((group, index) => `
            <div class="group-item">
              <div class="group-header">
                团伙 ${index + 1} (${group.length} 个节点)
              </div>
              <div class="group-details">
                <div>核心成员: ${this.renderCoreMembers(group)}</div>
                <div>风险评分: ${this.calculateGroupRiskScore(group)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },

    // 渲染核心成员
    renderCoreMembers(group) {
      const coreMembers = group.slice(0, 3);
      return coreMembers.map(nodeId => {
        const node = graph.findById(nodeId)?.getModel();
        return node ? (node.label || nodeId) : nodeId;
      }).join(', ') + (group.length > 3 ? ` 等${group.length}人` : '');
    },

    // 计算团伙风险评分
    calculateGroupRiskScore(group) {
      // 基础分数
      let score = group.length * 10;

      // 计算内部交易
      const internalTransactions = graph.getEdges().filter(edge => {
        const source = edge.getSource().getModel().id;
        const target = edge.getTarget().getModel().id;
        return group.includes(source) && group.includes(target);
      });

      // 交易密度加分
      const maxPossibleTransactions = (group.length * (group.length - 1)) / 2;
      const density = internalTransactions.length / maxPossibleTransactions;
      score += density * 50;

      // 交易金额加分
      const totalAmount = internalTransactions.reduce((sum, edge) => {
        return sum + (edge.getModel().amount || 0);
      }, 0);
      score += Math.min(totalAmount / 10000, 50); // 最高50分

      return Math.min(100, Math.round(score)); // 最高100分
    },

    // 关系强度分析
    analyzeRelationshipStrength(source, target) {
      const directTransactions = [];
      const indirectPaths = [];
      
      // 直接交易
      graph.getEdges().forEach(edge => {
        const model = edge.getModel();
        if ((model.source === source && model.target === target) ||
            (model.source === target && model.target === source)) {
          directTransactions.push(model);
        }
      });

      // 间接路径（最多2跳）
      const visited = new Set();
      const queue = [[source]];
      
      while (queue.length > 0) {
        const path = queue.shift();
        const lastNode = path[path.length - 1];
        
        if (path.length > 3) continue; // 制路径长度
        
        graph.getEdges().forEach(edge => {
          const model = edge.getModel();
          if (model.source === lastNode) {
            const nextNode = model.target;
            if (!visited.has(nextNode) && !path.includes(nextNode)) {
              const newPath = [...path, nextNode];
              if (nextNode === target) {
                indirectPaths.push(newPath);
              } else {
                queue.push(newPath);
              }
              visited.add(nextNode);
            }
          }
        });
      }

      return {
        directTransactions,
        indirectPaths,
        strength: this.calculateRelationshipStrength(directTransactions, indirectPaths)
      };
    },

    // 计算关系强度分数
    calculateRelationshipStrength(directTrans, indirectPaths) {
      let strength = 0;
      
      // 直接交易权重
      strength += directTrans.length * 10;
      
      // 直接交易金额
      const amounts = directTrans.map(t => t.amount || 0);
      if (amounts.length > 0) {
        strength += Math.log(amounts.reduce((a, b) => a + b)) * 2;
      }
      
      // 间接路径权重
      strength += indirectPaths.length * 5;
      
      // 归一化到0-100
      return Math.min(100, strength);
    },

    // 时序分析
    analyzeTemporalPatterns(group) {
      const transactions = [];
      
      // 收集所有相关交易
      group.forEach(nodeId => {
        graph.getEdges().forEach(edge => {
          const model = edge.getModel();
          if (group.includes(model.source) && group.includes(model.target)) {
            transactions.push({
              ...model,
              timestamp: new Date(model.timestamp)
            });
          }
        });
      });

      // 按时间排序
      transactions.sort((a, b) => a.timestamp - b.timestamp);

      // 分析时间模式
      const patterns = {
        frequency: this.analyzeFrequency(transactions),
        periodicity: this.analyzePeriodicity(transactions),
        bursts: this.analyzeBursts(transactions)
      };

      return patterns;
    },

    // 分析交频率
    analyzeFrequency(transactions) {
      if (transactions.length < 2) return null;

      const intervals = [];
      for (let i = 1; i < transactions.length; i++) {
        intervals.push(transactions[i].timestamp - transactions[i-1].timestamp);
      }

      return {
        avgInterval: intervals.reduce((a, b) => a + b) / intervals.length,
        minInterval: Math.min(...intervals),
        maxInterval: Math.max(...intervals)
      };
    },

    // 分析周期
    analyzePeriodicity(transactions) {
      // 简单的周期检测
      const hourCounts = new Array(24).fill(0);
      const dayCounts = new Array(7).fill(0);

      transactions.forEach(t => {
        hourCounts[t.timestamp.getHours()]++;
        dayCounts[t.timestamp.getDay()]++;
      });

      return {
        hourlyPattern: hourCounts,
        dailyPattern: dayCounts
      };
    },

    // 分析突发行为
    analyzeBursts(transactions) {
      const bursts = [];
      const timeWindow = 3600000; // 1小时
      let currentBurst = [transactions[0]];

      for (let i = 1; i < transactions.length; i++) {
        if (transactions[i].timestamp - transactions[i-1].timestamp <= timeWindow) {
          currentBurst.push(transactions[i]);
        } else {
          if (currentBurst.length >= 3) {
            bursts.push([...currentBurst]);
          }
          currentBurst = [transactions[i]];
        }
      }

      if (currentBurst.length >= 3) {
        bursts.push(currentBurst);
      }

      return bursts;
    },

    // 义常量
    minPts: 3,  // DBSCAN算法的最小点数
    minClusterSize: 3,  // 最小团伙规模

    // 高亮显示特定团伙
    highlightGroup(groupIndex) {
      const groups = this.detectGroups(graph.save());
      const group = groups[groupIndex];
      if (!group) return;

      // 清除现有高亮
      graph.getNodes().forEach(node => graph.clearItemStates(node));
      graph.getEdges().forEach(edge => graph.clearItemStates(edge));

      // 高亮团伙成员
      group.forEach(nodeId => {
        const node = graph.findById(nodeId);
        if (node) {
          graph.setItemState(node, 'group', true);
        }
      });

      // 高亮团伙内部的边
      graph.getEdges().forEach(edge => {
        const source = edge.getSource().getModel().id;
        const target = edge.getTarget().getModel().id;
        if (group.includes(source) && group.includes(target)) {
          graph.setItemState(edge, 'group', true);
        }
      });

      // 显示团伙信息
      this.showGroupInfo(group, groupIndex);
    },

    // 高亮显示特定路径
    highlightPath(pathIndex) {
      const selectedNodes = graph.findAllByState('node', 'selected');
      if (selectedNodes.length !== 2) return;

      const paths = this.findAllPaths(
        selectedNodes[0].getModel().id,
        selectedNodes[1].getModel().id
      );
      const path = paths[pathIndex];
      if (!path) return;

      // 清除现有高亮
      graph.getNodes().forEach(node => graph.clearItemStates(node));
      graph.getEdges().forEach(edge => graph.clearItemStates(edge));

      // 高亮路径上的节点和边
      path.forEach((nodeId, index) => {
        const node = graph.findById(nodeId);
        if (node) {
          graph.setItemState(node, 'path', true);
          if (index < path.length - 1) {
            const nextNode = path[index + 1];
            const edge = graph.findEdge(nodeId, nextNode);
            if (edge) {
              graph.setItemState(edge, 'path', true);
            }
          }
        }
      });

      // 显示路径信息
      this.showPathInfo(path, pathIndex);
    },

    // 显示团伙信息
    showGroupInfo(group, index) {
      const info = document.createElement('div');
      info.className = 'group-info';
      info.innerHTML = `
        <h3>团伙 ${index + 1}</h3>
        <div>成员数量: ${group.length}</div>
        <div>风险评分: ${this.calculateGroupRiskScore(group)}</div>
        <div class="group-timeline">
          ${this.renderGroupTimeline(group)}
        </div>
      `;
      
      this.showInfoPanel(info);
    },

    // 示路径信息
    showPathInfo(path, index) {
      const info = document.createElement('div');
      info.className = 'path-info';
      info.innerHTML = `
        <h3>路径 ${index + 1}</h3>
        <div>径长度: ${path.length - 1} 步</div>
        <div>节点数量: ${path.length}</div>
        <div class="path-details">
          ${this.renderPathDetails(path)}
        </div>
      `;
      
      this.showInfoPanel(info);
    }
  };

  // 将新功能绑定到全局
  window.exportReport = () => ReportExport.exportReport();
  window.saveSnapshot = () => SnapshotManager.saveSnapshot();
  window.loadSnapshot = (id) => SnapshotManager.loadSnapshot(id);
  window.applyFilters = () => MultiDimensionalFilter.applyFilters();
  window.findGroups = () => RelationshipAnalysis.findGroups();
  window.analyzeRelationPath = () => RelationshipAnalysis.analyzeRelationPath();

  // 取证工模块
  const ForensicsTools = {
    evidence: {
      markers: [],
      comments: [],
      screenshots: [],
      nodes: []
    },

    // 亮显示带有注释的元素
    highlightCommentedElements(commentId) {
      const comment = this.evidence.comments.find(c => c.id === commentId);
      if (!comment) return;

      // 清除现有高亮
      graph.getNodes().forEach(node => graph.clearItemStates(node));
      graph.getEdges().forEach(edge => graph.clearItemStates(edge));

      // 高亮节点
      comment.elements.nodes.forEach(nodeId => {
        const node = graph.findById(nodeId);
        if (node) {
          graph.setItemState(node, 'commented', true);
        }
      });

      // 高亮边
      comment.elements.edges.forEach(edgeId => {
        const edge = graph.findById(edgeId);
        if (edge) {
          graph.setItemState(edge, 'commented', true);
        }
      });

      // 添加注释提示
      this.showCommentTooltip(comment);
    },

    // 显示注释提示
    showCommentTooltip(comment) {
      const tooltip = document.createElement('div');
      tooltip.className = 'comment-tooltip';
      tooltip.innerHTML = `
        <div class="comment-content">${comment.content}</div>
        <div class="comment-time">${new Date(comment.timestamp).toLocaleString()}</div>
      `;
      
      document.body.appendChild(tooltip);

      // 定位提示框
      const firstNode = graph.findById(comment.elements.nodes[0]);
      if (firstNode) {
        const bbox = firstNode.getBBox();
        const point = graph.getCanvasByPoint(bbox.centerX, bbox.centerY);
        tooltip.style.left = `${point.x}px`;
        tooltip.style.top = `${point.y - tooltip.offsetHeight - 10}px`;
      }

      // 自动隐藏
      setTimeout(() => {
        tooltip.remove();
      }, 3000);
    },

    // 更新证据列表
    updateEvidenceList() {
      const evidenceList = document.getElementById('evidenceList');
      evidenceList.innerHTML = `
        ${this.renderMarkers()}
        ${this.renderComments()}
        ${this.renderNodes()}
      `;
    },

    // 渲染标记列表
    renderMarkers() {
      return this.evidence.markers.map(marker => `
        <div class="evidence-item marker">
          <div class="evidence-type">标记</div>
          <div class="evidence-label">${marker.label}</div>
          <div class="evidence-time">${new Date(marker.timestamp).toLocaleString()}</div>
          <button onclick="ForensicsTools.highlightMarker('${marker.id}')">查看</button>
        </div>
      `).join('');
    },

    // 渲染注释列表
    renderComments() {
      return this.evidence.comments.map(comment => `
        <div class="evidence-item comment">
          <div class="evidence-type">注释</div>
          <div class="evidence-content">${comment.content}</div>
          <div class="evidence-time">${new Date(comment.timestamp).toLocaleString()}</div>
          <button onclick="ForensicsTools.highlightCommentedElements('${comment.id}')">查看</button>
        </div>
      `).join('');
    },

    // 渲染节点列表
    renderNodes() {
      return this.evidence.nodes.map(node => `
        <div class="evidence-item node">
          <div class="evidence-type">节点</div>
          <div class="evidence-label">${node.label || node.id}</div>
          <div class="evidence-time">${new Date(node.timestamp).toLocaleString()}</div>
          <button onclick="ForensicsTools.highlightNode('${node.id}')">查看</button>
        </div>
      `).join('');
    },

    // 高亮标记
    highlightMarker(markerId) {
      const marker = this.evidence.markers.find(m => m.id === markerId);
      if (!marker) return;

      // 清除现高亮
      graph.getNodes().forEach(node => graph.clearItemStates(node));

      // 高亮标记的节点
      const node = graph.findById(marker.nodeId);
      if (node) {
        graph.setItemState(node, 'marked', true);
        graph.focusItem(node);
      }
    },

    // 高亮节点
    highlightNode(nodeId) {
      const node = graph.findById(nodeId);
      if (!node) return;

      // 清除现有高亮
      graph.getNodes().forEach(n => graph.clearItemStates(n));

      // 高亮节点
      graph.setItemState(node, 'highlighted', true);
      graph.focusItem(node);
    },

    // 导出证据包
    exportEvidence() {
      const evidencePackage = {
        timestamp: new Date().toISOString(),
        caseId: `CASE-${Date.now()}`,
        evidence: this.evidence,
        graphState: graph.save(),
        metadata: {
          investigator: localStorage.getItem('investigatorName') || 'Unknown',
          analysisTime: new Date().toLocaleString()
        }
      };

      // 创建下载
      const blob = new Blob([JSON.stringify(evidencePackage, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-package-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // 绑定到全局
  window.ForensicsTools = ForensicsTools;

  // 时间轴控制模块
  const TimelineController = {
    isPlaying: false,
    playInterval: null,
    currentTime: null,
    timeData: [],
    playbackSpeed: 1000, // 播放速度（毫秒/帧）

    // 初始化时间轴
    initialize(data) {
      this.timeData = data.edges
        .filter(edge => edge.timestamp)
        .map(edge => ({
          time: new Date(edge.timestamp),
          edge: edge
        }))
        .sort((a, b) => a.time - b.time);

      if (this.timeData.length === 0) return;

      const slider = document.getElementById('timelineSlider');
      slider.min = 0;
      slider.max = this.timeData.length - 1;
      slider.value = 0;

      this.currentTime = this.timeData[0].time;
      this.updateTimeDisplay();
    },

    // 播放/暂停切换
    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    },

    // 开始播放
    play() {
      if (!this.timeData.length) return;
      
      this.isPlaying = true;
      const playButton = document.querySelector('.timeline-controls button');
      playButton.textContent = '暂停';

      const slider = document.getElementById('timelineSlider');
      let currentIndex = parseInt(slider.value);
      
      this.playInterval = setInterval(() => {
        currentIndex++;
        if (currentIndex >= this.timeData.length) {
          this.pause();
          return;
        }
        
        this.jumpToIndex(currentIndex);
        slider.value = currentIndex;
      }, this.playbackSpeed);
    },

    // 暂停播放
    pause() {
      this.isPlaying = false;
      document.querySelector('.timeline-controls button').textContent = '播放';
      if (this.playInterval) {
        clearInterval(this.playInterval);
        this.playInterval = null;
      }
    },

    // 跳转到指定索引
    jumpToIndex(index) {
      const timePoint = this.timeData[index];
      if (!timePoint) return;

      this.currentTime = timePoint.time;
      this.updateTimeDisplay();
      this.filterDataByTime(this.currentTime);
    },

    // 更新时间显示
    updateTimeDisplay() {
      document.getElementById('currentTime').textContent = 
        this.currentTime.toLocaleString();
    },

    // 根据时间筛选数据
    filterDataByTime(timestamp) {
      const data = graph.save();
      const filteredEdges = data.edges.filter(edge => 
        new Date(edge.timestamp) <= timestamp
      );

      // 获取相关节点
      const relevantNodes = new Set();
      filteredEdges.forEach(edge => {
        relevantNodes.add(edge.source);
        relevantNodes.add(edge.target);
      });

      const filteredNodes = data.nodes.filter(node => 
        relevantNodes.has(node.id)
      );

      graph.changeData({
        nodes: filteredNodes,
        edges: filteredEdges
      });
    }
  };

  // 绑定到全局
  window.playTimeline = () => TimelineController.togglePlay();

  // 添搜索功能
  const SearchModule = {
    // 执搜索
    searchNodes() {
      const searchTerm = document.getElementById('nodeSearch').value.toLowerCase();
      const searchResults = [];
      
      graph.getNodes().forEach(node => {
        const model = node.getModel();
        // 搜索节点ID、标签和其他属性
        if (model.id.toLowerCase().includes(searchTerm) ||
            (model.label && model.label.toLowerCase().includes(searchTerm)) ||
            this.searchNodeProperties(model, searchTerm)) {
          searchResults.push(model);
        }
      });

      this.displaySearchResults(searchResults);
    },

    // 搜索节点属性
    searchNodeProperties(model, term) {
      if (!model.properties) return false;
      return Object.values(model.properties).some(value => 
        String(value).toLowerCase().includes(term)
      );
    },

    // 显示搜索结果
    displaySearchResults(results) {
      const resultsContainer = document.getElementById('searchResults');
      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">未找到匹配结果</div>';
        return;
      }

      resultsContainer.innerHTML = results.map(node => `
        <div class="search-result-item" onclick="SearchModule.focusNode('${node.id}')">
          <div class="result-type">${node.type || '节点'}</div>
          <div class="result-label">${node.label || node.id}</div>
        </div>
      `).join('');
    },

    // 定位到指定节点
    focusNode(nodeId) {
      const node = graph.findById(nodeId);
      if (!node) return;

      // 清除之前的高亮
      graph.getNodes().forEach(n => graph.clearItemStates(n));
      
      // 高亮选中的节点
      graph.setItemState(node, 'selected', true);
      
      // 将节点移动到视图中心
      const nodePosition = node.getModel();
      graph.focusItem(node);
      
      // 添加缩放动画
      graph.zoomTo(1.5, {
        x: nodePosition.x,
        y: nodePosition.y
      });
    }
  };

  // 绑定到全局
  window.searchNodes = () => SearchModule.searchNodes();

  // 布局管理模块
  const LayoutManager = {
    currentLayout: 'force',
    layoutConfigs: {
      force: {
        type: 'force',
        preventOverlap: true,
        linkDistance: 100,
        nodeStrength: -50,
        edgeStrength: 0.1
      },
      circular: {
        type: 'circular',
        radius: 200,
        divisions: 5,
        ordering: 'degree',
        angleRatio: 1
      },
      radial: {
        type: 'radial',
        unitRadius: 100,
        preventOverlap: true,
        strictRadial: false
      },
      dagre: {
        type: 'dagre',
        rankdir: 'TB',
        align: 'UL',
        nodesep: 20,
        ranksep: 50
      },
      concentric: {
        type: 'concentric',
        minNodeSpacing: 30,
        preventOverlap: true,
        sortBy: 'degree'
      }
    },

    // 切换布局
    changeLayout(layoutType) {
      if (!this.layoutConfigs[layoutType]) return;
      
      this.currentLayout = layoutType;
      const config = this.layoutConfigs[layoutType];

      // 更新布局参数控制面板
      this.updateLayoutParams(layoutType);

      // 应用新布局
      graph.updateLayout(config);
    },

    // 更新布局参数控制面板
    updateLayoutParams(layoutType) {
      const paramsContainer = document.getElementById('layoutParams');
      const forceParams = document.getElementById('forceParams');

      switch(layoutType) {
        case 'force':
          forceParams.style.display = 'block';
          break;
        default:
          forceParams.style.display = 'none';
      }
    },

    // 更新力导向布局参数
    updateForceDistance(distance) {
      if (this.currentLayout !== 'force') return;
      
      const config = {
        ...this.layoutConfigs.force,
        linkDistance: Number(distance)
      };
      graph.updateLayout(config);
    }
  };

  // 绑定到全局
  window.changeLayout = () => {
    const layoutType = document.getElementById('layoutSelect').value;
    LayoutManager.changeLayout(layoutType);
  };

  window.updateForceDistance = (value) => {
    LayoutManager.updateForceDistance(value);
  };

  // 主题管理模块
  const ThemeManager = {
    themes: {
      default: {
        background: '#ffffff',
        nodeColors: {
          account: '#91d5ff',
          transaction: '#87e8de',
          merchant: '#ffadd2'
        },
        edgeColor: '#e2e2e2',
        textColor: '#333333'
      },
      dark: {
        background: '#1f1f1f',
        nodeColors: {
          account: '#177ddc',
          transaction: '#13a8a8',
          merchant: '#cb2b83'
        },
        edgeColor: '#434343',
        textColor: '#ffffff'
      },
      colorful: {
        background: '#f0f2f5',
        nodeColors: {
          account: '#ff7a45',
          transaction: '#36cfc9',
          merchant: '#9254de'
        },
        edgeColor: '#5cdbd3',
        textColor: '#434343'
      }
    },

    // 切换主题
    changeTheme(themeName) {
      if (!this.themes[themeName]) return;
      
      const theme = this.themes[themeName];
      document.body.setAttribute('data-theme', themeName);
      
      // 更新图的样式
      graph.getNodes().forEach(node => {
        const model = node.getModel();
        graph.updateItem(node, {
          style: {
            fill: theme.nodeColors[model.type] || theme.nodeColors.default,
            stroke: theme.edgeColor,
            'text-color': theme.textColor
          }
        });
      });

      graph.getEdges().forEach(edge => {
        graph.updateItem(edge, {
          style: {
            stroke: theme.edgeColor,
            'text-color': theme.textColor
          }
        });
      });

      // 更新容器背景
      document.getElementById('container').style.background = theme.background;
    }
  };

  // 绑定到全局
  window.changeTheme = () => {
    const themeName = document.getElementById('themeSelect').value;
    ThemeManager.changeTheme(themeName);
  };

  // 边特效管理模块
  const EdgeEffectManager = {
    currentEffect: 'none',
    
    // 切换边特效
    changeEdgeEffect(effectType) {
      this.currentEffect = effectType;
      
      graph.getEdges().forEach(edge => {
        const style = this.getEdgeStyle(effectType);
        graph.updateItem(edge, {
          style: style
        });
      });
    },

    // 获取边式
    getEdgeStyle(effectType) {
      const baseStyle = {
        stroke: '#e2e2e2',
        lineWidth: 1,
        endArrow: true
      };

      switch(effectType) {
        case 'flow':
          return {
            ...baseStyle,
            lineDash: [4, 2],
            lineDashOffset: 0,
            animation: {
              lineDashOffset: true,
              repeat: true,
              duration: 1000
            }
          };
        case 'glow':
          return {
            ...baseStyle,
            lineWidth: 2,
            shadowColor: '#1890ff',
            shadowBlur: 10,
            animation: {
              shadowBlur: true,
              repeat: true,
              duration: 1500,
              delay: 0
            }
          };
        default:
          return baseStyle;
      }
    }
  };

  // 绑定到全局
  window.changeEdgeEffect = () => {
    const effectType = document.getElementById('edgeEffect').value;
    EdgeEffectManager.changeEdgeEffect(effectType);
  };

  // 动画效果管理模块
  const AnimationManager = {
    nodeAnimationEnabled: false,
    edgeAnimationEnabled: false,

    // 切换节点动画
    toggleNodeAnimation() {
      this.nodeAnimationEnabled = !this.nodeAnimationEnabled;
      
      graph.getNodes().forEach(node => {
        if (this.nodeAnimationEnabled) {
          graph.updateItem(node, {
            style: {
              animation: {
                r: {
                  value: [node.getModel().size / 2, node.getModel().size / 2 + 5],
                  duration: 2000,
                  easing: 'easeCubic',
                  repeat: true,
                  yoyo: true
                },
                opacity: {
                  value: [1, 0.5],
                  duration: 2000,
                  easing: 'easeCubic',
                  repeat: true,
                  yoyo: true
                }
              }
            }
          });
        } else {
          graph.updateItem(node, {
            style: {
              animation: null
            }
          });
        }
      });
    },

    // 切换动画
    toggleEdgeAnimation() {
      this.edgeAnimationEnabled = !this.edgeAnimationEnabled;
      
      graph.getEdges().forEach(edge => {
        if (this.edgeAnimationEnabled) {
          graph.updateItem(edge, {
            style: {
              lineDash: [4, 2],
              animation: {
                lineDashOffset: {
                  value: [-10, 10],
                  duration: 1000,
                  repeat: true
                }
              }
            }
          });
        } else {
          graph.updateItem(edge, {
            style: {
              lineDash: null,
              animation: null
            }
          });
        }
      });
    }
  };

  // 绑定到全局
  window.toggleNodeAnimation = () => AnimationManager.toggleNodeAnimation();
  window.toggleEdgeAnimation = () => AnimationManager.toggleEdgeAnimation();

  // 性能监控模块
  const PerformanceMonitor = {
    stats: null,
    panels: {},
    metrics: {},

    // 初始化性能监控
    initialize() {
      if (typeof Stats === 'undefined') {
        console.warn('Stats.js 未加载，性能监控将被禁用');
        return;
      }
      this.stats = new Stats();
      this.setupPanels();
      this.startMonitoring();
    },

    // 设置监控面板
    setupPanels() {
      // FPS面板
      this.panels.fps = this.stats.addPanel(new Stats.Panel('FPS', '#0ff', '#002'));
      // 内存面板
      this.panels.memory = this.stats.addPanel(new Stats.Panel('MB', '#f08', '#201'));
      
      this.stats.showPanel(0); // 默认显示FPS面板
    },

    // 开始监控
    startMonitoring() {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.right = '320px';
      container.appendChild(this.stats.dom);
      document.body.appendChild(container);

      this.animate();
    },

    // 动画循环
    animate() {
      this.stats.begin();
      this.stats.end();
      requestAnimationFrame(() => this.animate());
    }
  };

  // 初始化性能监控
  PerformanceMonitor.initialize();

  // 图片导出模块
  const ExportManager = {
    // 导出图片
    exportImage(type = 'png') {
      const canvas = document.querySelector('#container canvas');
      let url;

      if (type === 'svg') {
        // 导出SVG
        const svg = graph.toSVG();
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        url = URL.createObjectURL(blob);
      } else {
        // 导出PNG
        url = canvas.toDataURL('image/png');
      }

      // 创建下载链接
      const link = document.createElement('a');
      link.download = `graph-export-${Date.now()}.${type}`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    // 导出当前视图为高清图片
    exportHighQuality() {
      const scale = 2; // 2倍分辨率
      const canvas = document.querySelector('#container canvas');
      const scaledCanvas = document.createElement('canvas');
      const ctx = scaledCanvas.getContext('2d');

      scaledCanvas.width = canvas.width * scale;
      scaledCanvas.height = canvas.height * scale;
      
      ctx.scale(scale, scale);
      ctx.drawImage(canvas, 0, 0);

      const url = scaledCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `graph-hd-${Date.now()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    // 导出到Excel
    exportToExcel() {
      const data = graph.save();
      const workbook = {
        SheetNames: ['Nodes', 'Edges', 'Analysis'],
        Sheets: {
          Nodes: this.createNodesSheet(data.nodes),
          Edges: this.createEdgesSheet(data.edges),
          Analysis: this.createAnalysisSheet()
        }
      };

      // 使用 SheetJS 导出
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveFile(excelBuffer, `fraud-analysis-${Date.now()}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    },

    // 创建节点表格
    createNodesSheet(nodes) {
      const data = nodes.map(node => ({
        ID: node.id,
        Type: node.type,
        Label: node.label,
        Properties: JSON.stringify(node.properties)
      }));
      return XLSX.utils.json_to_sheet(data);
    },

    // 创建边表格
    createEdgesSheet(edges) {
      const data = edges.map(edge => ({
        ID: edge.id,
        Source: edge.source,
        Target: edge.target,
        Type: edge.type,
        Amount: edge.amount,
        Timestamp: edge.timestamp
      }));
      return XLSX.utils.json_to_sheet(data);
    },

    // 创建分析结果表格
    createAnalysisSheet() {
      const analysis = {
        centrality: GraphAlgorithms.calculateCentrality(graph),
        communities: GraphAlgorithms.detectCommunities(graph),
        anomalies: AnomalyDetection.detectAnomalies()
      };
      return XLSX.utils.json_to_sheet([analysis]);
    },

    // 生成PDF告
    async generatePDFReport() {
      const doc = new jsPDF();
      const report = await ReportExport.generateFullReport();
      
      // 添加报告头部
      doc.setFontSize(20);
      doc.text('欺诈分析调查报告', 20, 20);
      
      // 添加基本信息
      doc.setFontSize(12);
      doc.text(`生成时间: ${new Date().toLocaleString()}`, 20, 40);
      doc.text(`案件编号: ${report.metadata.caseId}`, 20, 50);
      
      // 添加统计信息
      doc.text('数据统计', 20, 70);
      doc.text(`节点总数: ${report.graphInfo.nodes}`, 30, 80);
      doc.text(`边总: ${report.graphInfo.edges}`, 30, 90);
      
      // 添加异常发现
      doc.text('异常发现', 20, 110);
      report.anomalies.forEach((anomaly, index) => {
        doc.text(`${index + 1}. ${anomaly.description}`, 30, 120 + index * 10);
      });
      
      // 添加图表
      const canvas = document.querySelector('#container canvas');
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 20, 160, 170, 100);
      
      // 保存PDF
      doc.save(`fraud-analysis-report-${Date.now()}.pdf`);
    },

    // 保存文件
    saveFile(buffer, filename, mimeType) {
      const blob = new Blob([buffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // 绑定全
  window.exportImage = (type) => ExportManager.exportImage(type);
  window.exportHighQuality = () => ExportManager.exportHighQuality();
  window.exportToExcel = () => ExportManager.exportToExcel();
  window.generatePDFReport = () => ExportManager.generatePDFReport();

  // 节点过滤模块
  const FilterManager = {
    // 过滤节点
    filterNodes() {
      const filterType = document.getElementById('nodeFilter').value;
      const nodes = graph.getNodes();
      const edges = graph.getEdges();

      if (filterType === 'all') {
        nodes.forEach(node => {
          node.show();
          graph.setItemState(node, 'dimmed', false);
        });
        edges.forEach(edge => {
          edge.show();
          graph.setItemState(edge, 'dimmed', false);
        });
        return;
      }

      // 过滤节点和相关边
      nodes.forEach(node => {
        const nodeType = node.getModel().type;
        if (nodeType === filterType) {
          node.show();
          graph.setItemState(node, 'dimmed', false);
        } else {
          node.hide();
          graph.setItemState(node, 'dimmed', true);
        }
      });

      // 处理边的显示
      edges.forEach(edge => {
        const sourceVisible = edge.getSource().isVisible();
        const targetVisible = edge.getTarget().isVisible();
        if (sourceVisible && targetVisible) {
          edge.show();
          graph.setItemState(edge, 'dimmed', false);
        } else {
          edge.hide();
          graph.setItemState(edge, 'dimmed', true);
        }
      });

      graph.paint();
    },

    // 根据属性过滤
    filterByProperty(property, value) {
      const nodes = graph.getNodes();
      nodes.forEach(node => {
        const model = node.getModel();
        if (model.properties && model.properties[property] === value) {
          node.show();
          graph.setItemState(node, 'dimmed', false);
        } else {
          node.hide();
          graph.setItemState(node, 'dimmed', true);
        }
      });
      graph.paint();
    }
  };

  // 绑定到全局
  window.filterNodes = () => FilterManager.filterNodes();
  window.filterByProperty = (property, value) => FilterManager.filterByProperty(property, value);

  // 在现有代码中添加以下函数

  // 标节点
  function markNode(nodeId) {
    const node = graph.findById(nodeId);
    if (!node) return;

    const label = prompt('请输入标记明：');
    if (!label) return;

    ForensicsTools.evidence.markers.push({
      id: Date.now(),
      nodeId,
      label,
      timestamp: new Date().toISOString()
    });

    // 添加视觉标记
    graph.updateItem(node, {
      style: {
        stroke: '#f5222d',
        lineWidth: 3
      }
    });

    ForensicsTools.updateEvidenceList();
  }

  // 展开关联节点
  function expandNode(nodeId) {
    const node = graph.findById(nodeId);
    if (!node) return;

    // 获取一度关联节点
    const neighbors = new Set();
    graph.getEdges().forEach(edge => {
      const model = edge.getModel();
      if (model.source === nodeId) {
        neighbors.add(model.target);
      }
      if (model.target === nodeId) {
        neighbors.add(model.source);
      }
    });

    // 高亮显示关联节点
    neighbors.forEach(neighborId => {
      const neighborNode = graph.findById(neighborId);
      if (neighborNode) {
        graph.setItemState(neighborNode, 'highlight', true);
        // 获取连接边并高亮
        const edge = graph.findEdge(nodeId, neighborId) || graph.findEdge(neighborId, nodeId);
        if (edge) {
          graph.setItemState(edge, 'highlight', true);
        }
      }
    });
  }

  // 隐藏节点
  function hideNode(nodeId) {
    const node = graph.findById(nodeId);
    if (!node) return;

    // 隐藏点及其关联
    graph.hideItem(node);
    graph.getEdges().forEach(edge => {
      const model = edge.getModel();
      if (model.source === nodeId || model.target === nodeId) {
        graph.hideItem(edge);
      }
    });
  }

  // 添加到证据
  function addToEvidence(nodeId) {
    const node = graph.findById(nodeId);
    if (!node) return;

    const nodeModel = node.getModel();
    ForensicsTools.evidence.nodes.push({
      id: nodeId,
      type: nodeModel.type,
      label: nodeModel.label,
      properties: nodeModel.properties,
      timestamp: new Date().toISOString()
    });

    // 更新证据列表
    ForensicsTools.updateEvidenceList();
  }

  // 绑定到全局
  window.markNode = markNode;
  window.expandNode = expandNode;
  window.hideNode = hideNode;
  window.addToEvidence = addToEvidence;

  
  // 图形渲染器增强
  const GraphRenderer = {
    // 自定义节点染
    registerCustomRenderers() {
      // 高性能节点渲染器
      G6.registerNode('performance-node', {
        draw(cfg, group) {
          const { size = 30, style = {} } = cfg;
          const shape = group.addShape('circle', {
            attrs: {
              x: 0,
              y: 0,
              r: size / 2,
              ...style
            },
            name: 'circle-shape',
            draggable: true
          });

          if (cfg.label) {
            group.addShape('text', {
              attrs: {
                text: cfg.label,
                x: 0,
                y: size / 2 + 10,
                textAlign: 'center',
                textBaseline: 'middle',
                fill: style.labelFill || '#666',
                fontSize: 12
              },
              name: 'text-shape'
            });
          }

          return shape;
        },
        
        // 更新方法优化
        update(cfg, node) {
          const group = node.getContainer();
          const shape = group.get('children')[0];
          const label = group.get('children')[1];
          
          if (shape) {
            shape.attr({
              ...cfg.style
            });
          }
          
          if (label && cfg.label) {
            label.attr({
              text: cfg.label
            });
          }
        }
      });

      // 高性能边渲染器
      G6.registerEdge('performance-edge', {
        draw(cfg, group) {
          const startPoint = cfg.startPoint;
          const endPoint = cfg.endPoint;

          const shape = group.addShape('path', {
            attrs: {
              path: this.getPath(cfg),
              stroke: cfg.style.stroke || '#e2e2e2',
              lineWidth: cfg.style.lineWidth || 1,
              endArrow: cfg.style.endArrow || true
            },
            name: 'path-shape'
          });

          return shape;
        },

        getPath(cfg) {
          const start = cfg.startPoint;
          const end = cfg.endPoint;
          return [
            ['M', start.x, start.y],
            ['L', end.x, end.y]
          ];
        }
      });
    },

    // WebGL 渲染支持
    enableWebGLRenderer() {
      try {
        // 检查是支持 WebGL
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        const isWebGLSupported = !!gl;

        if (isWebGLSupported && graph.get('renderer')) {
          const renderer = graph.get('renderer');
          renderer.configure({
            enableBloom: true,
            enableSSAO: true,
            antialias: true
          });
        }
      } catch (error) {
        console.warn('WebGL 渲染器初始化失败:', error);
      }
    }
  };

  // 内存管理器
  const MemoryManager = {
    // 定期清理未使用的资源
    startMemoryCleanup() {
      setInterval(() => {
        this.cleanupUnusedResources();
      }, 60000); // 每执行一次
    },

    // 清理未使用的资源
    cleanupUnusedResources() {
      const nodes = graph.getNodes();
      const edges = graph.getEdges();
      
      // 清理节点缓存
      nodes.forEach(node => {
        if (!node.isVisible()) {
          node.get('group').get('children').forEach(child => {
            if (child.get('type') === 'image') {
              child.get('image').src = '';
            }
          });
        }
      });

      // 强制垃圾回收
      if (window.gc) {
        window.gc();
      }
    },

    // 监控内存使用
    monitorMemoryUsage() {
      if (window.performance && window.performance.memory) {
        setInterval(() => {
          const memory = window.performance.memory;
          console.log('Memory Usage:', {
            total: memory.totalJSHeapSize / 1048576 + 'MB',
            used: memory.usedJSHeapSize / 1048576 + 'MB',
            limit: memory.jsHeapSizeLimit / 1048576 + 'MB'
          });
        }, 10000);
      }
    }
  };

  // 事件处理优化
  const EventOptimizer = {
    // 事件节流
    throttleEvents() {
      const throttle = (fn, delay) => {
        let last = 0;
        return (...args) => {
          const now = Date.now();
          if (now - last > delay) {
            fn.apply(this, args);
            last = now;
          }
        };
      };

      // 优化拖拽事件
      graph.on('node:dragstart', throttle((e) => {
        this.handleDragStart(e);
      }, 16));

      graph.on('node:drag', throttle((e) => {
        this.handleDrag(e);
      }, 16));
    },

    // 优化事件委托
    setupEventDelegation() {
      const container = document.getElementById('container');
      
      container.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('.node')) {
          this.handleNodeClick(target);
        } else if (target.matches('.edge')) {
          this.handleEdgeClick(target);
        }
      }, { passive: true });
    },

    // 在 EventOptimizer 对象中添加以下方法
    handleDragStart(e) {
      const node = e.item;
      const model = node.getModel();
      
      // 记录初始位置
      this.dragStartPosition = {
        x: model.x,
        y: model.y
      };

      // 高亮被拖拽的节点
      graph.setItemState(node, 'dragging', true);
      
      // 高亮相关边
      graph.getEdges().forEach(edge => {
        if (edge.getSource() === node || edge.getTarget() === node) {
          graph.setItemState(edge, 'dragging', true);
        }
      });
    },

    handleDrag(e) {
      const node = e.item;
      const model = node.getModel();
      
      // 更新相关边的位置
      graph.getEdges().forEach(edge => {
        if (edge.getSource() === node || edge.getTarget() === node) {
          graph.refreshItem(edge);
        }
      });

      // 触发自定义事件
      graph.emit('node:dragging', {
        item: node,
        dx: model.x - this.dragStartPosition.x,
        dy: model.y - this.dragStartPosition.y
      });
    },

    handleNodeClick(target) {
      const nodeId = target.getAttribute('data-node-id');
      const node = graph.findById(nodeId);
      
      if (node) {
        // 切换选中状态
        const selected = node.hasState('selected');
        if (selected) {
          graph.setItemState(node, 'selected', false);
        } else {
          // 如果不是多选模式，先清除其他节点的选中状态
          if (!this.isMultiSelect) {
            graph.getNodes().forEach(n => {
              graph.setItemState(n, 'selected', false);
            });
          }
          graph.setItemState(node, 'selected', true);
        }

        // 更新信息面板
        this.updateNodeInfoPanel(node);
      }
    },

    handleEdgeClick(target) {
      const edgeId = target.getAttribute('data-edge-id');
      const edge = graph.findById(edgeId);
      
      if (edge) {
        // 切换选中状态
        const selected = edge.hasState('selected');
        graph.setItemState(edge, 'selected', !selected);

        // 更新信息面板
        this.updateEdgeInfoPanel(edge);
      }
    },

    // 更新节点信息面板
    updateNodeInfoPanel(node) {
      const model = node.getModel();
      const infoPanel = document.createElement('div');
      infoPanel.className = 'node-info-panel';
      infoPanel.innerHTML = `
        <h3>节点信息</h3>
        <div>ID: ${model.id}</div>
        <div>类型: ${model.type}</div>
        <div>标签: ${model.label || '无'}</div>
        ${this.renderProperties(model.properties)}
      `;
      
      this.showInfoPanel(infoPanel);
    },

    // 更新边信息面板
    updateEdgeInfoPanel(edge) {
      const model = edge.getModel();
      const infoPanel = document.createElement('div');
      infoPanel.className = 'edge-info-panel';
      infoPanel.innerHTML = `
        <h3>边信息</h3>
        <div>从: ${model.source}</div>
        <div>到: ${model.target}</div>
        <div>类型: ${model.type || '默认'}</div>
        ${model.amount ? `<div>金额: ${model.amount}</div>` : ''}
        ${model.timestamp ? `<div>时间: ${new Date(model.timestamp).toLocaleString()}</div>` : ''}
        ${this.renderProperties(model.properties)}
      `;
      
      this.showInfoPanel(infoPanel);
    },

    // 渲染属信息
    renderProperties(properties) {
      if (!properties) return '';
      
      return `
        <div class="properties-section">
          <h4>属性</h4>
          ${Object.entries(properties).map(([key, value]) => `
            <div class="property-item">
              <span class="property-key">${key}:</span>
              <span class="property-value">${value}</span>
            </div>
          `).join('')}
        </div>
      `;
    },

    // 显示信息面板
    showInfoPanel(panel) {
      const container = document.querySelector('.info-panel-container') || 
                       document.createElement('div');
      container.className = 'info-panel-container';
      container.innerHTML = '';
      container.appendChild(panel);
      
      if (!container.parentElement) {
        document.body.appendChild(container);
      }
    }
  };

  // 简化初始化优化函数
  function initializeOptimizations() {
    // 注册自定义渲染器
    GraphRenderer.registerCustomRenderers();
    
    // 启动内存管理
    MemoryManager.startMemoryCleanup();
    MemoryManager.monitorMemoryUsage();
    
    // 优化事件处���
    EventOptimizer.throttleEvents();
    EventOptimizer.setupEventDelegation();
  }

  // 在图实例创建后调用优化初始化
  document.addEventListener('DOMContentLoaded', function() {
    initializeOptimizations();
  });

  // 历史记录管理模块
  const HistoryManager = {
    history: [],
    currentIndex: -1,
    maxHistory: 50,

    // 记录操作
    recordOperation(operation) {
      // 移除当前位置之后的历史记录
      this.history = this.history.slice(0, this.currentIndex + 1);
      
      // 添加新的操作记录
      this.history.push({
        type: operation.type,
        data: operation.data,
        timestamp: Date.now(),
        graphState: graph.save()
      });

      // 限制历史记录数量
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }

      this.currentIndex = this.history.length - 1;
      this.updateUI();
    },

    // 撤销操作
    undo() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        const state = this.history[this.currentIndex];
        graph.changeData(state.graphState);
        this.updateUI();
      }
    },

    // 重做操作
    redo() {
      if (this.currentIndex < this.history.length - 1) {
        this.currentIndex++;
        const state = this.history[this.currentIndex];
        graph.changeData(state.graphState);
        this.updateUI();
      }
    },

    // 更新UI状态
    updateUI() {
      const undoButton = document.getElementById('undoButton');
      const redoButton = document.getElementById('redoButton');
      
      if (undoButton && redoButton) {
        undoButton.disabled = this.currentIndex <= 0;
        redoButton.disabled = this.currentIndex >= this.history.length - 1;
      }

      this.updateHistoryPanel();
    },

    // 更新历史面板
    updateHistoryPanel() {
      const panel = document.getElementById('historyPanel');
      if (!panel) return;

      panel.innerHTML = this.history.map((record, index) => `
        <div class="history-item ${index === this.currentIndex ? 'current' : ''}"
             onclick="HistoryManager.jumpToState(${index})">
          <div class="history-time">
            ${new Date(record.timestamp).toLocaleTimeString()}
          </div>
          <div class="history-type">${record.type}</div>
        </div>
      `).join('');
    },

    // 跳转到指定状态
    jumpToState(index) {
      if (index >= 0 && index < this.history.length) {
        this.currentIndex = index;
        const state = this.history[index];
        graph.changeData(state.graphState);
        this.updateUI();
      }
    },

    // 清除历史记录
    clearHistory() {
      this.history = [];
      this.currentIndex = -1;
      this.updateUI();
    }
  };

  // 绑定到全局
  window.undo = () => HistoryManager.undo();
  window.redo = () => HistoryManager.redo();

  // 数据优管理器
  const DataOptimizer = {
    // 压缩图数据
    compressGraphData(data) {
      // 使用 LZ-string 压缩
      const jsonStr = JSON.stringify(data);
      return LZString.compressToUTF16(jsonStr);
    },

    // 解压图数据
    decompressGraphData(compressed) {
      const jsonStr = LZString.decompressFromUTF16(compressed);
      return JSON.parse(jsonStr);
    },

    // 优化数据结构
    optimizeDataStructure(data) {
      // 创建索引
      const nodeIndex = new Map();
      data.nodes.forEach(node => nodeIndex.set(node.id, node));

      // 优化边的引用
      data.edges.forEach(edge => {
        edge.sourceNode = nodeIndex.get(edge.source);
        edge.targetNode = nodeIndex.get(edge.target);
      });

      return {
        ...data,
        nodeIndex,
        optimized: true
      };
    },

    // 数分块加载
    createDataChunks(data, chunkSize = 1000) {
      const chunks = [];
      for (let i = 0; i < data.nodes.length; i += chunkSize) {
        chunks.push({
          nodes: data.nodes.slice(i, i + chunkSize),
          edges: data.edges.filter(edge => {
            const sourceIndex = Math.floor(edge.source / chunkSize);
            const targetIndex = Math.floor(edge.target / chunkSize);
            return sourceIndex === i / chunkSize || targetIndex === i / chunkSize;
          })
        });
      }
      return chunks;
    },

    // 清理无用数据
    cleanupData(data) {
      // 移除孤立节点
      const connectedNodes = new Set();
      data.edges.forEach(edge => {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      });

      return {
        nodes: data.nodes.filter(node => connectedNodes.has(node.id)),
        edges: data.edges
      };
    }
  };

  // 绑定到全局
  window.optimizeData = () => {
    const data = graph.save();
    const optimized = DataOptimizer.optimizeDataStructure(data);
    graph.changeData(optimized);
  };

  // 数据导入导出管理器
  const DataIOManager = {
    // 导入数据
    async importData(file) {
      try {
        const data = await this.readFile(file);
        const format = this.detectFileFormat(file);
        const processedData = await this.processImportedData(data, format);
        return processedData;
      } catch (error) {
        console.error('数据导入错误:', error);
        throw error;
      }
    },

    // 读取文件
    readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = this.parseFileContent(e.target.result, file.type);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    },

    // 解析文件内容
    parseFileContent(content, fileType) {
      switch (fileType) {
        case 'application/json':
          return JSON.parse(content);
        case 'text/csv':
          return this.parseCSV(content);
        case 'text/xml':
          return this.parseXML(content);
        default:
          throw new Error('不支持的文件格式');
      }
    },

    // 解析CSV
    parseCSV(content) {
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const data = {
        nodes: [],
        edges: []
      };

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        if (row.type === 'node') {
          data.nodes.push(row);
        } else if (row.type === 'edge') {
          data.edges.push(row);
        }
      }

      return data;
    },

    // 解析XML
    parseXML(content) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      const data = {
        nodes: [],
        edges: []
      };

      // 解析节点
      const nodes = xmlDoc.getElementsByTagName('node');
      Array.from(nodes).forEach(node => {
        data.nodes.push({
          id: node.getAttribute('id'),
          type: node.getAttribute('type'),
          label: node.getAttribute('label')
        });
      });

      // 解析边
      const edges = xmlDoc.getElementsByTagName('edge');
      Array.from(edges).forEach(edge => {
        data.edges.push({
          source: edge.getAttribute('source'),
          target: edge.getAttribute('target'),
          type: edge.getAttribute('type')
        });
      });

      return data;
    },

    // 检测文件格式
    detectFileFormat(file) {
      const extension = file.name.split('.').pop().toLowerCase();
      const formats = {
        json: 'application/json',
        csv: 'text/csv',
        xml: 'text/xml'
      };
      return formats[extension] || file.type;
    },

    // 处理导入的数据
    async processImportedData(data, format) {
      // 数据验证
      this.validateData(data);

      // 数据换
      const processedData = this.transformData(data);

      // 数据清洗
      const cleanedData = this.cleanData(processedData);

      return cleanedData;
    },

    // 数据验证
    validateData(data) {
      if (!data.nodes || !Array.isArray(data.nodes)) {
        throw new Error('无效的节点数据');
      }
      if (!data.edges || !Array.isArray(data.edges)) {
        throw new Error('无效的边数据');
      }

      // 验证节点
      data.nodes.forEach(node => {
        if (!node.id) {
          throw new Error('节点缺少ID');
        }
      });

      // 验证边
      data.edges.forEach(edge => {
        if (!edge.source || !edge.target) {
          throw new Error('边缺少源节点或目标节点');
        }
      });
    },

    // 数据转换
    transformData(data) {
      return {
        nodes: data.nodes.map(node => ({
          ...node,
          id: String(node.id),
          type: node.type || 'default',
          label: node.label || node.id
        })),
        edges: data.edges.map(edge => ({
          ...edge,
          source: String(edge.source),
          target: String(edge.target),
          type: edge.type || 'default'
        }))
      };
    },

    // 数据清洗
    cleanData(data) {
      // 移除重复节点
      const uniqueNodes = new Map();
      data.nodes.forEach(node => {
        if (!uniqueNodes.has(node.id)) {
          uniqueNodes.set(node.id, node);
        }
      });

      // 移除无效边
      const validEdges = data.edges.filter(edge => {
        return uniqueNodes.has(edge.source) && uniqueNodes.has(edge.target);
      });

      return {
        nodes: Array.from(uniqueNodes.values()),
        edges: validEdges
      };
    },

    // 导出数据
    async exportData(format = 'json') {
      const data = graph.save();
      let content, filename, mimeType;

      switch (format) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          filename = `graph-export-${Date.now()}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          content = this.convertToCSV(data);
          filename = `graph-export-${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'xml':
          content = this.convertToXML(data);
          filename = `graph-export-${Date.now()}.xml`;
          mimeType = 'text/xml';
          break;
        default:
          throw new Error('不支持的导出格式');
      }

      this.downloadFile(content, filename, mimeType);
    },

    // 转换CSV
    convertToCSV(data) {
      // 节点CSV
      const nodeHeaders = ['id', 'type', 'label'];
      const nodeRows = data.nodes.map(node => 
        nodeHeaders.map(header => node[header] || '').join(',')
      );
      const nodesCSV = [
        'type,id,type,label',
        ...nodeRows.map(row => `node,${row}`)
      ].join('\n');

      // 边CSV
      const edgeHeaders = ['source', 'target', 'type'];
      const edgeRows = data.edges.map(edge =>
        edgeHeaders.map(header => edge[header] || '').join(',')
      );
      const edgesCSV = [
        ...edgeRows.map(row => `edge,${row}`)
      ].join('\n');

      return `${nodesCSV}\n${edgesCSV}`;
    },

    // 转换为XML
    convertToXML(data) {
      const xml = ['<?xml version="1.0" encoding="UTF-8"?>'];
      xml.push('<graph>');
      
      // 节点XML
      xml.push('  <nodes>');
      data.nodes.forEach(node => {
        xml.push(`    <node id="${node.id}" type="${node.type}" label="${node.label || ''}" />`);
      });
      xml.push('  </nodes>');

      // 边XML
      xml.push('  <edges>');
      data.edges.forEach(edge => {
        xml.push(`    <edge source="${edge.source}" target="${edge.target}" type="${edge.type || ''}" />`);
      });

      xml.push('</graph>');
      return xml.join('\n');
    },

    // 下载文件
    downloadFile(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // 绑定到全局
  window.importData = (file) => DataIOManager.importData(file);
  window.exportData = (format) => DataIOManager.exportData(format);

  // 异常测可视化模块
  const AnomalyVisualization = {
    // 更新异常检测面板
    updateAnomalyPanel(anomalies) {
      const anomalyList = document.getElementById('anomalyList');
      anomalyList.innerHTML = anomalies.map(anomaly => `
        <div class="anomaly-item ${anomaly.type}">
          <div class="anomaly-header">
            <span class="anomaly-type">${this.getAnomalyTypeLabel(anomaly.type)}</span>
            <span class="anomaly-severity ${this.getSeverityClass(anomaly.severity)}">
              风险等级: ${this.formatSeverity(anomaly.severity)}
            </span>
          </div>
          <div class="anomaly-description">${anomaly.description}</div>
          <div class="anomaly-details">
            ${this.renderAnomalyDetails(anomaly)}
          </div>
          <div class="anomaly-actions">
            <button onclick="AnomalyVisualization.highlightAnomaly('${anomaly.id}')">
              查看详情
            </button>
            <button onclick="AnomalyVisualization.addToEvidence('${anomaly.id}')">
              添加到证据
            </button>
          </div>
        </div>
      `).join('');
    },

    // 获取异常类型标签
    getAnomalyTypeLabel(type) {
      const labels = {
        'cycle': '循环交易',
        'rapid': '快速连续交易',
        'amount': '异常金额',
        'pattern': '异常模式'
      };
      return labels[type] || type;
    },

    // 获取严重程度样式类
    getSeverityClass(severity) {
      if (severity >= 0.8) return 'critical';
      if (severity >= 0.5) return 'high';
      if (severity >= 0.3) return 'medium';
      return 'low';
    },

    // 格式化严重程度
    formatSeverity(severity) {
      return `${Math.round(severity * 100)}%`;
    },

    // 渲染异常详情
    renderAnomalyDetails(anomaly) {
      switch (anomaly.type) {
        case 'cycle':
          return this.renderCycleDetails(anomaly.paths);
        case 'rapid':
          return this.renderRapidTransactionDetails(anomaly.transactions);
        case 'amount':
          return this.renderAmountDetails(anomaly);
        default:
          return '';
      }
    },

    // 渲染循环交易情
    renderCycleDetails(anomaly) {
      return `
        <div class="cycle-details">
          <div>循环长度: ${anomaly.path.length}</div>
          <div>与户: ${anomaly.path.length}</div>
          <div>总交易金额: ${this.formatAmount(anomaly.totalAmount)}</div>
          <div class="cycle-path">
            ${anomaly.path.map(nodeId => this.getNodeLabel(nodeId)).join(' → ')}
          </div>
        </div>
      `;
    },

    // 渲染快速交易详情
    renderRapidTransactionDetails(anomaly) {
      return `
        <div class="rapid-details">
          <div>交易次数: ${anomaly.transactions.length}</div>
          <div>时间跨度: ${this.formatDuration(anomaly.timeSpan)}</div>
          <div>平均间隔: ${this.formatDuration(anomaly.avgInterval)}</div>
          <div>总交易金额: ${this.formatAmount(anomaly.totalAmount)}</div>
        </div>
      `;
    },

    // 渲染异常金额详情
    renderAmountDetails(anomaly) {
      return `
        <div class="amount-details">
          <div>交易金额: ${this.formatAmount(anomaly.amount)}</div>
          <div>超出平均值: ${this.formatPercentage(anomaly.deviation)}</div>
          <div>发生时间: ${new Date(anomaly.timestamp).toLocaleString()}</div>
        </div>
      `;
    },

    // 高亮显示异常
    highlightAnomaly(anomalyId) {
      // 清除现有高亮
      graph.getNodes().forEach(node => graph.clearItemStates(node));
      graph.getEdges().forEach(edge => graph.clearItemStates(edge));

      const anomaly = this.findAnomaly(anomalyId);
      if (!anomaly) return;

      // 根据异常类型进行高亮
      switch (anomaly.type) {
        case 'cycle':
          this.highlightCycle(anomaly);
          break;
        case 'rapid':
          this.highlightRapidTransactions(anomaly);
          break;
        case 'amount':
          this.highlightAbnormalAmount(anomaly);
          break;
      }
    },

    // 格式化工具方
    formatAmount(amount) {
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY'
      }).format(amount);
    },

    formatDuration(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      return hours > 0 ? 
        `${hours}小时${minutes % 60}分钟` : 
        `${minutes}分钟${seconds % 60}秒`;
    },

    formatPercentage(value) {
      return `${(value * 100).toFixed(2)}%`;
    },

    getNodeLabel(nodeId) {
      const node = graph.findById(nodeId);
      return node ? (node.getModel().label || nodeId) : nodeId;
    }
  };

  // 绑定到全局
  window.AnomalyVisualization = AnomalyVisualization;

  // WebGL渲染器配置模块
  const WebGLRenderer = {
    // 初始化WebGL渲染器
    initialize() {
      // 仅检查 WebGL 支持，不进行配置
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
      } catch (error) {
        console.warn('WebGL 不受支持:', error);
        return false;
      }
    },

    // 顶点着色器
    getVertexShader() {
      return `
        attribute vec2 a_position;
        attribute vec2 a_uv;
        attribute vec4 a_color;
        
        uniform mat4 u_matrix;
        uniform float u_size;
        
        varying vec2 v_uv;
        varying vec4 v_color;
        
        void main() {
          gl_Position = u_matrix * vec4(a_position * u_size, 0.0, 1.0);
          v_uv = a_uv;
          v_color = a_color;
        }
      `;
    },

    // 片段着色器
    getFragmentShader() {
      return `
        precision mediump float;
        
        varying vec2 v_uv;
        varying vec4 v_color;
        
        uniform sampler2D u_texture;
        uniform float u_opacity;
        
        void main() {
          vec4 color = texture2D(u_texture, v_uv) * v_color;
          gl_FragColor = vec4(color.rgb, color.a * u_opacity);
        }
      `;
    },

    // 更新渲染配置
    updateConfig(config) {
      const renderer = graph.get('renderer');
      if (renderer.isWebGL) {
        renderer.updateConfig({
          effects: {
            bloom: {
              enabled: config.enableBloom,
              intensity: config.bloomIntensity
            },
            ssao: {
              enabled: config.enableSSAO,
              intensity: config.ssaoIntensity
            }
          },
          performance: {
            batchSize: config.batchSize,
            enableInstancing: config.enableInstancing
          }
        });
      }
    }
  };

  // 在图实例创建时初始化WebGL渲染器
  const renderer = WebGLRenderer.initialize();
  if (renderer) {
    console.log('WebGL 支持已检测');
    // 不再尝试设置 renderer
  }

  // 图表可视化模块
  const ChartVisualization = {
    // 初始化图表
    initialize() {
      this.setupChartContainers();
      this.initializeCharts();
    },

    // 设图表容器
    setupChartContainers() {
      const container = document.createElement('div');
      container.className = 'charts-container';
      container.innerHTML = `
        <div class="chart-panel">
          <div id="timeDistributionChart" class="chart"></div>
          <div id="amountDistributionChart" class="chart"></div>
          <div id="networkTopologyChart" class="chart"></div>
          <div id="riskDistributionChart" class="chart"></div>
        </div>
      `;
      document.querySelector('.left-panel').appendChild(container);
    },

    // 初始化所有图表
    initializeCharts() {
      this.timeDistributionChart = this.createTimeDistributionChart();
      this.amountDistributionChart = this.createAmountDistributionChart();
      this.networkTopologyChart = this.createNetworkTopologyChart();
      this.riskDistributionChart = this.createRiskDistributionChart();
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

    // 更新时间分布图
    updateTimeDistribution(data) {
      const timeData = this.processTimeData(data);
      this.timeDistributionChart.data(timeData);
      this.timeDistributionChart.interval()
        .position('hour*count')
        .color('count', '#1890ff-#69c0ff')
        .label('count');
      this.timeDistributionChart.render();
    },

    // 更新金额分布图表
    updateAmountDistribution(data) {
      const amountData = this.processAmountData(data);
      this.amountDistributionChart.data(amountData);
      this.amountDistributionChart.interval()
        .position('range*count')
        .color('count', '#1890ff-#69c0ff')
        .label('count');
      this.amountDistributionChart.render();
    },

    // 更新网络拓扑图表
    updateNetworkTopology(data) {
      const topologyData = this.processTopologyData(data);
      this.networkTopologyChart.data(topologyData);
      this.networkTopologyChart.point()
        .position('x*y')
        .color('type')
        .shape('circle')
        .size('degree');
      this.networkTopologyChart.render();
    },

    // 更新风险分布图表
    updateRiskDistribution(data) {
      const riskData = this.processRiskData(data);
      this.riskDistributionChart.data(riskData);
      this.riskDistributionChart.interval()
        .position('risk*count')
        .color('risk', ['#52c41a', '#faad14', '#f5222d'])
        .label('count');
      this.riskDistributionChart.render();
    },

    // 处理时间数据
    processTimeData(data) {
      // 实现��间数据处理逻辑
    },

    // 处理金额数据
    processAmountData(data) {
      // 实现金额数据处理逻辑
    },

    // 处理拓扑数据
    processTopologyData(data) {
      // 实现扑数据处理逻辑
    },

    // 处理风险数据
    processRiskData(data) {
      // 实现风险数据处理逻辑
    }
  };

  // 初始化图表可视化
  ChartVisualization.initialize();

  // 国际化支持模块
  const I18nManager = {
    currentLocale: 'zh-CN',
    translations: {
      'zh-CN': {
        // 通用
        'common.loading': '加载中...',
        'common.confirm': '确认',
        'common.cancel': '取消',
        'common.save': '保存',
        'common.delete': '删除',
        'common.export': '导出',
        'common.import': '导入',
        'common.search': '搜索',
        'common.filter': '筛选',
        'common.view': '查看',
        'common.edit': '编辑',
        'common.add': '添加',

        // 面板标题
        'panel.info': '图表信息',
        'panel.control': '操作面板',
        'panel.analysis': '分析结果',
        'panel.evidence': '取证工具',
        'panel.anomaly': '异常检测',

        // 节点类型
        'node.account': '账户',
        'node.merchant': '商户',
        'node.transaction': '交',

        // 算法
        'algorithm.centrality': '中心度分析',
        'algorithm.community': '社区检测',
        'algorithm.path': '路径分析',
        'algorithm.cycle': '环路检测',

        // 异常类型
        'anomaly.cycle': '循环交易',
        'anomaly.rapid': '快速连续交易',
        'anomaly.amount': '异常金额',
        'anomaly.pattern': '异常模式',

        // 风险等级
        'risk.high': '高风险',
        'risk.medium': '中风险',
        'risk.low': '低风险'
      },
      'en-US': {
        // Common
        'common.loading': 'Loading...',
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.delete': 'Delete',
        'common.export': 'Export',
        'common.import': 'Import',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.view': 'View',
        'common.edit': 'Edit',
        'common.add': 'Add',

        // Panel Titles
        'panel.info': 'Graph Information',
        'panel.control': 'Control Panel',
        'panel.analysis': 'Analysis Results',
        'panel.evidence': 'Forensics Tools',
        'panel.anomaly': 'Anomaly Detection',

        // Node Types
        'node.account': 'Account',
        'node.merchant': 'Merchant',
        'node.transaction': 'Transaction',

        // Algorithms
        'algorithm.centrality': 'Centrality Analysis',
        'algorithm.community': 'Community Detection',
        'algorithm.path': 'Path Analysis',
        'algorithm.cycle': 'Cycle Detection',

        // Anomaly Types
        'anomaly.cycle': 'Cyclic Transaction',
        'anomaly.rapid': 'Rapid Consecutive Transaction',
        'anomaly.amount': 'Abnormal Amount',
        'anomaly.pattern': 'Unusual Pattern',

        // Risk Levels
        'risk.high': 'High Risk',
        'risk.medium': 'Medium Risk',
        'risk.low': 'Low Risk'
      }
    },

    // 切换语言
    setLocale(locale) {
      if (this.translations[locale]) {
        this.currentLocale = locale;
        this.updateUI();
        localStorage.setItem('preferredLocale', locale);
      }
    },

    // 获取翻译文本
    t(key, params = {}) {
      const text = this.translations[this.currentLocale][key] || key;
      return text.replace(/\{(\w+)\}/g, (_, param) => params[param] || '');
    },

    // 更新UI文本
    updateUI() {
      // 更新所有带有 data-i18n 属性的元素
      document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = this.t(key);
      });

      // 更新按钮文本
      document.querySelectorAll('button[data-i18n]').forEach(button => {
        const key = button.getAttribute('data-i18n');
        button.textContent = this.t(key);
      });

      // 更新选项文本
      document.querySelectorAll('select[data-i18n] option').forEach(option => {
        const key = option.getAttribute('data-i18n');
        if (key) {
          option.textContent = this.t(key);
        }
      });

      // 更新面板标题
      document.querySelectorAll('.panel-title[data-i18n]').forEach(title => {
        const key = title.getAttribute('data-i18n');
        title.textContent = this.t(key);
      });
    },

    // 初始化国际化支持
    initialize() {
      // 从本地存储获取首选语言
      const preferredLocale = localStorage.getItem('preferredLocale');
      if (preferredLocale && this.translations[preferredLocale]) {
        this.currentLocale = preferredLocale;
      } else {
        // 根据浏览器语言设置默认语言
        const browserLocale = navigator.language;
        this.currentLocale = this.translations[browserLocale] ? browserLocale : 'en-US';
      }

      // 添加语言切控件
      this.addLanguageSelector();
      // 初始更新UI
      this.updateUI();
    },

    // 添加语言选择器
    addLanguageSelector() {
      const selector = document.createElement('select');
      selector.className = 'language-selector';
      selector.title = '选择语言';  // 添加 title
      selector.setAttribute('aria-label', '选择语言');  // 添加 aria-label
      selector.innerHTML = `
        <option value="zh-CN">中文</option>
        <option value="en-US">English</option>
      `;
      selector.value = this.currentLocale;
      selector.addEventListener('change', (e) => {
        this.setLocale(e.target.value);
      });

      // 添加到控制面板
      const controlPanel = document.querySelector('.right-panel');
      if (controlPanel) {
      controlPanel.insertBefore(selector, controlPanel.firstChild);
      }
    }
  };

  // 初始化国际化支持
  I18nManager.initialize();

  // 证据链导出模块
  const EvidenceExporter = {
    // 导出证据链报告
    exportEvidenceChain() {
      const evidence = {
        metadata: this.generateMetadata(),
        timeline: this.generateTimeline(),
        evidence: this.collectEvidence(),
        analysis: this.generateAnalysis(),
        visualizations: this.captureVisualizations()
      };

      // 根据选择的格导出
      const format = document.getElementById('exportFormat').value;
      switch (format) {
        case 'pdf':
          this.exportToPDF(evidence);
          break;
        case 'html':
          this.exportToHTML(evidence);
          break;
        case 'word':
          this.exportToWord(evidence);
          break;
        default:
          this.exportToJSON(evidence);
      }
    },

    // 生成元数据
    generateMetadata() {
      return {
        caseId: `CASE-${Date.now()}`,
        investigator: localStorage.getItem('investigatorName') || 'Unknown',
        timestamp: new Date().toISOString(),
        toolVersion: '1.0.0',
        graphInfo: {
          nodeCount: graph.getNodes().length,
          edgeCount: graph.getEdges().length,
          dataSource: 'Transaction Database'
        }
      };
    },

    // 生成时间线
    generateTimeline() {
      const events = [];

      // 收集所有标记和注释
      ForensicsTools.evidence.markers.forEach(marker => {
        events.push({
          type: 'marker',
          timestamp: marker.timestamp,
          description: marker.label,
          relatedNodes: marker.nodes
        });
      });

      ForensicsTools.evidence.comments.forEach(comment => {
        events.push({
          type: 'comment',
          timestamp: comment.timestamp,
          description: comment.content,
          relatedElements: comment.elements
        });
      });

      // 收集异常检测结果
      const anomalies = AnomalyDetection.detectAnomalies();
      anomalies.forEach(anomaly => {
        events.push({
          type: 'anomaly',
          timestamp: anomaly.timestamp,
          description: anomaly.description,
          severity: anomaly.severity,
          details: anomaly.details
        });
      });

      // 按时间排序
      return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    // 收集证
    collectEvidence() {
      return {
        markers: ForensicsTools.evidence.markers,
        comments: ForensicsTools.evidence.comments,
        screenshots: ForensicsTools.evidence.screenshots,
        relatedNodes: this.collectRelatedNodes(),
        transactions: this.collectRelatedTransactions()
      };
    },

    // 收集相关节点
    collectRelatedNodes() {
      const nodes = new Set();
      
      // 收集标记的节点
      ForensicsTools.evidence.markers.forEach(marker => {
        marker.nodes.forEach(node => nodes.add(node));
      });

      // 收集注释相关的节点
      ForensicsTools.evidence.comments.forEach(comment => {
        comment.elements.nodes.forEach(node => nodes.add(node));
      });

      return Array.from(nodes).map(nodeId => {
        const node = graph.findById(nodeId);
        return node ? node.getModel() : null;
      }).filter(Boolean);
    },

    // 收集相关交易
    collectRelatedTransactions() {
      const transactions = new Set();
      const relatedNodes = this.collectRelatedNodes();
      const nodeIds = new Set(relatedNodes.map(node => node.id));

      graph.getEdges().forEach(edge => {
        const model = edge.getModel();
        if (nodeIds.has(model.source) || nodeIds.has(model.target)) {
          transactions.add(model);
        }
      });

      return Array.from(transactions);
    },

    // 生成分析报告
    generateAnalysis() {
      return {
        centrality: GraphAlgorithms.calculateCentrality(graph),
        communities: GraphAlgorithms.detectCommunities(graph),
        paths: GraphAlgorithms.analyzePaths(graph),
        cycles: GraphAlgorithms.detectCycles(graph),
        riskAssessment: this.generateRiskAssessment()
      };
    },

    // 生成风险评估
    generateRiskAssessment() {
      const data = graph.save();
      return {
        overallRisk: this.calculateOverallRisk(data),
        anomalyStats: this.calculateAnomalyStatistics(data),
        recommendations: this.generateRecommendations(data)
      };
    },

    // 捕获可化内容
    captureVisualizations() {
      return {
        graphSnapshot: this.captureGraphImage(),
        charts: this.captureCharts(),
        timeline: this.captureTimeline()
      };
    },

    // 导出为PDF
    async exportToPDF(evidence) {
      const doc = new jsPDF();
      
      // 添加封面
      doc.setFontSize(20);
      doc.text('诈骗分析调查报告', 20, 20);
      
      // 添加元数
      doc.setFontSize(12);
      doc.text(`案件编号: ${evidence.metadata.caseId}`, 20, 40);
      doc.text(`调查人员: ${evidence.metadata.investigator}`, 20, 50);
      doc.text(`生成时间: ${new Date().toLocaleString()}`, 20, 60);
      
      // 添加时间线
      doc.addPage();
      doc.text('调查时间线', 20, 20);
      evidence.timeline.forEach((event, index) => {
        const y = 40 + index * 10;
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${new Date(event.timestamp).toLocaleString()}: ${event.description}`, 20, y);
      });
      
      // 添加证据截图
      evidence.visualizations.screenshots.forEach(screenshot => {
        doc.addPage();
        doc.addImage(screenshot, 'PNG', 20, 20, 170, 100);
      });
      
      // 保存PDF
      doc.save(`evidence-report-${Date.now()}.pdf`);
    },

    // 导出为HTML
    exportToHTML(evidence) {
      const template = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>诈骗分析调查报告</title>
            <style>
              ${this.getReportStyles()}
            </style>
          </head>
          <body>
            <div class="report-container">
              ${this.renderReportHeader(evidence.metadata)}
              ${this.renderTimeline(evidence.timeline)}
              ${this.renderEvidence(evidence.evidence)}
              ${this.renderAnalysis(evidence.analysis)}
              ${this.renderVisualizations(evidence.visualizations)}
            </div>
          </body>
        </html>
      `;

      const blob = new Blob([template], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-report-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // 获取报告样式
    getReportStyles() {
      return `
        .report-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        
        .timeline-event {
          margin: 10px 0;
          padding: 10px;
          border-left: 3px solid #1890ff;
          background: #f0f5ff;
        }
        
        .evidence-item {
          margin: 15px 0;
          padding: 15px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
        }
        
        .visualization {
          margin: 20px 0;
          text-align: center;
        }
        
        .analysis-section {
          margin: 20px 0;
          padding: 15px;
          background: #f8f8f8;
          border-radius: 4px;
        }
      `;
    }
  };

  // 绑定到全局
  window.exportEvidenceChain = () => EvidenceExporter.exportEvidenceChain();

  // 面板折叠控制
  function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const header = section.previousElementSibling;
    const parent = section.parentElement;
    
    // 切换显示状态
    section.classList.toggle('active');
    parent.classList.toggle('collapsed');
    
    // 保存状态到本地存储
    const sectionStates = JSON.parse(localStorage.getItem('sectionStates') || '{}');
    sectionStates[sectionId] = section.classList.contains('active');
    localStorage.setItem('sectionStates', JSON.stringify(sectionStates));
  }

  // 初始化面状态
  function initializePanelStates() {
    const sectionStates = JSON.parse(localStorage.getItem('sectionStates') || '{}');
    
    Object.entries(sectionStates).forEach(([sectionId, isActive]) => {
      const section = document.getElementById(sectionId);
      if (section) {
        if (isActive) {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
          section.parentElement.classList.add('collapsed');
        }
      }
    });
  }

  // 在页面加载时初始化面板状态
  document.addEventListener('DOMContentLoaded', initializePanelStates);

  // 初始化面板控制
  document.addEventListener('DOMContentLoaded', function() {
    // 使用事件委托处理所有面板的点击事件
    document.querySelector('.right-panel').addEventListener('click', function(e) {
        const header = e.target.closest('.section-header');
        if (header) {
            const sectionId = header.getAttribute('data-section');
            const content = document.getElementById(sectionId);
            if (content) {
                content.classList.toggle('collapsed');
                const icon = header.querySelector('.toggle-icon');
                if (icon) {
                    icon.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
                }
                
                // 保存状态到本地存储
                const sectionStates = JSON.parse(localStorage.getItem('sectionStates') || '{}');
                sectionStates[sectionId] = !content.classList.contains('collapsed');
                localStorage.setItem('sectionStates', JSON.stringify(sectionStates));
            }
        }
    });
  });

  // 在实例创建后添加
  graph.on('afterrender', () => {
    console.log('图渲染完成');
    console.log('节点数量:', graph.getNodes().length);
    console.log('边数量:', graph.getEdges().length);
  });



  // 在数据加载前显示
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">数据加载中...</div>
    </div>
  `;

  // 添加面板展开/折叠功能
  document.addEventListener('DOMContentLoaded', function() {
    // 为所有 section-header 添加点击事件
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', function() {
            // 获取对应的内容区域
            const sectionId = this.getAttribute('data-section');
            const content = document.getElementById(sectionId);
            
            // 切换内容区域的显示状态
            content.classList.toggle('collapsed');
            
            // 更新箭头图标
            const icon = this.querySelector('.toggle-icon');
            icon.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
        });
    });
  });

  // 简化事件监听
  graph.on('afterzoom', (e) => {
    const zoom = e.getZoom ? e.getZoom() : 1;
    graph.getNodes().forEach(node => {
      RenderOptimizer.adjustNodeDetail(node, zoom);
    });
  });

  // 在图例创建时添加样式 - 使用已经声明的 container 变量
  // 删除这行: const container = document.getElementById('container');
  if (container) {
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.minHeight = '500px';
    container.style.background = '#fff';
    container.style.position = 'relative';
  }

  // 修改面板初始化代码
  document.addEventListener('DOMContentLoaded', function() {
    // 为所有 section-header 添加点击事件
    document.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', function() {
        // 获取对应的内容区域
        const sectionId = this.getAttribute('data-section');
        const content = document.getElementById(sectionId);
        
        if (content) {
          // 切换内容区域的显示状态
          if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            this.querySelector('.toggle-icon').textContent = '▼';
          } else {
            content.classList.add('collapsed');
            this.querySelector('.toggle-icon').textContent = '▶';
          }
        }
      });
    });

    // 初始化面板状态 - 默认展开
    document.querySelectorAll('.section-content').forEach(content => {
      content.classList.remove('collapsed');
      const header = content.previousElementSibling;
      if (header) {
        const icon = header.querySelector('.toggle-icon');
        if (icon) {
          icon.textContent = '▼';
        }
      }
    });
  });

  // 修改 CSS 样式
  const style = document.createElement('style');
  style.textContent = `
    .section-content {
      overflow: hidden;
      transition: max-height 0.3s ease;
      max-height: 1000px; /* 设置一个足够大的值 */
    }

    .section-content.collapsed {
      max-height: 0;
      padding: 0;
      margin: 0;
    }

    .section-header {
      cursor: pointer;
      padding: 10px;
      background: #f5f5f5;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-header:hover {
      background: #e6f7ff;
    }

    .toggle-icon {
      transition: transform 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}); 