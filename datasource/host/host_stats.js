import hostService from '@/service/host.service';
import { 
  period_list, 
  parsePeriod, 
  getAppParams, 
  getStatesResultGroupBy, 
  mergeStatesGroupBy, 
  hostSortOptions,
  changeUnitAndVal
} from '../util';
import cloneDeep from 'lodash/cloneDeep';

export default {
  id: 'datasource-host-stats',
  category: 'host',
  name: '主机TOP',
  type: 'object',
  multiMetric: true,
  order: 9,
  arguments: {
    period: {
      type: Number,
      label: '时间',
      ctrl: 'select-and-time',
      default: 5 * 60 * 1000,
      options: period_list,
      required: true,
      validator: function (value) {
        return true;
      },
    },

    hostname: {
      type: String,
      label: '主机',
      ctrl: 'select',
      options: async function() {
        if (this.host_options) {
          return this.host_options;
        }
        const defaultTime = 30 * 24 * 60 * 60 * 1000;
        const period = parsePeriod(defaultTime);

        let options = {
          period: `${period[0]},${period[1]}`,
          group_by: 'hostname',
          skip: 0
        };

        const hosts = await hostService.getHostStats(options);
        const data = hosts.data;
        let result = [];
        if (Array.isArray(data) && data.length > 0) {
          result = data.map(r => {
            return {
              label: r.hostname,
              value: r.hostname
            }
          })
        }
        this.host_options = result;
        return result;
      },
      required: true,
      output: true,
    },
    diskio_name: {
      type: String,
      label: '磁盘',
      ctrl: 'multiple-select',
      dependencies: ['hostname'],
      options: async function (arg) {
        if (!arg) {
          return [];
        }


        if (this.disk_options && this.hostname_cache && JSON.stringify(this.hostname_disk_cache) === JSON.stringify(arg)) {
          return this.disk_options;
        }

        this.hostname_disk_cache = cloneDeep(arg);
        
        let filter = Array.isArray(arg) ? arg.map( r =>  `hostname=${r}`).join(',') : `hostname=${arg}`;

        const defaultTime = 30 * 24 * 60 * 60 * 1000;
        const period = parsePeriod(defaultTime);
        let result = [];
        let options = {
          period: `${period[0]},${period[1]}`,
          filter: `${filter},diskio_count=1`,
          group_by: 'diskio_name,hostname',
          skip: 0
        };

        const ret = await hostService.getHostStats(options);
        const data = ret && Array.isArray(ret.data) ? ret.data : [];
        if (Array.isArray(data) && data.length > 0) {
          result = data.map(r => {
            return {
              label: r.hostname + '/' + r.diskio_name,
              value: r.hostname + '/' + r.diskio_name
            }
          })

          this.disk_options = result;
        }

        return result;
      },
      required: false,
    },
    network_name: {
      type: String,
      label: '网卡',
      ctrl: 'multiple-select',
      dependencies: ['hostname'],
      options: async function (arg) {
        if (!arg) {
          return [];
        }

        if (this.network_options && this.hostname_cache && JSON.stringify(this.hostname_net_cache) === JSON.stringify(arg)) {
          return this.network_options;
        }
        
        this.hostname_net_cache =  cloneDeep(arg);

        let filter = Array.isArray(arg) ? arg.map( r =>  `hostname=${r}`).join(',') : `hostname=${arg}`;

        const defaultTime = 30 * 24 * 60 * 60 * 1000;
        const period = parsePeriod(defaultTime);
        let result = [];
        let options = {
          period: `${period[0]},${period[1]}`,
          filter: `${filter},network_count=1`,
          group_by: 'network_name,hostname',
          skip: 0
        };

        const ret = await hostService.getHostStats(options);
        const data = ret && Array.isArray(ret.data) ? ret.data : [];
        if (Array.isArray(data) && data.length > 0) {
          result = data.map(r => {
            return {
              label: r.hostname + '/' + r.network_name,
              value: r.hostname + '/' + r.network_name
            }
          })

          this.network_options = result;
        }

        return result;
      },
      required: false,
    },

    sort: {
      type: String,
      label: '排序',
      ctrl: 'select',
      default: hostSortOptions[0].value,
      options: hostSortOptions
    },

    showUnit: {
      type: Boolean,
      label: '显示单位',
      default: false,
      ctrl: 'switch',
    },
    limit: {
      type: Number,
      label: '数量',
      ctrl: 'input',
      default: 10,
      min: 1,
    },
  },
  metrics: {
    cpu_percent: {
      type: Number,
      label: 'CPU使用率',
      unit: '%',
      dsType: 'cpu'
    },
    system_percent: {
      type: Number,
      label: '系统CPU使用率',
      unit: '%',
      dsType: 'cpu'
    },
    softirq_percent: {
      type: Number,
      label: '软中断CPU使用率',
      unit: '%',
      dsType: 'cpu'
    },
    steal_percent: {
      type: Number,
      label: '其他虚拟系统CPU使用率',
      unit: '%',
      dsType: 'cpu'
    },
    irq_percent: {
      type: Number,
      label: '中断CPU使用率',
      unit: '%',
      dsType: 'cpu'
    },
    iowait_percent: {
      type: Number,
      label: 'CPU IO等待时间占比',
      unit: '%',
      dsType: 'cpu'
    },
    user_percent: {
      type: Number,
      label: '用户态CPU使用率',
      unit: '%',
      dsType: 'cpu'
    },
    nice_percent: {
      type: Number,
      label: '负优先级CPU时间占比',
      unit: '%',
      dsType: 'cpu'
    },
    load_one: {
      type: Number,
      label: '1分钟系统负载',
      unit: '',
      dsType: 'cpu'
    },
    load_five: {
      type: Number,
      label: '5分钟系统负载',
      unit: '',
      dsType: 'cpu'
    },
    load_fifteen: {
      type: Number,
      label: '15分钟系统负载',
      unit: '',
      dsType: 'cpu'
    },
    
    used_memory: {
      type: Number,
      label: '内存使用量',
      unit: 'Bytes',
      dsType: 'memory'
    },
    memory_total: {
      type: Number,
      label: '内存总量',
      unit: 'Bytes',
      dsType: 'memory'
    },
    memory_percent: {
      type: Number,
      label: '内存使用率',
      unit: '%',
      dsType: 'memory'
    },
    cached_memory: {
      type: Number,
      label: '缓存内存',
      unit: 'Bytes',
      dsType: 'memory'
    },
    free_memory: {
      type: Number,
      label: '空闲内存',
      unit: 'Bytes',
      dsType: 'memory'
    },
    swap_used: {
      type: Number,
      label: 'Swap使用量',
      unit: 'Bytes',
      dsType: 'memory'
    },
    swap_total: {
      type: Number,
      label: 'Swap总量',
      unit: 'Bytes',
      dsType: 'memory'
    },
    swap_used_percent: {
      type: Number,
      label: 'Swap使用率',
      unit: '%',
      dsType: 'memory'
    },
    diskio_read_bytes: {
      type: Number,
      label: '磁盘读取字节数',
      unit: 'Bytes/s',
      dsType: 'disk'
    },
    diskio_write_bytes: {
      type: Number,
      label: '磁盘写入字节数',
      unit: 'Bytes/s',
      dsType: 'disk'
    },
    diskio_iops: {
      type: Number,
      label: '每秒磁盘IO次数',
      unit: 'iops',
      dsType: 'disk'
    },
    diskio_read_delay: {
      type: Number,
      label: '磁盘读取时延',
      unit: 'ms',
      dsType: 'disk'
    },
    diskio_write_delay: {
      type: Number,
      label: '磁盘写入时延',
      unit: 'ms',
      dsType: 'disk'
    },
    network_out_bytes: {
      type: Number,
      label: '网络发送字节数',
      unit: 'bit/s',
      dsType: 'network'
    },
    network_in_bytes: {
      type: Number,
      label: '网络接收字节数',
      unit: 'bit/s',
      dsType: 'network'
    },
    network_in_packets: {
      type: Number,
      label: '网络接收数据包数',
      unit: 'Packets/s',
      dsType: 'network'
    },
    network_out_packets: {
      type: Number,
      label: '网络发送数据包数',
      unit: 'Packets/s',
      dsType: 'network'
    },
    network_out_dropped: {
      type: Number,
      label: '网络数据发送丢包数',
      unit: 'Packets/s',
      dsType: 'network'
    },
    network_in_dropped: {
      type: Number,
      label: '网络数据接收丢包数',
      unit: 'Packets/s',
      dsType: 'network'
    },
    network_out_errors: {
      type: Number,
      label: '网络数据发送错误率',
      unit: 'Packets/s',
      dsType: 'network'
    },
    network_in_errors: {
      type: Number,
      label: '网络数据接收错误率',
      unit: 'Packets/s',
      dsType: 'network'
    },
    retransmiss: {
      type: Number,
      label: 'TCP重传率',
      unit: '%',
      dsType: 'network'
    },
    curr_estab: {
      type: Number,
      label: 'TCP当前建连数',
      unit: '个',
      dsType: 'network'
    },
    active_opens: {
      type: Number,
      label: 'TCP主动连接速率',
      unit: '次/s',
      dsType: 'network'
    },
    passive_opens: {
      type: Number,
      label: 'TCP被动连接速率',
      unit: '次/s',
      dsType: 'network'
    }
  },
  
  checkArguments(args, metrics) {
    let self = this;
    let result = {
      data: true
    };
    Object.keys(self.arguments).forEach(arg => {
      if (!result.data) { return }

      if (self.arguments[arg].required) {
        let find = args.find(r => r.arg === arg);
        if (find && Array.isArray(find.val) && find.val.length === 0) {
          result.data = false;
        } else {
          if (!find || !find.val) {
            result.data = false;
          }
        }

        if (find && self.arguments[arg].validator) {
          result.data = self.arguments[arg].validator(find.val);
        }
      }
    });

    this.isHide(metrics, 'network_name');
    this.isHide(metrics, 'diskio_name');

    return result;
  },

  isHide(metrics, arg) {
    metrics = Array.isArray(metrics) ? metrics : [];
    let self = this;
    if (arg === 'network_name') {
      self.arguments.network_name.hide = !metrics.some(kpi => self.metrics[kpi]?.dsType === 'network');
      return self.arguments.network_name.hide;
    } else if (arg === 'diskio_name') {
      self.arguments.diskio_name.hide = !metrics.some(kpi => self.metrics[kpi]?.dsType === 'disk');
      return self.arguments.diskio_name.hide;
    }
  },

  bindArgValue(args) {
    let result = {};
    args.forEach(r => {
      result[r.arg] = r.val;
    });
    return result;
  },

  getFilter(filter, keys) {
    return filter.split(',').filter( r => keys.some(key => r && r.startsWith(key))).map( r => {
      let key = r.split('=')[0];
      let value = r.split('=')[1];
      value = value.split('/')[1] || value.split('/')[0];
      return key + '=' + value;
    }).join(',')
  },

  requester: async function(args, metrics) {
    let argData = this.checkArguments(args, metrics);
    if (!argData.data) {
      return argData;
    }

    if (!metrics || metrics.length === 0) {
      return { default : { names: [], data: [] } };
    }

    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);

    const dsType = {};
    metrics.forEach(r => {
      let type = '';
      this.metrics[r]?.dsType === 'disk' && (type = 'diskio_name');
      this.metrics[r]?.dsType === 'network' && (type = 'network_name');
      !dsType[type] && (dsType[type] = []);
      dsType[type].push(r);
    });
    const tops = Object.keys(dsType);

    let result = {};
    let group_by = [];
    let sort = params.sort || '';

    for (let top of tops) {
      let options = {
        period: `${period[0]},${period[1]}`,
        fields: '',
        group_by: top,
        skip: 0,
        limit: params.limit,
      };
  
      sort && (options.sort = sort);
  
      let appParams = await getAppParams(params, options, this.arguments);
      options = appParams.options;
      options.fields = metrics.join(',');
      if (sort && Array.isArray(metrics) && !metrics.includes(sort)) {
        options.fields = options.fields ? `${options.fields},${sort}` : sort;
      }

      const kpis = dsType[top];
      let keys = top === 'diskio_name' ? ['hostname=', 'diskio_name='] : ['hostname=', 'network_name='];
      options.filter = this.getFilter(options.filter, keys);
      const ret = await hostService.getHostStats(options);
      if (params.group_by) {
        let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) => {
          const kpidata = {};
          kpis.forEach(kpi => {
            kpidata[kpi] = {
              names: item.data.map(r => r[top] || '--'),
              data: item.data.map(r => r[kpi]),
              showValue: item.data.map(r => this.formDataValue(kpi, true, r[kpi])),
            }
          });

          return kpidata;
        });
        group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, kpis);
      } else {
        kpis.forEach(kpi => {
          result[kpi] = {
            names: ret.data.map(r => r[top] || '--'),
            data: ret.data.map(r => r[kpi]),
            showValue: ret.data.map(r => this.formDataValue(kpi, true, r[kpi])),
          };
        });
      }
    }
    
    if (params.group_by) {
      return {
        group_by: group_by,
      };
    } else {
      return result;
    }
  },

  formDataValue(kpi, showUnit, val) {
    const dealPersent = (val) => {
      return parseFloat(val * 100).toFixed(2);
    };

    const percent_metrics = ['cpu_percent', 'system_percent', 'softirq_percent', 'steal_percent', 'irq_percent', 'iowait_percent', 'user_percent', 'nice_percent', 'swap_used_percent', 'retransmiss'];
    const find_percent_metric = percent_metrics.find(r => r === kpi);
    const metricinfo = this.metrics[kpi];
    let value;
    if (find_percent_metric) {
      value = showUnit ? dealPersent(val) + metricinfo?.unit : dealPersent(val);
    } else {
      const changeData = changeUnitAndVal(val, metricinfo?.unit);
      value = showUnit ? changeData.val + '' + changeData.unit : changeData.val;
    }
    return value;
  },

  transformer: '',
}