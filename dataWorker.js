// 数据缓存
const dataCache = new Map();
const CHUNK_SIZE = 1000; // 每次加载的节点数量

// 数据分析工具
const DataAnalyzer = {
  // 时间序列分析
  analyzeTimeSequence(data) {
    const timeData = data.edges
      .filter(edge => edge.timestamp)
      .map(edge => ({
        timestamp: new Date(edge.timestamp),
        amount: edge.amount || 0,
        source: edge.source,
        target: edge.target
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      timeRange: {
        start: timeData[0]?.timestamp,
        end: timeData[timeData.length - 1]?.timestamp
      },
      intervals: this.analyzeTimeIntervals(timeData),
      patterns: this.findTemporalPatterns(timeData)
    };
  },

  // 分析时间间隔
  analyzeTimeIntervals(timeData) {
    const intervals = [];
    for (let i = 1; i < timeData.length; i++) {
      intervals.push(timeData[i].timestamp - timeData[i-1].timestamp);
    }
    return {
      min: Math.min(...intervals),
      max: Math.max(...intervals),
      avg: intervals.reduce((a, b) => a + b, 0) / intervals.length
    };
  },

  // 寻找时间模式
  findTemporalPatterns(timeData) {
    const hourlyDistribution = new Array(24).fill(0);
    const dailyDistribution = new Array(7).fill(0);
    const monthlyDistribution = new Array(12).fill(0);

    timeData.forEach(item => {
      hourlyDistribution[item.timestamp.getHours()]++;
      dailyDistribution[item.timestamp.getDay()]++;
      monthlyDistribution[item.timestamp.getMonth()]++;
    });

    return {
      hourly: hourlyDistribution,
      daily: dailyDistribution,
      monthly: monthlyDistribution
    };
  },

  // 金额分析
  analyzeAmounts(data) {
    const amounts = data.edges
      .filter(edge => edge.amount)
      .map(edge => edge.amount);

    if (amounts.length === 0) return null;

    const sortedAmounts = amounts.sort((a, b) => a - b);
    const sum = amounts.reduce((a, b) => a + b, 0);

    return {
      min: sortedAmounts[0],
      max: sortedAmounts[sortedAmounts.length - 1],
      avg: sum / amounts.length,
      median: sortedAmounts[Math.floor(sortedAmounts.length / 2)],
      total: sum,
      distribution: this.calculateAmountDistribution(sortedAmounts)
    };
  },

  // 计算金额分布
  calculateAmountDistribution(amounts) {
    const min = amounts[0];
    const max = amounts[amounts.length - 1];
    const range = max - min;
    const bucketCount = 10;
    const bucketSize = range / bucketCount;
    const distribution = new Array(bucketCount).fill(0);

    amounts.forEach(amount => {
      const bucketIndex = Math.min(
        Math.floor((amount - min) / bucketSize),
        bucketCount - 1
      );
      distribution[bucketIndex]++;
    });

    return {
      buckets: distribution,
      bucketSize,
      min,
      max
    };
  },

  // 风险评估
  assessRisk(data) {
    const riskFactors = {
      rapidTransactions: this.detectRapidTransactions(data),
      largeAmounts: this.detectLargeAmounts(data),
      unusualPatterns: this.detectUnusualPatterns(data)
    };

    return this.calculateRiskScores(riskFactors);
  },

  // 检测快速连续交易
  detectRapidTransactions(data) {
    const timeThreshold = 300000; // 5分钟
    const transactions = {};

    data.edges.forEach(edge => {
      if (!transactions[edge.source]) {
        transactions[edge.source] = [];
      }
      transactions[edge.source].push({
        timestamp: new Date(edge.timestamp),
        amount: edge.amount
      });
    });

    const rapidSequences = [];
    Object.entries(transactions).forEach(([source, trans]) => {
      trans.sort((a, b) => a.timestamp - b.timestamp);
      
      for (let i = 1; i < trans.length; i++) {
        if (trans[i].timestamp - trans[i-1].timestamp < timeThreshold) {
          rapidSequences.push({
            source,
            transactions: [trans[i-1], trans[i]],
            interval: trans[i].timestamp - trans[i-1].timestamp
          });
        }
      }
    });

    return rapidSequences;
  },

  // 检测大额交易
  detectLargeAmounts(data) {
    const amounts = data.edges
      .filter(edge => edge.amount)
      .map(edge => edge.amount);

    if (amounts.length === 0) return [];

    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / amounts.length
    );
    const threshold = avg + (2 * stdDev);

    return data.edges
      .filter(edge => edge.amount > threshold)
      .map(edge => ({
        ...edge,
        deviation: (edge.amount - avg) / stdDev
      }));
  },

  // 检测异常模式
  detectUnusualPatterns(data) {
    const patterns = [];
    const timeAnalysis = this.analyzeTimeSequence(data);
    const amountAnalysis = this.analyzeAmounts(data);

    // 检测周期性异常
    const hourlyAvg = timeAnalysis.patterns.hourly.reduce((a, b) => a + b, 0) / 24;
    timeAnalysis.patterns.hourly.forEach((count, hour) => {
      if (count > hourlyAvg * 3) {
        patterns.push({
          type: 'temporal',
          description: `Hour ${hour} has unusual activity (${count} transactions)`,
          severity: (count / hourlyAvg) - 1
        });
      }
    });

    // 检测金额异常
    if (amountAnalysis) {
      const amountThreshold = amountAnalysis.avg + (2 * Math.sqrt(
        amountAnalysis.distribution.buckets.reduce((a, b) => a + Math.pow(b - amountAnalysis.avg, 2), 0) /
        amountAnalysis.distribution.buckets.length
      ));

      data.edges.forEach(edge => {
        if (edge.amount > amountThreshold) {
          patterns.push({
            type: 'amount',
            description: `Unusual amount: ${edge.amount}`,
            severity: (edge.amount - amountAnalysis.avg) / amountAnalysis.avg,
            edge
          });
        }
      });
    }

    return patterns;
  },

  // 计算风险分数
  calculateRiskScores(factors) {
    const scores = {
      rapidTransactions: Math.min(factors.rapidTransactions.length * 10, 100),
      largeAmounts: Math.min(factors.largeAmounts.length * 15, 100),
      unusualPatterns: Math.min(factors.unusualPatterns.length * 20, 100)
    };

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) / 3;

    return {
      total: totalScore,
      factors: scores,
      details: factors
    };
  }
};

