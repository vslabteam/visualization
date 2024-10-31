import { EventBus } from './eventBus';
import { Helpers } from './helpers';

export const PerformanceMonitor = {
  stats: {
    fps: [],
    memory: [],
    renderTime: [],
    nodeCount: 0,
    edgeCount: 0
  },

  // 初始化监控
  initialize(graph) {
    this.graph = graph;
    this.startMonitoring();
    this.setupMetricsCollection();
    EventBus.emit('performance:initialized');
  },

  // 开始监控
  startMonitoring() {
    let lastTime = performance.now();
    let frames = 0;

    const measure = () => {
      frames++;
      const now = performance.now();
      
      if (now >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (now - lastTime));
        this.stats.fps.push(fps);
        
        if (this.stats.fps.length > 100) {
          this.stats.fps.shift();
        }

        frames = 0;
        lastTime = now;
        
        this.updatePerformanceUI();
        EventBus.emit('performance:measured', { fps });
      }

      requestAnimationFrame(measure);
    };

    requestAnimationFrame(measure);
  },

  // 设置指标收集
  setupMetricsCollection() {
    setInterval(() => {
      this.collectMetrics();
    }, 1000);
  },

  // 收集性能指标
  collectMetrics() {
    if (performance.memory) {
      const memoryStats = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
      
      this.stats.memory.push(memoryStats);
      if (this.stats.memory.length > 100) {
        this.stats.memory.shift();
      }

      EventBus.emit('performance:memoryCollected', memoryStats);
    }

    const renderStart = performance.now();
    this.graph.render();
    const renderTime = performance.now() - renderStart;
    
    this.stats.renderTime.push(renderTime);
    if (this.stats.renderTime.length > 100) {
      this.stats.renderTime.shift();
    }

    EventBus.emit('performance:renderTimeCollected', { renderTime });
  },

  // 更新性能面板UI
  updatePerformanceUI() {
    const stats = document.getElementById('performanceStats');
    if (!stats) return;

    const avgFps = Helpers.calculateAverage(this.stats.fps);
    const avgRenderTime = Helpers.calculateAverage(this.stats.renderTime);
    
    stats.innerHTML = `
      <div>FPS: ${avgFps.toFixed(1)}</div>
      <div>渲染时间: ${avgRenderTime.toFixed(2)}ms</div>
      <div>节点数量: ${this.stats.nodeCount}</div>
      <div>边数量: ${this.stats.edgeCount}</div>
      ${this.getMemoryStats()}
    `;
  },

  // 获取内存统计信息
  getMemoryStats() {
    if (!this.stats.memory.length) return '';
    
    const latest = this.stats.memory[this.stats.memory.length - 1];
    return `
      <div>内存使用: ${(latest.used / 1048576).toFixed(2)}MB</div>
      <div>内存限制: ${(latest.limit / 1048576).toFixed(2)}MB</div>
    `;
  },

  // 计算平均值
  calculateAverage(array) {
    return array.reduce((a, b) => a + b, 0) / array.length;
  },

  // 导出性能报告
  exportPerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      systemInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        webglSupported: this.graph.get('renderer').type === 'webgl'
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}; 