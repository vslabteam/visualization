import { EventBus } from './eventBus';

export const FilterManager = {
  // 应用过滤器
  applyFilters(graph, filters) {
    const nodes = graph.getNodes();
    const edges = graph.getEdges();

    let visibleNodeCount = 0;
    let visibleEdgeCount = 0;

    nodes.forEach(node => {
      const visible = this.nodeMatchesFilters(node, filters);
      if (visible) {
        node.show();
        visibleNodeCount++;
      } else {
        node.hide();
      }
    });

    edges.forEach(edge => {
      const sourceVisible = edge.getSource().isVisible();
      const targetVisible = edge.getTarget().isVisible();
      if (sourceVisible && targetVisible) {
        edge.show();
        visibleEdgeCount++;
      } else {
        edge.hide();
      }
    });

    graph.paint();
    
    EventBus.emit('filter:applied', {
      filters,
      stats: {
        visibleNodes: visibleNodeCount,
        visibleEdges: visibleEdgeCount,
        totalNodes: nodes.length,
        totalEdges: edges.length
      }
    });
  },

  // 检查节点是否匹配过滤条件
  nodeMatchesFilters(node, filters) {
    const model = node.getModel();
    
    // 类型过滤
    if (filters.type && model.type !== filters.type) {
      return false;
    }

    // 时间过滤
    if (filters.timeRange && model.timestamp) {
      const timestamp = new Date(model.timestamp).getTime();
      if (timestamp < filters.timeRange[0] || timestamp > filters.timeRange[1]) {
        return false;
      }
    }

    // 属性过滤
    if (filters.properties) {
      for (const [key, value] of Object.entries(filters.properties)) {
        if (!model.properties || model.properties[key] !== value) {
          return false;
        }
      }
    }

    return true;
  },

  // 重置过滤器
  resetFilters(graph) {
    graph.getNodes().forEach(node => node.show());
    graph.getEdges().forEach(edge => edge.show());
    graph.paint();
    EventBus.emit('filter:reset');
  }
}; 