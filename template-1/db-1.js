const scene = require('./db-1.json');

const nodes = scene.nodes;

const layout_nodes = nodes.map((node) => {
  return {
    // id: '',
    // dashboardId: '',
    // type: '',
    // ver: '',
    // name: '',
    // isHide: '',
    // isLock: '',
    // container: '',
    // properties: {},
    z: node.z,
    x: node.x,
    y: node.y,
    w: node.w,
    h: node.h
  }
});

const new_layout_nodes = layout_nodes.splice(0, 6);
console.log('这是我的 nodes JSON', '>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
console.log(JSON.stringify(new_layout_nodes))

const charts = {};

nodes.forEach(node => {
  const prev_n = charts[node.type];
  if (prev_n?.properties.dataSource?.length) return;
  if (prev_n?.properties.databind?.leng) return;

  let n = node;
  if (n.properties) {
    n.properties = JSON.parse(n.properties);
  }

  delete n.z;
  delete n.x;
  delete n.y;
  delete n.w;
  delete n.h;
  delete n.name;
  delete n.isHide;
  delete n.isLock;
  delete n.dashboardId;
  delete n.id;
  delete n.ver;

  charts[node.type] = node;
});


console.log('这是我的 数据源 和 数据绑定 JSON', '>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
Object.values(charts).forEach(n => {
  console.log('chart databind and dataSource ======================================================================================================================== start')
  console.log('type=' + n.type, 'node.properties.databind', JSON.stringify(n.properties.databind))
  console.log('-----------------------------------------------------------------------------------------------------------------------------------------------------------')
  console.log('type=' + n.type, 'node.properties.dataSource', JSON.stringify(n.properties.dataSource))
  console.log('chart databind and dataSource ======================================================================================================================== end')
});

// 这是我的图标类型
console.log('这是我的图表类型 JSON', '>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
Object.values(charts).forEach(n => {
  n.properties.databind = [];
  n.properties.dataSource = [];
  console.log('chart JSON ======================================================================================================================== start')
  console.log('type=' + n.type, JSON.stringify(n))
  console.log('chart JSON ======================================================================================================================== end')
});

// console.log('node Charts', JSON.stringify(charts))
// console.log('node Chart Types', JSON.stringify(Object.keys(charts)))


const chartTypes = [
  'chartBar'
]
