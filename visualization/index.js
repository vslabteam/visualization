// 确保 G6 加载完成
window.onload = function() {
  // 首先检查 G6 是否正确加载
  if (typeof G6 === 'undefined') {
    console.error('G6 未正确加载');
    return;
  }

  // 初始化图形
  const graph = new G6.Graph({
    container: document.getElementById('container'), // 确保使用 DOM 元素或其 ID
    width: 800,  // 设置画布宽度
    height: 600, // 设置画布高度
    modes: {
      default: ['drag-canvas', 'zoom-canvas', 'drag-node']
    }
  });

  // 注册自定义节点（如果需要的话）
  try {
    G6.registerNode('yourNodeType', {
      draw(cfg, group) {
        const shape = group.addShape('circle', {
          attrs: {
            x: 0,
            y: 0,
            r: 20,
            fill: '#91d5ff',
          },
        });
        return shape;
      },
    });
  } catch (error) {
    console.error('注册节点时出错:', error);
  }

  // 创建一些测试数据
  const data = {
    nodes: [
      { id: 'node1', x: 100, y: 100 },
      { id: 'node2', x: 200, y: 200 }
    ],
    edges: [
      { source: 'node1', target: 'node2' }
    ]
  };

  // 渲染图形
  graph.data(data);
  graph.render();
}; 