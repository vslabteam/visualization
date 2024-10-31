import G6 from '@antv/g6';
import { CONFIG } from '../config';
import { NODE_TYPES } from '../constants';
import { ThemeManager } from '../visualization/theme';
import { EventBus } from '../utils/eventBus';

export function initGraph(container) {
  // 检查 G6 是否正确加载
  if (typeof G6 === 'undefined') {
    console.error('G6 未能正确加载');
    return null;
  }

  console.log('G6 version:', G6.version);

  try {
    registerCustomNodes();
  } catch (error) {
    console.error('注册节点时出错:', error);
  }

  // 创建图实例
  const graph = new G6.Graph({
    container: container,
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

  // 添加窗口大小改变的监听器
  window.addEventListener('resize', () => {
    if (graph) {
      const container = document.querySelector('.center-panel');
      graph.changeSize(container.offsetWidth, container.offsetHeight);
    }
  });

  return graph;
} 