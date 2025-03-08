import hostService from '@/service/host.service';
import { period_list, parsePeriod, getAppParams, changeUnitAndVal } from '../util';
import cloneDeep from 'lodash/cloneDeep';

export default {
  id: 'datasource-host-stats-count',
  category: 'host',
  name: '主机汇总',
  type: 'object',
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

    showUnit: {
      type: Boolean,
      label: '显示单位',
      default: true,
      ctrl: 'switch',
    }
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
    return filter.split(',').filter( r => !keys || keys.some(key => r && r.startsWith(key))).map( r => {
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

    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);
    
    let requestData = [];
    let ret;
    let group_by = [];

    let options = {
      period: `${period[0]},${period[1]}`,
      fields: '',
      skip: 0
    };

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    options.filter = this.getFilter(options.filter);
    if (!options.filter) delete options.filter;

    if (Array.isArray(metrics) && metrics.length > 0) {
      options.fields = metrics.join(',');
      ret = await hostService.getHostStats(options);
      requestData = ret.data;
    }

    let result = {};
    if (params.group_by && params.group_by.length > 0) {
      if (Array.isArray(requestData) && requestData.length > 0) {
        group_by = requestData.map( r => {
          return {
            hostname: r.hostname,
            diskio_name: r.diskio_name,
            network_name: r.network_name,
            ...this.formatterRequesterResult(r, params, metrics)
          }
        })
      }
      result.group_by = group_by;
      result['default'] = {};
    } else { 
      let { names, data } = this.formatterRequesterResult(requestData[0], params, metrics);
      result = {
        default: {
          names,
          data,
          unit: ''
        }
      };
    }

    return result;
  },

  formatterRequesterResult(requestData, params, metrics) {
    const dealPersent = (val) => {
      return parseFloat(val * 100).toFixed(2);
    };

    let names = [];
    let data = [];
    let totalData;
    let value;
      metrics.forEach(m => {
        let metricinfo = this.metrics[m];
        names.push({
          name: metricinfo.label,
          key: m
        });
        totalData = requestData || {};
        const percent_metrics = ['cpu_percent', 'system_percent', 'softirq_percent', 'steal_percent', 'irq_percent', 'iowait_percent', 'user_percent', 'nice_percent', 'swap_used_percent', 'retransmiss'];
        let find_percent_metric = percent_metrics.find(r => r === m);

        if (find_percent_metric) {
          value = params.showUnit ? dealPersent(totalData[m]) + metricinfo?.unit : dealPersent(totalData[m]);
        } else {
          const changeData = changeUnitAndVal(totalData[m], metricinfo?.unit);
          value = params.showUnit ? changeData.val + '' + changeData.unit : changeData.val;
        }
        data.push(value)
      })
      return {
        names,
        data,
      }
  },

  transformer: '',
}