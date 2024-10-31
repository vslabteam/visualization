import { EventBus } from './eventBus';

export const I18nManager = {
  currentLocale: 'zh-CN',
  translations: {
    'zh-CN': {
      // 通用
      'common.loading': '加载中...',
      'common.confirm': '确认',
      'common.cancel': '取消',
      'common.save': '保存',
      'common.delete': '删除',
      'common.export': '导出',
      'common.import': '导入',
      'common.search': '搜索',
      'common.filter': '筛选',
      'common.view': '查看',
      'common.edit': '编辑',
      'common.add': '添加',

      // 面板标题
      'panel.info': '图表信息',
      'panel.control': '操作面板',
      'panel.analysis': '分析结果',
      'panel.evidence': '取证工具',
      'panel.anomaly': '异常检测',

      // 节点类型
      'node.account': '账户',
      'node.merchant': '商户',
      'node.transaction': '交易',

      // 算法分析
      'algorithm.centrality': '中心度分析',
      'algorithm.community': '社区检测',
      'algorithm.path': '路径分析',
      'algorithm.cycle': '环路检测',

      // 异常类型
      'anomaly.cycle': '循环交易',
      'anomaly.rapid': '快速连续交易',
      'anomaly.amount': '异常金额',
      'anomaly.pattern': '异常模式',

      // 风险等级
      'risk.high': '高风险',
      'risk.medium': '中风险',
      'risk.low': '低风险'
    },
    'en-US': {
      // Common
      'common.loading': 'Loading...',
      'common.confirm': 'Confirm',
      'common.cancel': 'Cancel',
      // ... 英文翻译
    }
  },

  // 初始化
  initialize() {
    const preferredLocale = localStorage.getItem('preferredLocale');
    if (preferredLocale && this.translations[preferredLocale]) {
      this.currentLocale = preferredLocale;
    }
    this.updateUI();
    EventBus.emit('i18n:initialized', { locale: this.currentLocale });
  },

  // 切换语言
  setLocale(locale) {
    if (this.translations[locale]) {
      this.currentLocale = locale;
      localStorage.setItem('preferredLocale', locale);
      this.updateUI();
      EventBus.emit('i18n:localeChanged', { locale });
    } else {
      EventBus.emit('i18n:error', { 
        message: `Unsupported locale: ${locale}` 
      });
    }
  },

  // 获取翻译文本
  t(key, params = {}) {
    const text = this.translations[this.currentLocale][key] || key;
    return text.replace(/\{(\w+)\}/g, (_, param) => params[param] || '');
  },

  // 更新UI文本
  updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.t(key);
    });
    EventBus.emit('i18n:updated');
  }
}; 