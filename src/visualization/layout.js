import { EventBus } from '../utils/eventBus';

export const LayoutManager = {
  layouts: {
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
    }
  },

  // 切换布局
  changeLayout(layoutType, graph) {
    if (!this.layouts[layoutType]) {
      EventBus.emit('layout:error', { message: '布局类型不存在' });
      return;
    }
    
    const config = this.layouts[layoutType];
    graph.updateLayout(config);
    EventBus.emit('layout:changed', { type: layoutType });
  },

  // 更新布局参数
  updateLayoutParams(layoutType, params, graph) {
    if (!this.layouts[layoutType]) {
      EventBus.emit('layout:error', { message: '布局类型不存在' });
      return;
    }

    const config = {
      ...this.layouts[layoutType],
      ...params
    };

    graph.updateLayout(config);
    EventBus.emit('layout:updated', { type: layoutType, params });
  },

  // 获取布局配置
  getLayoutConfig(layoutType) {
    return this.layouts[layoutType] || this.layouts.force;
  }
}; 