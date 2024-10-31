import { CONFIG } from '../config';
import { EventBus } from './eventBus';

export const HistoryManager = {
  history: [],
  currentIndex: -1,
  maxHistory: CONFIG.maxHistorySize,

  // 记录操作
  recordOperation(graph, operation) {
    // 移除当前位置之后的历史记录
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // 添加新的操作记录
    this.history.push({
      type: operation.type,
      data: operation.data,
      timestamp: Date.now(),
      graphState: graph.save()
    });

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.currentIndex = this.history.length - 1;
    EventBus.emit('history:recorded', { operation });
  },

  // 撤销操作
  undo(graph) {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const state = this.history[this.currentIndex];
      graph.changeData(state.graphState);
      EventBus.emit('history:undo', { state });
    }
  },

  // 重做操作
  redo(graph) {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const state = this.history[this.currentIndex];
      graph.changeData(state.graphState);
      EventBus.emit('history:redo', { state });
    }
  }
}; 