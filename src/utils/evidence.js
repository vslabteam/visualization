import { EventBus } from './eventBus';
import { Helpers } from './helpers';
import { I18nManager } from './i18n';

export const EvidenceManager = {
  evidence: {
    markers: [],
    comments: [],
    screenshots: [],
    nodes: []
  },

  // 初始化
  initialize() {
    this.loadEvidence();
    EventBus.emit('evidence:initialized');
  },

  // 添加标记
  addMarker(nodeId, label, graph) {
    const marker = {
      id: Helpers.generateId('marker-'),
      nodeId,
      label,
      timestamp: new Date().toISOString(),
      nodes: [graph.findById(nodeId).getModel()]
    };

    this.evidence.markers.push(marker);
    this.updateEvidenceList();
    this.highlightMarker(marker.id, graph);
    this.saveEvidence();
    
    EventBus.emit('evidence:markerAdded', { marker });
  },

  // 添加注释
  addComment(content, elements) {
    const comment = {
      id: Helpers.generateId('comment-'),
      content,
      timestamp: new Date().toISOString(),
      elements: {
        nodes: elements.nodes.map(node => node.getModel()),
        edges: elements.edges.map(edge => edge.getModel())
      }
    };

    this.evidence.comments.push(comment);
    this.updateEvidenceList();
    this.saveEvidence();
    
    EventBus.emit('evidence:commentAdded', { comment });
  },

  // 添加截图
  addScreenshot(dataUrl) {
    const screenshot = {
      id: Helpers.generateId('screenshot-'),
      dataUrl,
      timestamp: new Date().toISOString()
    };

    this.evidence.screenshots.push(screenshot);
    this.updateEvidenceList();
    this.saveEvidence();
    
    EventBus.emit('evidence:screenshotAdded', { screenshot });
  },

  // 保存证据
  saveEvidence() {
    try {
      localStorage.setItem('graphEvidence', JSON.stringify(this.evidence));
      EventBus.emit('evidence:saved');
    } catch (error) {
      EventBus.emit('evidence:error', { 
        type: 'save',
        error: error.message 
      });
    }
  },

  // 加载证据
  loadEvidence() {
    try {
      const savedEvidence = localStorage.getItem('graphEvidence');
      if (savedEvidence) {
        this.evidence = JSON.parse(savedEvidence);
        this.updateEvidenceList();
        EventBus.emit('evidence:loaded');
      }
    } catch (error) {
      EventBus.emit('evidence:error', { 
        type: 'load',
        error: error.message 
      });
    }
  },

  // 更新证据列表UI
  updateEvidenceList() {
    const evidenceList = document.getElementById('evidenceList');
    if (!evidenceList) return;

    evidenceList.innerHTML = `
      ${this.renderMarkers()}
      ${this.renderComments()}
      ${this.renderScreenshots()}
    `;
    
    EventBus.emit('evidence:listUpdated');
  },

  // 渲染标记列表
  renderMarkers() {
    return this.evidence.markers.map(marker => `
      <div class="evidence-item marker">
        <div class="evidence-type">标记</div>
        <div class="evidence-label">${marker.label}</div>
        <div class="evidence-time">${new Date(marker.timestamp).toLocaleString()}</div>
        <button onclick="EvidenceManager.highlightMarker('${marker.id}')">查看</button>
      </div>
    `).join('');
  },

  // 渲染注释列表
  renderComments() {
    return this.evidence.comments.map(comment => `
      <div class="evidence-item comment">
        <div class="evidence-type">注释</div>
        <div class="evidence-content">${comment.content}</div>
        <div class="evidence-time">${new Date(comment.timestamp).toLocaleString()}</div>
        <button onclick="EvidenceManager.highlightComment('${comment.id}')">查看</button>
      </div>
    `).join('');
  },

  // 渲染截图列表
  renderScreenshots() {
    return this.evidence.screenshots.map(screenshot => `
      <div class="evidence-item screenshot">
        <div class="evidence-type">截图</div>
        <div class="evidence-time">${new Date(screenshot.timestamp).toLocaleString()}</div>
        <button onclick="EvidenceManager.highlightScreenshot('${screenshot.id}')">查看</button>
      </div>
    `).join('');
  },

  // 导出证据报告
  exportEvidenceReport() {
    try {
      const report = {
        metadata: {
          caseId: Helpers.generateId('case-'),
          investigator: localStorage.getItem('investigatorName') || 'Unknown',
          timestamp: new Date().toISOString()
        },
        evidence: this.evidence,
        timeline: this.generateTimeline(),
        analysis: this.generateAnalysis()
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const filename = `evidence-report-${Helpers.formatDate(new Date(), 'YYYY-MM-DD-HH-mm')}.json`;
      
      Helpers.downloadFile(url, filename);
      EventBus.emit('evidence:exported', { filename });
    } catch (error) {
      EventBus.emit('evidence:error', { 
        type: 'export',
        error: error.message 
      });
    }
  },

  // 生成时间线
  generateTimeline() {
    const events = [];

    // 收集所有标记和注释
    this.evidence.markers.forEach(marker => {
      events.push({
        type: 'marker',
        timestamp: marker.timestamp,
        description: marker.label,
        relatedNodes: marker.nodes
      });
    });

    this.evidence.comments.forEach(comment => {
      events.push({
        type: 'comment',
        timestamp: comment.timestamp,
        description: comment.content,
        relatedElements: comment.elements
      });
    });

    // 按时间排序
    return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
}; 