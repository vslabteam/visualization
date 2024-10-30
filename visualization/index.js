const graph = new G6.Graph({
  container: 'container',
  // 其他配置...
});

// 如果需要注册自定义节点，在 4.8 版本中应该这样写：
G6.registerNode('yourNodeType', {
  draw(cfg, group) {
    // 绘制节点的逻辑
    const shape = group.addShape('circle', {
      attrs: {
        x: 0,
        y: 0,
        r: 20,
        fill: '#91d5ff',
        // ...其他属性
      },
    });
    return shape;
  },
}); 