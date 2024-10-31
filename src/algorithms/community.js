import G6 from '@antv/g6';
import { EventBus } from '../utils/eventBus';
import { ThemeManager } from '../visualization/theme';

export const CommunityDetection = {
  detectCommunities(graph) {
    const data = {
      nodes: graph.save().nodes,
      edges: graph.save().edges
    };
    
    const communities = G6.Util.louvain(data);
    const communityStats = this.calculateCommunityStats(communities);

    EventBus.emit('communities:detected', {
      communities,
      stats: communityStats
    });

    return {
      communities,
      stats: communityStats
    };
  },

  calculateCommunityStats(communities) {
    const communitySizes = {};
    Object.values(communities).forEach(communityId => {
      communitySizes[communityId] = (communitySizes[communityId] || 0) + 1;
    });

    const sizes = Object.values(communitySizes);
    return {
      count: Object.keys(communitySizes).length,
      maxSize: Math.max(...sizes),
      avgSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
      distribution: communitySizes
    };
  },

  visualizeCommunities(communities, graph) {
    const communityCount = Object.keys(communities).length;
    
    Object.entries(communities).forEach(([nodeId, communityId]) => {
      const node = graph.findById(nodeId);
      if (node) {
        const color = `hsl(${(communityId * 360) / communityCount}, 70%, 70%)`;
        graph.updateItem(node, {
          style: {
            fill: color
          }
        });
      }
    });

    EventBus.emit('communities:visualized', { communityCount });
  }
}; 