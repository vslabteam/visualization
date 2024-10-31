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

        return sortedNodes;
    },

    // 社区测 - 使用 G6 内置的 louvain 算法
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
        const data = {
            nodes: graph.save().nodes,
            edges: graph.save().edges
        };
        
        let totalLength = 0;
        let pathCount = 0;
        let maxLength = 0;
        let maxPath = null;

        // 使用 G6 内置的最短路径算法
        data.nodes.forEach((source, i) => {
            const shortestPaths = G6.Util.findShortestPath(data, source.id);
            
            data.nodes.forEach((target, j) => {
                if (i < j) {
                    const path = shortestPaths[target.id];
                    if (path && path.length > 0) {
                        const distance = path.length - 1;
                        totalLength += distance;
                        pathCount++;
                        
                        if (distance > maxLength) {
                            maxLength = distance;
                            maxPath = path;
                        }
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

    // 查找所有最短路径
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

        // 并簇
        if (mergePair) {
          const [i, j] = mergePair;
          const newCluster = {
            id: `cluster_${Date.now()}`,
            nodes: [...clusters[i].nodes, ...clusters[j].nodes],
            distance: minDistance
          };
          clusters.splice(j, 1);
          clusters.splice(i, 1, newCluster);
        }
      }

      return clusters;
    },

    // 计算距离矩阵
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

    // 子图挖掘
    mineSubgraphs(graph, minSize = 3, minDensity = 0.5) {
      const data = graph.save();
      const subgraphs = [];
      const visited = new Set();

      // 从每个未访问的节点开始扩展子图
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

    // 环路检测算法
    detectCycles(graph) {
      const data = graph.save();
      const cycles = [];
      const visited = new Set();
      const recursionStack = new Set();

      // 深度优先搜索检测环
      const dfs = (nodeId, path = []) => {
        if (recursionStack.has(nodeId)) {
          const cycleStart = path.indexOf(nodeId);
          if (cycleStart !== -1) {
            cycles.push({
              path: path.slice(cycleStart),
              type: this.analyzeCycleType(path.slice(cycleStart),
              risk: this.calculateCycleRisk(path.slice(cycleStart), data)
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

    // 分析环路类型
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

      // 基础分数：环路长度
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

      // 时间间隔越短，风险越高
      return Math.min(30, Math.round(30 * (1 - avgInterval / (24 * 60 * 60 * 1000))));
    },

    // 计算节点类型风险分数
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
      cycles.sort((a, b) => b.risk - a.risk);

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

    // 生成环路模式标识
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
          
          // 高亮相连边
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

  // 将runAlgorithm函数绑定到window对象
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
        <div class="menu-item" onclick="addToEvidence('${node.get('id')}')">添加到证据</div>
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

  // 添加框选功能
  const enableLasso = () => {
    const lasso = new G6.Lasso({
      selectedState: 'selected',
      onSelect: (nodes, edges) => {
        console.log('框选的节点:', nodes);
        console.log('框选的边:', edges);
      }
    });
    
    graph.addPlugin(lasso);
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

  // 在图实例创建后添加以下代码

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

  // 数据加载和渲染优化
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

    // 优化渲染性能
    const optimizeRendering = () => {
      // 使用 GPU 加速
      graph.get('canvas').set('enableCSSTransforms', true);
      
      // 节点数量大时禁用动画
      if (graph.getNodes().length > 1000) {
        graph.updateLayout({
          animate: false
        });
      }
      
      // 添加节点可见性判断
      graph.on('beforerender', () => {
        const nodes = graph.getNodes();
        const viewport = graph.getViewport();
        
        nodes.forEach(node => {
          const bbox = node.getBBox();
          const visible = viewport.intersects(bbox);
          node.set('visible', visible);
        });
      });
    };

    return {
      worker,
      optimizeRendering
    };
  };

  // 在图实例创建后初始化优化
  const { worker, optimizeRendering } = optimizeDataRendering();
  optimizeRendering();

  // 添加相关样式
  const style = document.createElement('style');
  style.textContent = `
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
  `;
  document.head.appendChild(style);

  // 在现有代码后添加新的功能模块

  // 异常检测模块
  const AnomalyDetection = {
    // 检测异常交易模式
    detectAnomalies() {
      const data = graph.save();
      const anomalies = [];

      // 循环模式检测
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

    // 检测循环交易
    detectCycles(data) {
      const cycles = [];
      const visited = new Set();
      const stack = new Set();

      const dfs = (nodeId, path = []) => {
        if (stack.has(nodeId)) {
          const cycleStart = path.indexOf(nodeId);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart));
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

      // 收集所有时间相关的事件
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

      // 按时间排序
      return timelineEvents.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    },

    // 收集证据
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
              <p>生成时间：${report.timestamp}</p>
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
              <div>时间跨度: ${t.timeSpan / 1000}秒</div>
            </div>
          `).join('')}
        </div>
      `;
    },

    // 渲染证据记录
    renderEvidence(evidence) {
      return `
        <div class="evidence-view">
          <div class="markers-section">
            <h3>标记记录 (${evidence.markers.length})</h3>
            ${this.renderMarkers(evidence.markers)}
          </div>
          <div class="comments-section">
            <h3>注释记录 (${evidence.comments.length})</h3>
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

    // 渲染中心度分析结果
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
          <div>平均社区规模: ${communityStats.avgSize.toFixed(2)}</div>
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

    // 渲染社区分布
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

    // 收集图统计信息
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
        title: '交易金额分布'
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

    // 计算图的密度
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

    // 计算边类型数量
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
    snapshots: [],

    // 保存当前视图状态
    saveSnapshot() {
      const snapshot = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        data: graph.save(),
        view: {
          zoom: graph.getZoom(),
          center: graph.getCenter()
        },
        filters: this.getCurrentFilters()
      };

      this.snapshots.push(snapshot);
      localStorage.setItem('graphSnapshots', JSON.stringify(this.snapshots));
      return snapshot.id;
    },

    // 加载快照
    loadSnapshot(snapshotId) {
      const snapshot = this.snapshots.find(s => s.id === snapshotId);
      if (snapshot) {
        graph.changeData(snapshot.data);
        graph.zoomTo(snapshot.view.zoom);
        graph.moveTo(snapshot.view.center.x, snapshot.view.center.y);
        this.applyFilters(snapshot.filters);
      }
    },

    // 获取当前过滤器状态
    getCurrentFilters() {
      return {
        timeRange: {
          start: document.getElementById('startDate').value,
          end: document.getElementById('endDate').value
        },
        amount: {
          min: document.getElementById('minAmount').value,
          max: document.getElementById('maxAmount').value
        },
        riskLevel: document.getElementById('riskLevel').value,
        nodeType: document.getElementById('nodeFilter').value,
        layout: document.getElementById('layoutSelect').value
      };
    },

    // 应用过滤器状态
    applyFilters(filters) {
      if (!filters) return;
      
      // 恢复过滤器UI状态
      document.getElementById('startDate').value = filters.timeRange.start;
      document.getElementById('endDate').value = filters.timeRange.end;
      document.getElementById('minAmount').value = filters.amount.min;
      document.getElementById('maxAmount').value = filters.amount.max;
      document.getElementById('riskLevel').value = filters.riskLevel;
      document.getElementById('nodeFilter').value = filters.nodeType;
      document.getElementById('layoutSelect').value = filters.layout;

      // 应用过滤器
      MultiDimensionalFilter.applyFilters();
    },

    // 显示快照列表
    showSnapshotList() {
      const snapshotListHtml = this.snapshots.map(snapshot => `
        <div class="snapshot-item">
          <div class="snapshot-time">${new Date(snapshot.timestamp).toLocaleString()}</div>
          <button onclick="SnapshotManager.loadSnapshot(${snapshot.id})">加载</button>
          <button onclick="SnapshotManager.deleteSnapshot(${snapshot.id})">删除</button>
        </div>
      `).join('');

      const dialog = document.createElement('div');
      dialog.className = 'snapshot-dialog';
      dialog.innerHTML = `
        <div class="snapshot-dialog-content">
          <h3>快照列表</h3>
          <div class="snapshot-list">${snapshotListHtml}</div>
          <button onclick="this.parentElement.parentElement.remove()">关闭</button>
        </div>
      `;
      document.body.appendChild(dialog);
    },

    // 删除快照
    deleteSnapshot(snapshotId) {
      this.snapshots = this.snapshots.filter(s => s.id !== snapshotId);
      localStorage.setItem('graphSnapshots', JSON.stringify(this.snapshots));
      this.showSnapshotList(); // 刷新快照列表
    }
  };

  // 多维度过滤器
  const MultiDimensionalFilter = {
    // 应用所有过滤条件
    applyFilters() {
      const filters = {
        timeRange: {
          start: document.getElementById('startDate').value,
          end: document.getElementById('endDate').value
        },
        amount: {
          min: document.getElementById('minAmount').value,
          max: document.getElementById('maxAmount').value
        },
        riskLevel: document.getElementById('riskLevel').value
      };

      // 发送到 Worker 进行过滤
      worker.postMessage({
        type: 'filterData',
        params: filters
      });
    },

    // 处理过滤后的数据
    handleFilteredData(filteredData) {
      graph.changeData(filteredData);
      graph.fitView();
    }
  };

  // 关系分析工具
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
      const groups = [];
      const visited = new Set();

      // 使用 DBSCAN 聚类算法的简化版本
      const expandCluster = (nodeId, neighbors, cluster) => {
        cluster.push(nodeId);
        visited.add(nodeId);

        neighbors.forEach(neighborId => {
          if (!visited.has(neighborId)) {
            const newNeighbors = this.findNeighbors(neighborId, graphData);
            if (newNeighbors.length >= this.minPts) {
              expandCluster(neighborId, newNeighbors, cluster);
            }
          }
        });
      };

      graphData.nodes.forEach(node => {
        if (!visited.has(node.id)) {
          const neighbors = this.findNeighbors(node.id, graphData);
          if (neighbors.length >= this.minClusterSize) {
            const cluster = [];
            expandCluster(node.id, neighbors, cluster);
            if (cluster.length >= this.minClusterSize) {
              groups.push(cluster);
            }
          }
        }
      });

      return groups;
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

      // 高亮路径
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
        
        if (path.length > 3) continue; // 限制路径长度
        
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

    // 分析周期性
    analyzePeriodicity(transactions) {
      // 简单的周期性检测
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

    // 定义常量
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

    // 显示路径信息
    showPathInfo(path, index) {
      const info = document.createElement('div');
      info.className = 'path-info';
      info.innerHTML = `
        <h3>路径 ${index + 1}</h3>
        <div>路径长度: ${path.length - 1} 步</div>
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
  window.loadSnapshot = () => SnapshotManager.loadSnapshot();
  window.applyFilters = () => MultiDimensionalFilter.applyFilters();
  window.findGroups = () => RelationshipAnalysis.findGroups();
  window.analyzeRelationPath = () => RelationshipAnalysis.analyzeRelationPath();

  // 取证工具模块
  const ForensicsTools = {
    evidence: {
      markers: [],
      comments: [],
      screenshots: [],
      nodes: []
    },

    // 高亮显示带有注释的元素
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

      // 清除现有高亮
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
    currentTimeIndex: 0,
    timeData: [],
    playInterval: null,

    // 初始化时间轴
    initialize(data) {
      // 提取时间信息
      this.timeData = data.edges
        .map(edge => new Date(edge.timestamp).getTime())
        .sort((a, b) => a - b);

      const timelineSlider = document.getElementById('timelineSlider');
      timelineSlider.max = this.timeData.length - 1;
      timelineSlider.value = 0;

      this.updateTimeDisplay(this.timeData[0]);
      this.bindEvents();
    },

    // 绑定事件
    bindEvents() {
      const slider = document.getElementById('timelineSlider');
      slider.addEventListener('input', (e) => {
        this.currentTimeIndex = parseInt(e.target.value);
        this.updateView();
      });
    },

    // 播放/暂停
    togglePlay() {
      this.isPlaying = !this.isPlaying;
      const playButton = document.querySelector('.timeline-controls button');
      
      if (this.isPlaying) {
        playButton.textContent = '暂停';
        this.play();
      } else {
        playButton.textContent = '播放';
        this.pause();
      }
    },

    // 播放
    play() {
      if (this.playInterval) clearInterval(this.playInterval);
      
      this.playInterval = setInterval(() => {
        if (this.currentTimeIndex >= this.timeData.length - 1) {
          this.pause();
          return;
        }
        
        this.currentTimeIndex++;
        document.getElementById('timelineSlider').value = this.currentTimeIndex;
        this.updateView();
      }, 1000); // 每秒更新一次
    },

    // 暂停
    pause() {
      this.isPlaying = false;
      document.querySelector('.timeline-controls button').textContent = '播放';
      if (this.playInterval) {
        clearInterval(this.playInterval);
        this.playInterval = null;
      }
    },

    // 更新视图
    updateView() {
      const currentTime = this.timeData[this.currentTimeIndex];
      this.updateTimeDisplay(currentTime);
      this.filterDataByTime(currentTime);
    },

    // 更新时间显示
    updateTimeDisplay(timestamp) {
      document.getElementById('currentTime').textContent = 
        new Date(timestamp).toLocaleString();
    },

    // 根据时间筛选数据
    filterDataByTime(timestamp) {
      const originalData = graph.save();
      const filteredData = {
        nodes: originalData.nodes,
        edges: originalData.edges.filter(edge => 
          new Date(edge.timestamp).getTime() <= timestamp
        )
      };
      
      graph.changeData(filteredData);
    },

    // 时间轴跳转
    handleTimelineJump(timestamp) {
      const index = this.timeData.findIndex(time => time >= timestamp);
      if (index !== -1) {
        this.currentTimeIndex = index;
        document.getElementById('timelineSlider').value = index;
        this.updateView();
      }
    },

    // 导出时间轴数据
    exportTimelineData() {
      const data = graph.save();
      const timelineData = data.edges
        .filter(edge => edge.timestamp)
        .map(edge => ({
          timestamp: edge.timestamp,
          source: this.getNodeInfo(edge.source),
          target: this.getNodeInfo(edge.target),
          amount: edge.amount,
          type: edge.type
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      return {
        events: timelineData,
        range: {
          start: timelineData[0]?.timestamp,
          end: timelineData[timelineData.length - 1]?.timestamp
        },
        statistics: this.calculateTimelineStatistics(timelineData)
      };
    },

    // 获节点信息
    getNodeInfo(nodeId) {
      const node = graph.findById(nodeId)?.getModel();
      return node ? {
        id: node.id,
        type: node.type,
        label: node.label
      } : { id: nodeId };
    },

    // 计算时间轴统计信息
    calculateTimelineStatistics(timelineData) {
      const intervals = [];
      for (let i = 1; i < timelineData.length; i++) {
        intervals.push(
          new Date(timelineData[i].timestamp) - 
          new Date(timelineData[i-1].timestamp)
        );
      }

      return {
        totalEvents: timelineData.length,
        averageInterval: intervals.length ? 
          intervals.reduce((a, b) => a + b, 0) / intervals.length : 0,
        minInterval: Math.min(...intervals),
        maxInterval: Math.max(...intervals)
      };
    }
  };

  // 绑定到全局
  window.playTimeline = () => TimelineController.togglePlay();

  // 添加搜索功能
  const SearchModule = {
    // 执行搜索
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

    // 获取边样式
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

    // 切换边动画
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
    enabled: false,

    // 初始化性能控
    initialize() {
      this.stats = new Stats();
      this.stats.dom.style.position = 'absolute';
      this.stats.dom.style.right = '320px';
      this.stats.dom.style.top = '0px';
      this.stats.dom.style.display = 'none';
      document.body.appendChild(this.stats.dom);

      // 添加自定义面板
      this.addCustomPanel();
    },

    // 添加自定义性能面板
    addCustomPanel() {
      const nodePanel = new Stats.Panel('Nodes', '#ff8', '#221');
      this.stats.addPanel(nodePanel);
      const edgePanel = new Stats.Panel('Edges', '#f8f', '#212');
      this.stats.addPanel(edgePanel);

      // 定期更新节点和边的数量
      setInterval(() => {
        if (this.enabled) {
          nodePanel.update(graph.getNodes().length, 1000);
          edgePanel.update(graph.getEdges().length, 5000);
        }
      }, 1000);
    },

    // 切换性能监控显示
    toggle() {
      this.enabled = !this.enabled;
      this.stats.dom.style.display = this.enabled ? 'block' : 'none';
      
      if (this.enabled) {
        this.startMonitoring();
      } else {
        this.stopMonitoring();
      }
    },

    // 开始监控
    startMonitoring() {
      const animate = () => {
        this.stats.begin();
        // 在这里添加需要监控的渲染逻辑
        graph.paint();
        this.stats.end();
        
        if (this.enabled) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    },

    // 停止监控
    stopMonitoring() {
      this.stats.dom.style.display = 'none';
    }
  };

  // 绑定到全局
  window.toggleStats = () => PerformanceMonitor.toggle();

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

    // 生成PDF报告
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
      doc.text(`边总数: ${report.graphInfo.edges}`, 30, 90);
      
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

  // 绑定全局
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

  // 标记节点
  function markNode(nodeId) {
    const node = graph.findById(nodeId);
    if (!node) return;

    const label = prompt('请输入标记说明：');
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

    // 隐藏节点及其关联边
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

  // 渲染优化管理器
  const RenderOptimizer = {
    // 视口优化
    enableViewportOptimization() {
      const viewportCheck = () => {
        const viewport = graph.getViewport();
        const nodes = graph.getNodes();
        
        nodes.forEach(node => {
          const bbox = node.getBBox();
          const visible = viewport.intersects(bbox);
          
          // 只渲染视口内的节点
          if (visible) {
            node.show();
            // 根据缩放级别调整细节
            this.adjustNodeDetail(node, graph.getZoom());
          } else {
            node.hide();
          }
        });
      };

      graph.on('viewportchange', viewportCheck);
      graph.on('afterzoom', viewportCheck);
    },

    // 根据缩放级别调整节点细节
    adjustNodeDetail(node, zoom) {
      if (zoom < 0.5) {
        // 低缩放级别：简化显示
        graph.updateItem(node, {
          labelCfg: { style: { opacity: 0 } },
          style: { lineWidth: 1 }
        });
      } else if (zoom < 1) {
        // 中等缩放级别
        graph.updateItem(node, {
          labelCfg: { style: { opacity: 0.5 } },
          style: { lineWidth: 2 }
        });
      } else {
        // 高缩放级别：显示完整细节
        graph.updateItem(node, {
          labelCfg: { style: { opacity: 1 } },
          style: { lineWidth: 3 }
        });
      }
    },

    // 批量更新优化
    batchUpdate(updates) {
      graph.updateLayout({
        animate: false
      });

      const batch = [];
      updates.forEach(update => {
        batch.push(() => {
          const { id, ...changes } = update;
          const item = graph.findById(id);
          if (item) {
            graph.updateItem(item, changes);
          }
        });
      });

      // 使用 requestAnimationFrame 分批执行更新
      const executeBatch = (start) => {
        const end = Math.min(start + 50, batch.length);
        for (let i = start; i < end; i++) {
          batch[i]();
        }
        if (end < batch.length) {
          requestAnimationFrame(() => executeBatch(end));
        } else {
          graph.updateLayout({
            animate: true
          });
        }
      };

      requestAnimationFrame(() => executeBatch(0));
    }
  };

  // 图形渲染器增强
  const GraphRenderer = {
    // 自定义节点渲染
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
      if (G6.Util.isWebGLSupported()) {
        const renderer = new G6.Renderer.WebGL();
        graph.set('renderer', renderer);
        
        // 配置WebGL选项
        renderer.configure({
          enableBloom: true,
          enableSSAO: true,
          antialias: true
        });
      }
    }
  };

  // 内存管理器
  const MemoryManager = {
    // 定期清理未使用的资源
    startMemoryCleanup() {
      setInterval(() => {
        this.cleanupUnusedResources();
      }, 60000); // 每分钟执行一次
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

    // 渲染属性信息
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

  // 初始化优化
  function initializeOptimizations() {
    // 启用渲染优化
    RenderOptimizer.enableViewportOptimization();
    
    // 注册自定义渲染器
    GraphRenderer.registerCustomRenderers();
    
    // 尝试启用WebGL渲染
    GraphRenderer.enableWebGLRenderer();
    
    // 启动内存管理
    MemoryManager.startMemoryCleanup();
    MemoryManager.monitorMemoryUsage();
    
    // 优化事件处理
    EventOptimizer.throttleEvents();
    EventOptimizer.setupEventDelegation();
  }

  // 在图实例创建后调用优化初始化
  initializeOptimizations();

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

  // 数据优化管理器
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

    // 数据分块加载
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

      // 数据转换
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

    // 转换为CSV
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
}); 