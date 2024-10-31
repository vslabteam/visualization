import { EventBus } from './eventBus';
import { Helpers } from './helpers';

export const ExportManager = {
  // 导出图片
  exportImage(graph, type = 'png') {
    try {
      const canvas = document.querySelector('#container canvas');
      let url;

      if (type === 'svg') {
        const svg = graph.toSVG();
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        url = URL.createObjectURL(blob);
      } else {
        url = canvas.toDataURL('image/png');
      }

      this.downloadFile(url, `graph-export-${Date.now()}.${type}`);
      EventBus.emit('export:success', { type: 'image', format: type });
    } catch (error) {
      EventBus.emit('export:error', { 
        type: 'image', 
        error: error.message 
      });
    }
  },

  // 导出高清图片
  exportHighQuality(graph) {
    try {
      const scale = 2;
      const canvas = document.querySelector('#container canvas');
      const scaledCanvas = document.createElement('canvas');
      const ctx = scaledCanvas.getContext('2d');

      scaledCanvas.width = canvas.width * scale;
      scaledCanvas.height = canvas.height * scale;
      
      ctx.scale(scale, scale);
      ctx.drawImage(canvas, 0, 0);

      const url = scaledCanvas.toDataURL('image/png');
      this.downloadFile(url, `graph-hd-${Date.now()}.png`);
      EventBus.emit('export:success', { type: 'hd-image' });
    } catch (error) {
      EventBus.emit('export:error', { 
        type: 'hd-image', 
        error: error.message 
      });
    }
  },

  // 导出数据
  exportData(graph, format = 'json') {
    try {
      const data = graph.save();
      let content, filename, mimeType;

      switch (format) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          filename = `graph-export-${Date.now()}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          content = this.convertToCSV(data);
          filename = `graph-export-${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'xml':
          content = this.convertToXML(data);
          filename = `graph-export-${Date.now()}.xml`;
          mimeType = 'text/xml';
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      this.downloadFile(url, filename);
      EventBus.emit('export:success', { type: 'data', format });
    } catch (error) {
      EventBus.emit('export:error', { 
        type: 'data', 
        error: error.message 
      });
    }
  },

  // 下载文件
  downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    EventBus.emit('export:downloaded', { filename });
  },

  // 转换为CSV格式
  convertToCSV(data) {
    // 节点CSV
    const nodeHeaders = ['id', 'type', 'label'];
    const nodeRows = data.nodes.map(node => 
      nodeHeaders.map(header => node[header] || '').join(',')
    );
    const nodesCSV = [
      'type,id,type,label',
      ...nodeRows.map(row => `node,${row}`)
    ].join('\n');

    // 边CSV
    const edgeHeaders = ['source', 'target', 'type'];
    const edgeRows = data.edges.map(edge =>
      edgeHeaders.map(header => edge[header] || '').join(',')
    );
    const edgesCSV = [
      ...edgeRows.map(row => `edge,${row}`)
    ].join('\n');

    return `${nodesCSV}\n${edgesCSV}`;
  },

  // 转换为XML格式
  convertToXML(data) {
    const xml = ['<?xml version="1.0" encoding="UTF-8"?>'];
    xml.push('<graph>');
    
    // 节点XML
    xml.push('  <nodes>');
    data.nodes.forEach(node => {
      xml.push(`    <node id="${node.id}" type="${node.type}" label="${node.label || ''}" />`);
    });
    xml.push('  </nodes>');

    // 边XML
    xml.push('  <edges>');
    data.edges.forEach(edge => {
      xml.push(`    <edge source="${edge.source}" target="${edge.target}" type="${edge.type || ''}" />`);
    });
    xml.push('  </edges>');
    xml.push('</graph>');
    
    return xml.join('\n');
  }
}; 