// 添加数据缓存管理
const CacheManager = {
  cache: new Map(),
  maxSize: 100 * 1024 * 1024, // 100MB
  currentSize: 0,

  // 添加数据到缓存
  set(key, value) {
    const size = this.getSize(value);
    if (size > this.maxSize) return false;

    // 清理空间
    while (this.currentSize + size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.delete(oldestKey);
    }

    this.cache.set(key, {
      data: value,
      size,
      timestamp: Date.now()
    });
    this.currentSize += size;
    return true;
  },

  // 从缓存获取数据
  get(key) {
    const item = this.cache.get(key);
    if (item) {
      item.timestamp = Date.now();
      return item.data;
    }
    return null;
  },

  // 删除缓存数据
  delete(key) {
    const item = this.cache.get(key);
    if (item) {
      this.currentSize -= item.size;
      this.cache.delete(key);
    }
  },

  // 计算数据大小
  getSize(data) {
    return new Blob([JSON.stringify(data)]).size;
  },

  // 清理过期缓存
  cleanup(maxAge = 3600000) { // 1小时
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.delete(key);
      }
    }
  }
};

// 数据分层处理
self.onmessage = function(e) {
  const { type, data, params } = e.data;
  
  switch(type) {
    case 'processData':
      processGraphData(data);
      break;
    case 'loadChunk':
      loadNextChunk(params.startIndex);
      break;
    case 'filterData':
      filterGraphData(params);
      break;
    case 'analyzeData':
      const analysis = {
        temporal: DataAnalyzer.analyzeTimeSequence(data),
        amounts: DataAnalyzer.analyzeAmounts(data),
        risk: DataAnalyzer.assessRisk(data)
      };
      self.postMessage({
        type: 'analysisResults',
        data: analysis
      });
      break;

    case 'calculateRisk':
      const riskAssessment = DataAnalyzer.assessRisk(data);
      self.postMessage({
        type: 'riskResults',
        data: riskAssessment
      });
      break;

    case 'findPatterns':
      const patterns = DataAnalyzer.detectUnusualPatterns(data);
      self.postMessage({
        type: 'patternResults',
        data: patterns
      });
      break;
  }
};

