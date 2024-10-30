document.addEventListener('DOMContentLoaded', function() {
  // 检查 G6 是否正确加载
  console.log('G6 version:', G6.version);

  const data = {
    nodes: [
      { id: 'node1', x: 100, y: 100 },
      { id: 'node2', x: 200, y: 200 }
    ],
    edges: [
      { source: 'node1', target: 'node2' }
    ]
  };

  const graph = new G6.Graph({
    container: 'container',
    width: 800,
    height: 600,
    defaultNode: {
      type: 'circle',
      size: 30,
      style: {
        fill: '#91d5ff',
        stroke: '#5b8ff9'
      }
    },
    defaultEdge: {
      style: {
        stroke: '#e2e2e2'
      }
    }
  });

  graph.data(data);
  graph.render();
}); 