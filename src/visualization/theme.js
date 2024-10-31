import { CONFIG } from '../config';
import { EventBus } from '../utils/eventBus';

export const ThemeManager = {
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
  changeTheme(themeName, graph) {
    if (!this.themes[themeName]) {
      EventBus.emit('theme:error', { message: '主题不存在' });
      return;
    }
    
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

    document.getElementById('container').style.background = theme.background;
    EventBus.emit('theme:changed', { theme: themeName });
  },

  // 获取节点颜色
  getNodeColor(type, themeName = CONFIG.defaultTheme) {
    const theme = this.themes[themeName];
    return theme.nodeColors[type] || theme.nodeColors.default;
  }
}; 