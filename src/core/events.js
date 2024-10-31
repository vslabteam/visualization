import { EVENT_TYPES } from '../constants';
import { EventBus } from '../utils/eventBus';

export class EventManager {
  constructor(graph) {
    this.graph = graph;
    this.setupEventListeners();
  }

  setupEventListeners() {
    Object.values(EVENT_TYPES).forEach(eventType => {
      this.graph.on(eventType, (e) => {
        EventBus.emit(eventType, { event: e, graph: this.graph });
      });
    });
  }
} 