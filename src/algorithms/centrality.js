import G6 from '@antv/g6';
import { EventBus } from '../utils/eventBus';

export const CentralityAnalysis = {
  calculateCentrality(graph) {
    const data = {
      nodes: graph.save().nodes,
      edges: graph.save().edges
    };
    
    const centralityResults = G6.Util.degreeCentrality(data);
    const sortedNodes = Object.entries(centralityResults)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    EventBus.emit('centrality:calculated', { results: sortedNodes });
    return sortedNodes;
  },

  updateCentralityUI(sortedNodes, graph) {
    const top5List = document.getElementById('centralityTop5');
    if (!top5List) return;

    top5List.innerHTML = '';
    
    sortedNodes.forEach(([nodeId, score]) => {
      const node = graph.findById(nodeId);
      if (!node) return;

      const nodeInfo = node.getModel();
      const li = document.createElement('li');
      li.textContent = `${nodeInfo.label || nodeId}: ${score.toFixed(3)}`;
      top5List.appendChild(li);
      
      graph.setItemState(node, 'highlight', true);
    });

    EventBus.emit('centrality:ui-updated');
  }
}; 