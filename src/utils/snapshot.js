import { CONFIG } from '../config';
import { EventBus } from './eventBus';
import { Helpers } from './helpers';

export const SnapshotManager = {
  // 保存快照
  saveSnapshot(graph) {
    const snapshot = {
      id: Helpers.generateId('snapshot-'),
      timestamp: new Date().toISOString(),
      name: prompt('请输入快照名称：', `快照 ${new Date().toLocaleString()}`),
      data: graph.save(),
      view: {
        zoom: graph.getZoom(),
        center: graph.getCenter()
      },
      metadata: {
        nodeCount: graph.getNodes().length,
        edgeCount: graph.getEdges().length,
        creator: localStorage.getItem('username') || 'unknown'
      }
    };

    this.persistSnapshot(snapshot);
    this.updateSnapshotList();
    EventBus.emit('snapshot:saved', { snapshot });
    return snapshot.id;
  },

  // 持久化快照
  async persistSnapshot(snapshot) {
    try {
      // 保存到 IndexedDB
      const db = await this.openDB();
      const transaction = db.transaction(['snapshots'], 'readwrite');
      const store = transaction.objectStore('snapshots');
      await store.put(snapshot);

      // 同时保存到 localStorage
      const snapshots = this.loadSnapshots();
      snapshots.push(snapshot);
      
      // 限制快照数量
      if (snapshots.length > CONFIG.snapshotLimit) {
        snapshots.shift();
      }

      localStorage.setItem('graphSnapshots', JSON.stringify(snapshots));
      EventBus.emit('snapshot:persisted', { snapshot });
    } catch (error) {
      EventBus.emit('snapshot:error', { 
        type: 'persist',
        error: error.message 
      });
    }
  },

  // 打开 IndexedDB
  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GraphAnalysis', 1);
      
      request.onerror = () => {
        EventBus.emit('db:error', { error: request.error });
        reject(request.error);
      };
      
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'id' });
        }
      };
    });
  },

  // 加载快照
  async loadSnapshot(snapshotId, graph) {
    try {
      const snapshot = await this.getSnapshot(snapshotId);
      if (!snapshot) {
        EventBus.emit('snapshot:error', { 
          type: 'load',
          message: 'Snapshot not found' 
        });
        return;
      }

      // 恢复图数据
      graph.changeData(snapshot.data);
      
      // 恢复视图状态
      graph.zoomTo(snapshot.view.zoom);
      graph.moveTo(snapshot.view.center.x, snapshot.view.center.y);
      
      EventBus.emit('snapshot:loaded', { snapshot });
    } catch (error) {
      EventBus.emit('snapshot:error', { 
        type: 'load',
        error: error.message 
      });
    }
  },

  // 获取快照
  async getSnapshot(snapshotId) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['snapshots'], 'readonly');
      const store = transaction.objectStore('snapshots');
      return await store.get(snapshotId);
    } catch (error) {
      console.error('从 IndexedDB 获取快照失败:', error);
      // 回退到 localStorage
      const snapshots = this.loadSnapshots();
      return snapshots.find(s => s.id === snapshotId);
    }
  },

  // 从本地存储加载快照列表
  loadSnapshots() {
    try {
      const snapshots = localStorage.getItem('graphSnapshots');
      return snapshots ? JSON.parse(snapshots) : [];
    } catch (error) {
      console.error('加载快照失败:', error);
      return [];
    }
  },

  // 更新快照列表UI
  updateSnapshotList() {
    const snapshots = this.loadSnapshots();
    const container = document.getElementById('snapshotList');
    if (!container) return;

    container.innerHTML = snapshots.map(snapshot => `
      <div class="snapshot-item">
        <div class="snapshot-header">
          <span class="snapshot-name">${snapshot.name}</span>
          <span class="snapshot-time">${new Date(snapshot.timestamp).toLocaleString()}</span>
        </div>
        <div class="snapshot-meta">
          节点: ${snapshot.metadata.nodeCount}, 
          边: ${snapshot.metadata.edgeCount}
        </div>
        <div class="snapshot-actions">
          <button onclick="SnapshotManager.loadSnapshot(${snapshot.id})">加载</button>
          <button onclick="SnapshotManager.deleteSnapshot(${snapshot.id})">删除</button>
          <button onclick="SnapshotManager.exportSnapshot(${snapshot.id})">导出</button>
        </div>
      </div>
    `).join('');
  }
}; 