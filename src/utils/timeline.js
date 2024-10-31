import { EventBus } from './eventBus';
import { Helpers } from './helpers';

export const TimelineController = {
  isPlaying: false,
  currentTime: null,
  playbackSpeed: 1000,
  timeData: null,
  graph: null,

  // 初始化时间轴
  initialize(graph, data) {
    this.graph = graph;
    this.timeData = this.processTimeData(data);
    this.setupControls();
    EventBus.emit('timeline:initialized', { 
      startTime: this.timeData[0].timestamp,
      endTime: this.timeData[this.timeData.length - 1].timestamp
    });
  },

  // 处理时间数据
  processTimeData(data) {
    return data.edges
      .filter(edge => edge.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(edge => ({
        timestamp: new Date(edge.timestamp),
        edgeId: edge.id,
        sourceId: edge.source,
        targetId: edge.target
      }));
  },

  // 设置控制器
  setupControls() {
    const container = document.getElementById('timelineControls');
    if (!container) return;

    container.innerHTML = `
      <div class="timeline-controls">
        <button id="playButton" onclick="TimelineController.togglePlay()">
          ${this.isPlaying ? '暂停' : '播放'}
        </button>
        <input type="range" id="timeSlider" 
          min="0" max="${this.timeData.length - 1}" value="0"
          onchange="TimelineController.handleSliderChange(this.value)"
        />
        <span id="currentTimeDisplay">
          ${Helpers.formatDate(this.timeData[0].timestamp)}
        </span>
      </div>
    `;
  },

  // 播放/暂停
  togglePlay() {
    this.isPlaying = !this.isPlaying;
    document.getElementById('playButton').textContent = 
      this.isPlaying ? '暂停' : '播放';

    if (this.isPlaying) {
      this.play();
    }
    
    EventBus.emit('timeline:playStateChanged', { isPlaying: this.isPlaying });
  },

  // 播放
  play() {
    if (!this.isPlaying) return;

    const currentIndex = this.getCurrentIndex();
    if (currentIndex >= this.timeData.length - 1) {
      this.isPlaying = false;
      EventBus.emit('timeline:finished');
      return;
    }

    this.jumpToTime(this.timeData[currentIndex + 1].timestamp);
    setTimeout(() => this.play(), this.playbackSpeed);
  },

  // 跳转到指定时间
  jumpToTime(timestamp) {
    this.currentTime = new Date(timestamp);
    this.updateVisualization();
    this.updateTimeDisplay();
    EventBus.emit('timeline:timeChanged', { timestamp: this.currentTime });
  },

  // 获取当前索引
  getCurrentIndex() {
    if (!this.currentTime) return -1;
    return this.timeData.findIndex(item => 
      item.timestamp.getTime() === this.currentTime.getTime()
    );
  },

  // 更新可视化
  updateVisualization() {
    const currentData = this.timeData.filter(item => 
      item.timestamp <= this.currentTime
    );

    // 更新边的显示状态
    this.graph.getEdges().forEach(edge => {
      const model = edge.getModel();
      const isVisible = currentData.some(item => item.edgeId === model.id);
      if (isVisible) {
        edge.show();
      } else {
        edge.hide();
      }
    });

    this.graph.paint();
  },

  // 更新时间显示
  updateTimeDisplay() {
    const display = document.getElementById('currentTimeDisplay');
    if (display) {
      display.textContent = Helpers.formatDate(this.currentTime);
    }

    const slider = document.getElementById('timeSlider');
    if (slider) {
      slider.value = this.getCurrentIndex();
    }
  },

  // 处理滑块变化
  handleSliderChange(value) {
    const index = parseInt(value);
    if (index >= 0 && index < this.timeData.length) {
      this.jumpToTime(this.timeData[index].timestamp);
    }
  }
}; 