// 数据预处理和缓存
function processGraphData(rawData) {
  try {
    // 数据预处理
    const processedData = {
      nodes: rawData.nodes.map(node => ({
        ...node,
        id: String(node.id),
        processed: true
      })),
      edges: rawData.edges.map(edge => ({
        ...edge,
        source: String(edge.source),
        target: String(edge.target)
      }))
    };

    // 计算总块数
    const totalChunks = Math.ceil(processedData.nodes.length / CHUNK_SIZE);
    
    // 存入缓存
    dataCache.set('fullData', processedData);
    dataCache.set('totalChunks', totalChunks);
    
    // 返回第一块数据和元信息
    const firstChunk = {
      nodes: processedData.nodes.slice(0, CHUNK_SIZE),
      edges: processedData.edges.filter(edge => 
        edge.source < CHUNK_SIZE && edge.target < CHUNK_SIZE
      )
    };

    self.postMessage({
      type: 'initData',
      data: {
        chunk: firstChunk,
        meta: {
          totalNodes: processedData.nodes.length,
          totalEdges: processedData.edges.length,
          totalChunks,
          chunkSize: CHUNK_SIZE
        }
      }
    });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
}

// 加载下一块数据
function loadNextChunk(startIndex) {
  const fullData = dataCache.get('fullData');
  if (!fullData) return;

  const chunk = {
    nodes: fullData.nodes.slice(startIndex, startIndex + CHUNK_SIZE),
    edges: fullData.edges.filter(edge => {
      const sourceIndex = parseInt(edge.source);
      const targetIndex = parseInt(edge.target);
      return (sourceIndex >= startIndex && sourceIndex < startIndex + CHUNK_SIZE) ||
             (targetIndex >= startIndex && targetIndex < startIndex + CHUNK_SIZE);
    })
  };

  self.postMessage({
    type: 'chunkData',
    data: chunk,
    meta: { startIndex }
  });
}

// 数据过滤
function filterGraphData(params) {
  const fullData = dataCache.get('fullData');
  if (!fullData) return;

  const { type, value } = params;
  let filteredData;

  switch(type) {
    case 'nodeType':
      filteredData = {
        nodes: fullData.nodes.filter(node => node.type === value),
        edges: fullData.edges.filter(edge => {
          const sourceNode = fullData.nodes.find(n => n.id === edge.source);
          const targetNode = fullData.nodes.find(n => n.id === edge.target);
          return sourceNode?.type === value || targetNode?.type === value;
        })
      };
      break;
    // 可以添加其他过滤条件
  }

  self.postMessage({
    type: 'filteredData',
    data: filteredData
  });
}

// 在 dataWorker.js 中添加数据压缩功能
const CompressionManager = {
  // LZ77压缩
  compress(data) {
    const json = JSON.stringify(data);
    const compressed = this.lz77Compress(json);
    return compressed;
  },

  // LZ77解压
  decompress(compressed) {
    const json = this.lz77Decompress(compressed);
    return JSON.parse(json);
  },

  // LZ77压缩算法实现
  lz77Compress(input) {
    const output = [];
    const windowSize = 1024;
    const lookAheadSize = 64;

    for (let i = 0; i < input.length; i++) {
      const lookAhead = input.slice(i, i + lookAheadSize);
      const window = input.slice(Math.max(0, i - windowSize), i);
      
      let bestLength = 0;
      let bestOffset = 0;
      
      for (let j = 0; j < window.length; j++) {
        let length = 0;
        while (
          length < lookAhead.length && 
          window[j + length] === lookAhead[length]
        ) {
          length++;
        }
        
        if (length > bestLength) {
          bestLength = length;
          bestOffset = window.length - j;
        }
      }

      if (bestLength > 3) {
        output.push([bestOffset, bestLength, input[i + bestLength]]);
        i += bestLength;
      } else {
        output.push([0, 0, input[i]]);
      }
    }

    return output;
  },

  // LZ77解压算法实现
  lz77Decompress(compressed) {
    let output = '';
    
    compressed.forEach(([offset, length, nextChar]) => {
      if (length > 0) {
        const start = output.length - offset;
        for (let i = 0; i < length; i++) {
          output += output[start + i];
        }
      }
      output += nextChar;
    });

    return output;
  }
};