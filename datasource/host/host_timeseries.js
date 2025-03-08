import hostService from '@/service/host.service';
import { period_list, parsePeriod, getAppParams } from '../util';
import periodService from '@/service/period';
import { cloneDeep } from 'lodash';

export default {
  id: 'datasource-host-timeseries',
  category: 'host',
  name: '主机时序',
  type: 'array',
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

    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);
    
    let result = {};
    let granularity = periodService.getGranularity(period[0], period[1]);
    const disk_metrics = ['diskio_write_bytes', 'diskio_read_bytes', 'diskio_write_delay', 'diskio_read_delay', 'diskio_iops'];
    const network_metrics = ['network_out_bytes', 'network_in_bytes', 'network_in_packets', 'network_out_packets', 'network_out_dropped', 'network_in_dropped', 'network_out_errors', 'network_in_errors'];
    const tcp_metrics = ['retransmiss'];
    let requestDiskParams = [];
    let requestNetParams = [];
    let requestTcpParams = [];
    let requestParams = [];
    let requestDiskData = [];
    let requestNetData = [];
    let requestTcpData = [];
    let requestData = [];
    let ret;
    
    // 从disk_metrics找出metrics中有的磁盘指标 统一请求
    metrics.forEach(m => {
      let find_disk = disk_metrics.find(r => r === m);
      let find_net = network_metrics.find(r => r === m);
      let find_tcp = tcp_metrics.find(r => r === m);
      if (find_disk) {
        requestDiskParams.push(m);
      } else if(find_net) {
        requestNetParams.push(m);
      } else if (find_tcp) {
        requestTcpParams.push(m);
      } else {
        requestParams.push(m);
      }
    });

    let options = {
      period: `${period[0]},${period[1]}`,
      granularity,
      fields: '',
      filter: `hostname=${params.hostname}`,
      skip: 0
    };

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let filter = options.filter || '';
    
    let groups = {};
    if (requestParams.length > 0) {
      options.fields = requestParams.join(',');
      let keys = ['hostname='];
      options.filter = this.getFilter(filter, keys);
      ret = await hostService.getHostStatsTimeseries(options);
      requestData = ret.data;
    }

    if (requestDiskParams.length > 0) {
      options.fields = requestDiskParams.join(',');
      let keys = ['hostname=', 'diskio_name='];
      options.filter = this.getFilter(filter, keys);
      ret = await hostService.getHostStatsTimeseries(options);
      requestDiskData = ret.data;
    }

    if (requestNetParams.length > 0) {
      options.fields = requestNetParams.join(',');
      let keys = ['hostname=', 'network_name='];
      options.filter = this.getFilter(filter, keys);
      ret = await hostService.getHostStatsTimeseries(options);
      requestNetData = ret.data;
    }

    if (requestTcpParams.length > 0) {
      options.fields = requestTcpParams.join(',');
      let keys = ['hostname='];
      options.filter = this.getFilter(filter, keys);
      options.filter = options.filter ? options.filter + `,network_summary_count=1` : `network_summary_count=1`;
      ret = await hostService.getHostStatsTimeseries(options);
      requestTcpData = ret.data;
    }

    const dealPersent = (val) => {
      return parseFloat(val * 100).toFixed(2);
    };

    const dealFloat = (val) => {
      return parseFloat(val || 0).toFixed(2);
    };

    const getLevelUnitVal = (val, lv) => {
      for (let i = 0; i < lv; i++) {
        val = val / 1024;
      }
      return parseFloat(val || 0).toFixed(2);
    }

    const changeUnitAndVal = (val, unit) => {
      if (val < 1024) {
        return {
          val: parseFloat(val || 0).toFixed(2),
          unit: unit
        }
      }
      val = val / 1024;
      if (val < 1024) {
        return {
          val: parseFloat(val || 0).toFixed(2),
          unit: 'K' + unit,
          lv: 1,
        }
      } else {
        val = val / 1024;
        if (val < 1024) {
          return {
            val: parseFloat(val || 0).toFixed(2),
            unit: 'M' + unit,
            lv: 2
          }
        }else {
          val = val / 1024;
          if (val < 1024) {
            return {
              val: parseFloat(val || 0).toFixed(2),
              unit: 'G' + unit,
              lv: 3
            }
          } else {
            val = val / 1024;
            if (val < 1024) {
              return {
                val: parseFloat(val || 0).toFixed(2),
                unit: 'T' + unit,
                lv: 4
              }
            } else {
              val = val / 1024;
              if (val < 1024) {
                return {
                  val: parseFloat(val || 0).toFixed(2),
                  unit: 'P' + unit,
                  lv: 5
                }
              } else {
                val = val / 1024;
                if (val < 1024) {
                  return {
                    val: parseFloat(val || 0).toFixed(2),
                    unit: 'E' + unit,
                    lv: 6
                  }
                } else {
                  val = val / 1024;
                  return {
                    val: parseFloat(val || 0).toFixed(2),
                    unit: 'Z' + unit,
                    lv: 7
                  }
                }
              }
            }
          }
        }
      }
    };

    if (Array.isArray(requestData) && requestData.length > 0) {
      //时序数据每个点要统一单位换算
      const kpiUnits = {};
      metrics.forEach(m => {
        const metricinfo = this.metrics[m];
        if (metricinfo?.unit && metricinfo?.unit !== '%') {
          const maxVal = Math.max(...requestData.map(r => r[m]));
          console.log('maxVal', maxVal);
          const {unit, lv} = changeUnitAndVal(maxVal, metricinfo?.unit);
          console.log('unit', unit);
          console.log('lv', lv);
          kpiUnits[m] = {unit, lv};
        }
      });
      const data = requestData.map(r => {
        let value = {timestamp: r.timestamp, network_name: r.network_name, diskio_name: r.diskio_name, hostname: r.hostname };
        metrics.forEach(m => {
          let metricinfo = this.metrics[m];
          let find = requestParams.find(item => item === m);
          if (find) {
            if (m === 'cpu_percent' || m === 'memory_percent') {
              value[m] = [r.timestamp, dealPersent(r[m]) || 0];
              value[`${m}_unit`] = metricinfo?.unit;
            }
            else {
              let unit = metricinfo?.unit;
              if (unit == '%') {
                value[m] = [r.timestamp, dealFloat(r[m]) || 0];
                value[`${m}_unit`] = metricinfo?.unit;
              } else {
                const {unit, lv} = kpiUnits[m] || {};
                const val = getLevelUnitVal(r[m], lv);
                value[m] = [r.timestamp, val || 0];
                value[`${m}_unit`] = unit;
              }
              
            }
          }
        })
        return value;
      })

      if (params.group_by) {
        groups['request'] = data;
      } else {
        result = data;
      }
    }

    if (Array.isArray(requestDiskData) && requestDiskData.length > 0) {
      const kpiUnits = {};
      metrics.forEach(m => {
        const metricinfo = this.metrics[m];
        if (metricinfo?.unit && metricinfo?.unit !== '%') {
          const maxVal = Math.max(...requestDiskData.map(r => r[m]));
          const {unit, lv} = changeUnitAndVal(maxVal, metricinfo?.unit);
          kpiUnits[m] = {unit, lv};
        }
      });

      const data = requestDiskData.map(r => {
        let value = {timestamp: r.timestamp, network_name: r.network_name, diskio_name: r.diskio_name, hostname: r.hostname };
        metrics.forEach(m => {
          let metricinfo = this.metrics[m];
          let find = requestDiskParams.find(item => item === m);
          if (find) {
            let unit = metricinfo?.unit;
            if (unit == '%') {
              value[m] = [r.timestamp, dealFloat(r[m]) || 0];
              value[`${m}_unit`] = metricinfo?.unit;
            } else {
              const {unit, lv} = kpiUnits[m] || {};
              const val = getLevelUnitVal(r[m], lv);
              value[m] = [r.timestamp, val || 0];
              value[`${m}_unit`] = unit;
            }
          }
        })
        return value;
      })

      if (params.group_by) {
        groups['requestDisk'] = data;
      } else {
        if (Array.isArray(result)) {
          result = result.map((r, idx) => {
            return {
              ...r,
              ...data[idx]
            }
          });
        } else {
          result = data;
        }
      }
    }

    if (Array.isArray(requestNetData) && requestNetData.length > 0) {
      const kpiUnits = {};
      metrics.forEach(m => {
        const metricinfo = this.metrics[m];
        if (metricinfo?.unit && metricinfo?.unit !== '%') {
          const maxVal = Math.max(...requestNetData.map(r => r[m]));
          const {unit, lv} = changeUnitAndVal(maxVal, metricinfo?.unit);
          kpiUnits[m] = {unit, lv};
        }
      });
      const data = requestNetData.map(r => {
        let value = {timestamp: r.timestamp, network_name: r.network_name, diskio_name: r.diskio_name, hostname: r.hostname };
        metrics.forEach(m => {
          let metricinfo = this.metrics[m];
          let find = requestNetParams.find(item => item === m);
          if (find) {
            let unit = metricinfo?.unit;
            if (unit == '%') {
              value[m] = [r.timestamp, dealFloat(r[m]) || 0];
              value[`${m}_unit`] = metricinfo?.unit;
            } else {
              const {unit, lv} = kpiUnits[m] || {};
              const val = getLevelUnitVal(r[m], lv);
              value[m] = [r.timestamp, val || 0];
              value[`${m}_unit`] = unit;
            }
          }
        })
        return value;
      })

      if (params.group_by) {
        groups['requestNet'] = data;
      } else {
        if (Array.isArray(result)) {
          result = result.map((r, idx) => {
            return {
              ...r,
              ...data[idx]
            }
          });
        } else {
          result = data;
        }
      }
    }

    if (Array.isArray(requestTcpData) && requestTcpData.length > 0) {
      const kpiUnits = {};
      metrics.forEach(m => {
        const metricinfo = this.metrics[m];
        if (metricinfo?.unit && metricinfo?.unit !== '%') {
          const maxVal = Math.max(...requestTcpData.map(r => r[m]));
          const {unit, lv} = changeUnitAndVal(maxVal, metricinfo?.unit);
          kpiUnits[m] = {unit, lv};
        }
      });
      const data = requestTcpData.map(r => {
        let value = {timestamp: r.timestamp, network_name: r.network_name, diskio_name: r.diskio_name, hostname: r.hostname };
        metrics.forEach(m => {
          let metricinfo = this.metrics[m];
          let find = requestTcpParams.find(item => item === m);
          if (find) {
            let unit = metricinfo?.unit;
            if (unit == '%') {
              value[m] = [r.timestamp, dealFloat(r[m]) || 0];
              value[`${m}_unit`] = metricinfo?.unit;
            } else {
              const {unit, lv} = kpiUnits[m] || {};
              const val = getLevelUnitVal(r[m], lv);
              value[m] = [r.timestamp, val || 0];
              value[`${m}_unit`] = unit;
            }
          }
        })
        return value;
      })

      if (params.group_by) {
        groups['requestTcp'] = data;
      } else {
        if (Array.isArray(result)) {
          result = result.map((r, idx) => {
            return {
              ...r,
              ...data[idx]
            }
          });
        } else {
          result = data;
        }
      }
    }

    if (params.group_by) {
      let filters = params.group_by.split(',');
      // let filters = [];
      filters.push('timestamp');
      let result = [];
      Object.values(groups).forEach(group_arr => {
        group_arr.forEach( group => {
          let items = result;
          filters.forEach(by => {
            items = items.filter( item => item[by] === group[by]);
          })
          items = items[0]
          if (items) {
            Object.keys(group).filter( key => !key.endsWith('_unit') && !key.endsWith('timestamp')).forEach(key => {
              items[key] = group[key];
              items[key + '_unit'] = group[key + '_unit'];
              items['filter-' + key] = true;
            })
          } else {
            let item_group = cloneDeep(group);
            Object.keys( group).filter( key => !key.endsWith('_unit') && !key.endsWith('timestamp')).forEach( key => {
              item_group['filter-' + key] = true;
            })
            item_group.merge = true;
            result.push(item_group);
          }
        })
      })
      result = result.sort( (a,b) => a.timestamp - b.timestamp);
      return result;
    } else {
      return result;
    }
  },

  transformer: '',
}