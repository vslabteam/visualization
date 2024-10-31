import G6 from '@antv/g6';
import { NODE_TYPES } from '../constants';
import { ThemeManager } from '../visualization/theme';
import { EventBus } from '../utils/eventBus';

export function registerCustomNodes() {
  Object.values(NODE_TYPES).forEach(type => {
    G6.registerNode(type, {
      draw(cfg, group) {
        const keyShape = group.addShape('circle', {
          attrs: {
            x: 0,
            y: 0,
            r: 20,
            fill: ThemeManager.getNodeColor(type),
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

  EventBus.emit('nodes:registered');
}

export const WebGLRenderer = {
  initialize() {
    if (!G6.Util.isWebGLSupported()) {
      EventBus.emit('webgl:not-supported');
      return false;
    }

    const renderer = new G6.Renderer.WebGL();
    EventBus.emit('webgl:initialized', { renderer });
    return renderer;
  }
}; 