import { EventBus } from '../utils/eventBus';
import { I18nManager } from '../utils/i18n';

export const PanelManager = {
  panels: {},

  // 初始化面板
  initialize() {
    this.setupPanels();
    this.initializePanelStates();
    this.bindEvents();
    this.setupSectionToggles();
    
    // 添加全局方法
    window.toggleSection = (sectionId) => this.toggleSection(sectionId);
    
    EventBus.emit('panels:initialized');
  },

  // 设置面板折叠功能
  setupSectionToggles() {
    // 为所有带有 data-section-toggle 属性的元素添加点击事件
    document.querySelectorAll('[data-section-toggle]').forEach(header => {
      header.addEventListener('click', (e) => {
        const sectionId = header.getAttribute('data-section-toggle');
        this.toggleSection(sectionId);
      });
    });
  },

  // 切换区域显示/隐藏
  toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const header = section.previousElementSibling;
    const icon = header.querySelector('.toggle-icon');
    const content = section.querySelector('.section-content') || section;
    
    content.classList.toggle('collapsed');
    
    if (icon) {
      icon.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
    }

    // 保存状态到本地存储
    this.saveSectionStates();
    
    EventBus.emit('section:toggled', {
      id: sectionId,
      collapsed: content.classList.contains('collapsed')
    });
  },

  // 保存所有区域状态
  saveSectionStates() {
    const states = {};
    document.querySelectorAll('.section-content, [id$="Section"]').forEach(section => {
      if (section.id) {
        states[section.id] = !section.classList.contains('collapsed');
      }
    });
    localStorage.setItem('sectionStates', JSON.stringify(states));
  },

  // 设置面板
  setupPanels() {
    const panelConfigs = {
      info: {
        title: I18nManager.t('panel.info'),
        position: 'left'
      },
      control: {
        title: I18nManager.t('panel.control'),
        position: 'right'
      },
      analysis: {
        title: I18nManager.t('panel.analysis'),
        position: 'right'
      }
    };

    Object.entries(panelConfigs).forEach(([id, config]) => {
      this.createPanel(id, config);
    });
  },

  // 创建面板
  createPanel(id, config) {
    const panel = document.createElement('div');
    panel.id = `${id}Panel`;
    panel.className = 'panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>${config.title}</h3>
        <button class="toggle-btn" data-panel="${id}">
          <span class="icon">▼</span>
        </button>
      </div>
      <div class="panel-content" id="${id}Content"></div>
    `;

    const container = document.querySelector(`.${config.position}-panel`);
    container.appendChild(panel);
    this.panels[id] = panel;

    // 使用事件委托处理点击
    panel.querySelector('.toggle-btn').addEventListener('click', (e) => {
      const panelId = e.currentTarget.dataset.panel;
      this.togglePanel(panelId);
    });
  },

  // 切换面板显示状态
  togglePanel(panelId) {
    const panel = this.panels[panelId];
    const content = panel.querySelector('.panel-content');
    const icon = panel.querySelector('.icon');
    
    content.classList.toggle('collapsed');
    icon.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
    
    this.savePanelStates();
    EventBus.emit('panel:toggled', { 
      id: panelId, 
      collapsed: content.classList.contains('collapsed') 
    });
  },

  // 保存面板状态
  savePanelStates() {
    const states = {};
    Object.entries(this.panels).forEach(([id, panel]) => {
      states[id] = !panel.querySelector('.panel-content').classList.contains('collapsed');
    });
    localStorage.setItem('panelStates', JSON.stringify(states));
  },

  // 初始化面板状态
  initializePanelStates() {
    const savedStates = JSON.parse(localStorage.getItem('panelStates') || '{}');
    Object.entries(savedStates).forEach(([id, isExpanded]) => {
      if (!isExpanded) {
        this.togglePanel(id);
      }
    });
  },

  // 绑定事件监听
  bindEvents() {
    EventBus.on('theme:changed', () => this.updatePanelStyles());
    EventBus.on('i18n:changed', () => this.updatePanelLabels());
  },

  // 更新面板样式
  updatePanelStyles() {
    // 根据当前主题更新面板样式
  },

  // 更新面板标签
  updatePanelLabels() {
    Object.entries(this.panels).forEach(([id, panel]) => {
      const title = panel.querySelector('h3');
      title.textContent = I18nManager.t(`panel.${id}`);
    });
  }
}; 