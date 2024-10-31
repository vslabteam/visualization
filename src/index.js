import { initGraph } from './core/graph';
import { EventManager } from './core/events';
import { DataProcessor } from './utils/data';
import { EventBus } from './utils/eventBus';
import { PanelManager } from './components/panels';
import { I18nManager } from './utils/i18n';
import { ThemeManager } from './visualization/theme';
import { LayoutManager } from './visualization/layout';
import { ChartVisualization } from './visualization/charts';

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
  // 初始化各个管理器
  I18nManager.initialize();
  PanelManager.initialize();
  
  // 初始化图实例
  const container = document.getElementById('container');
  const graph = initGraph(container);
  
  if (!graph) {
    console.error('图初始化失败');
    return;
  }

  // 初始化事件管理
  new EventManager(graph);
  
  // 初始化可视化
  ChartVisualization.initialize();

  // 初始化面板状态
  function initializePanelStates() {
    const sectionStates = JSON.parse(localStorage.getItem('sectionStates') || '{}');
    
    Object.entries(sectionStates).forEach(([sectionId, isExpanded]) => {
      const section = document.getElementById(sectionId);
      if (section) {
        if (!isExpanded) {
          section.classList.add('collapsed');
          const header = section.previousElementSibling;
          const icon = header.querySelector('.toggle-icon');
          if (icon) {
            icon.textContent = '▶';
          }
        }
      }
    });
  }

  // 加载数据
  DataProcessor.loadData(graph, './dataset/bankFraud.json')
    .catch(error => {
      console.error('数据加载失败:', error);
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
    });

  // 初始化面板状态
  initializePanelStates();

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    if (graph) {
      const container = document.querySelector('.center-panel');
      graph.changeSize(container.offsetWidth, container.offsetHeight);
    }
  });

  // 导出全局函数
  window.changeLayout = (layoutType) => LayoutManager.changeLayout(layoutType, graph);
  window.changeTheme = (themeName) => ThemeManager.changeTheme(themeName, graph);
  window.toggleNodeAnimation = () => graph.updateLayout({ animate: !graph.get('animate') });
  window.toggleEdgeAnimation = () => graph.updateLayout({ edgeAnimate: !graph.get('edgeAnimate') });

  // 在初始化代码的最后添加
  window.PanelManager = PanelManager;
}); 