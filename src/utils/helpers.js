import { EventBus } from './eventBus';

export const Helpers = {
  // 日期格式化
  formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    const values = {
      YYYY: d.getFullYear(),
      MM: String(d.getMonth() + 1).padStart(2, '0'),
      DD: String(d.getDate()).padStart(2, '0'),
      HH: String(d.getHours()).padStart(2, '0'),
      mm: String(d.getMinutes()).padStart(2, '0'),
      ss: String(d.getSeconds()).padStart(2, '0')
    };
    
    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => values[match]);
  },

  // 数字格式化
  formatNumber(num, options = {}) {
    const defaults = {
      locale: 'zh-CN',
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    };
    
    const config = { ...defaults, ...options };
    return new Intl.NumberFormat(config.locale, config).format(num);
  },

  // 生成唯一ID
  generateId(prefix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}-${random}`;
  },

  // 深拷贝
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      EventBus.emit('error', {
        type: 'deepClone',
        message: '对象无法序列化',
        error
      });
      return obj;
    }
  },

  // 防抖函数
  debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
        EventBus.emit('debounce:called', { fn: fn.name });
      }, delay);
    };
  },

  // 节流函数
  throttle(fn, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
          EventBus.emit('throttle:ready', { fn: fn.name });
        }, limit);
      }
    };
  }
}; 