import { EventBus } from './eventBus';

export const SearchModule = {
  // 执行搜索
  searchNodes(graph, searchTerm) {
    const results = [];
    searchTerm = searchTerm.toLowerCase();
    
    graph.getNodes().forEach(node => {
      const model = node.getModel();
      if (this.matchNode(model, searchTerm)) {
        results.push(model);
      }
    });

    EventBus.emit('search:complete', { results, searchTerm });
    return results;
  },

  // 匹配节点
  matchNode(model, term) {
    return (
      model.id.toLowerCase().includes(term) ||
      (model.label && model.label.toLowerCase().includes(term)) ||
      this.searchNodeProperties(model, term)
    );
  },

  // 搜索节点属性
  searchNodeProperties(model, term) {
    if (!model.properties) return false;
    return Object.values(model.properties).some(value => 
      String(value).toLowerCase().includes(term)
    );
  },

  // 高亮搜索结果
  highlightResults(graph, results) {
    // 清除现有高亮
    graph.getNodes().forEach(node => {
      graph.clearItemState(node);
    });

    // 高亮匹配节点
    results.forEach(result => {
      const node = graph.findById(result.id);
      if (node) {
        graph.setItemState(node, 'highlight', true);
      }
    });
  }
}; 