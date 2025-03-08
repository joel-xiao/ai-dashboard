
import agentService from '@/service/agent.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy, getMetrics, joinDataLabel, getAppMetricValue } from '../util';
import { getAppsysOptions, getAppOptions, getAgentOptions } from '../apm_options';
import { memFormat, formatNumber } from '@/service/util';
import periodService from '@/service/period';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-agent-jvm-states--v2',
  category: 'application',
  name: '探针JVM统计',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 9,
  arguments: {
    appsysid: {
      type: String,
      label: '应用系统ID',
      ctrl: 'multiple-select',
      APPLICAION_TYPES,
      options: async function() {
        const { result, cache } = await getAppsysOptions(this.appsys_options, APPLICAION_TYPES);
        this.appsys_options = cache;
        return result;
      },
      required: true,
      output: true,
    },
    
    appid: {
      type: String,
      label: '应用ID',
      ctrl: 'multiple-select-cascader',
      APPLICAION_TYPES,
      dependencies: ['appsysid'],
      options: async function(appsysid) {
        const {
          result,
          cache,
          sys_cache,
         } = await getAppOptions(
            appsysid, 
            this.appsys_options, 
            this.app_options,
            APPLICAION_TYPES
          );
        
        this.appsys_options = sys_cache;
        this.app_options = cache;
        return result;
      },
      required: true,
      output: true,
    },

    agentid: {
      type: String,
      label: '实例',
      ctrl: 'select-cascader',
      dependencies: ['appid'],
      options: async function(appid) {
        const { result, cache } = await getAgentOptions(appid, this.agents);
        this.agents = cache;
        return result;
      }
    },

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

    limit: {
      type: Number,
      label: '数量',
      ctrl: 'input',
      default: 10,
      min: 1,
    },
  },
  metrics: {
    appsysid: {
      type: String,
      label: '应用系统',
      isDim: true,
    },
    appid: {
      type: String,
      label: '应用',
      isDim: true,
    },
    
    agentid: {
      type: String,
      label: '应用实例',
      isDim: true,
    },

    max_heap_max: {
      type: Number,
      label: '最大堆内存',
      unit: 'B'
    }, 
    max_heap_used: {
      type: Number,
      label: '最大已使用堆内存',
      unit: 'B'
    }, 
    min_heap_used: {
      type: Number,
      label: '最小已使用堆内存',
      unit: 'B'
    }, 
    avg_heap_used: {
      type: Number,
      label: '平均已使用堆内存',
      unit: 'B'
    }, 
    
    max_non_heap_total: {
      type: Number,
      label: '最大非堆内存',
      unit: 'B'
    }, 
    max_non_heap_used: {
      type: Number,
      label: '最大已使用非堆内存',
      unit: 'B'
    }, 
    min_non_heap_used: {
      type: Number,
      label: '最小已使用非堆内存',
      unit: 'B'
    }, 
    avg_non_heap_used: {
      type: Number,
      label: '平均已使用非堆内存',
      unit: 'B'
    }, 
    
    max_perm_gen_max: {
      type: Number,
      label: '最大永久代内存',
      unit: 'B'
    }, 
    max_perm_gen_used: {
      type: Number,
      label: '最大已使用永久代内存',
      unit: 'B'
    }, 
    min_perm_gen_used: {
      type: Number,
      label: '最小已使用永久代内存',
      unit: 'B'
    }, 
    avg_perm_gen_used: {
      type: Number,
      label: '平均已使用永久代内存',
      unit: 'B'
    }, 
    
    /*
    max_non_heap_committed: {
      type: Number,
      label: '最大非堆内存分配',
    }, 
    min_non_heap_committed: {
      type: Number,
      label: '最小非堆内存分配',
    }, 
    avg_non_heap_committed: {
      type: Number,
      label: '平均非堆内存分配',
    }, */
    
    max_survivor_space_max: {
      type: Number,
      label: '最大幸存区',
      unit: 'B'
    }, 
    max_survivor_space_used: {
      type: Number,
      label: '最大已使用幸存区',
      unit: 'B'
    }, 
    min_survivor_space_used: {
      type: Number,
      label: '最小已使用幸存区',
      unit: 'B'
    }, 
    avg_survivor_space_used: {
      type: Number,
      label: '平均已使用幸存区',
      unit: 'B'
    }, 
    
    max_metaspace_total: {
      type: Number,
      label: '最大元空间',
      unit: 'B'
    }, 

    max_metaspace_committed: {
      type: Number,
      label: '最大元空间分配',
      unit: 'B'
    }, 
    min_metaspace_committed: {
      type: Number,
      label: '最小元空间分配',
      unit: 'B'
    }, 
    avg_metaspace_committed: {
      type: Number,
      label: '平均元空间分配',
      unit: 'B'
    }, 
    max_metaspace_used: {
      type: Number,
      label: '最大已使用元空间',
      unit: 'B'
    }, 
    min_metaspace_used: {
      type: Number,
      label: '最小已使用元空间',
      unit: 'B'
    }, 
    avg_metaspace_used: {
      type: Number,
      label: '平均已使用元空间',
      unit: 'B'
    },

    max_old_gen_max: {
      type: Number,
      label: '最大年老代内存',
      unit: 'B'
    },
    max_old_gen_used: {
      type: Number,
      label: '最大已使用年老代内存',
      unit: 'B'
    }, 
    min_old_gen_used: {
      type: Number,
      label: '最小已使用年老代内存',
      unit: 'B'
    }, 
    avg_old_gen_used: {
      type: Number,
      label: '平均已使用年老代内存',
      unit: 'B'
    }, 

    max_new_gen_max: {
      type: Number,
      label: '最大年轻代内存',
      unit: 'B'
    },
    max_new_gen_used: {
      type: Number,
      label: '最大已使用年轻代内存',
      unit: 'B'
    }, 
    min_new_gen_used: {
      type: Number,
      label: '最小已使用年轻代内存',
      unit: 'B'
    }, 
    avg_new_gen_used: {
      type: Number,
      label: '平均已使用年轻代内存',
      unit: 'B'
    },
    
    max_jvm_cpu: {
      type: Number,
      label: '最大CPU百分比',
      unit: '%'
    }, 
    min_jvm_cpu: {
      type: Number,
      label: '最小CPU百分比',
      unit: '%'
    }, 
    avg_jvm_cpu: {
      type: Number,
      label: '平均CPU百分比',
      unit: '%'
    }, 
    max_sys_cpu: {
      type: Number,
      label: '最大系统CPU百分比',
      unit: '%'
    }, 
    min_sys_cpu: {
      type: Number,
      label: '最小系统CPU百分比',
      unit: '%'
    }, 
    avg_sys_cpu: {
      type: Number,
      label: '平均系统CPU百分比',
      unit: '%'
    }, 
    fgc_count: {
      type: Number,
      label: 'FGC 次数',
      unit: '次'
    },
    fgc_time: {
      type: Number,
      label: 'FGC Time',
      unit: 'ms'
    },
  },
  
  checkArguments(args) {
    let self = this;
    let result = true;
    Object.keys(self.arguments).forEach(arg => {
      if (!result) { return }

      if (self.arguments[arg].required) {
        let find = args.find(r => r.arg === arg);
        if (find && Array.isArray(find.val) && find.val.length === 0) {
          result = false;
        } else {
          if (!find || !find.val) {
            result = false;
          }
        }

        if (find && self.arguments[arg].validator) {
          result = self.arguments[arg].validator(find.val);
        }
      } else {
        let find = args.find(r => r.arg === arg);
        if (find && self.arguments[arg].validator) {
          result = self.arguments[arg].validator(find.val);
        }
      }
    });

    return result;
  },

  bindArgValue(args) {
    let result = {};
    args.forEach(r => {
      result[r.arg] = r.val;
    });
    return result;
  },

  requester: async function(args, metrics) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    const metric_params = getMetrics(metrics, this.metrics);
    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};
    let options = {
      period: `${period[0]},${period[1]}`,
      group_by: metric_params.dimensions.filter( r =>  r !== 'error_label' && r !== 'name').join(','),
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    let group_by = [];

    for (let metric of metric_params.metrics) {
      options.fields = metric;
      options.sort = metric;

      let ret = await agentService.fetchJvmStatsTops(appid, '_all', options, false);
      if (ret.result === 'ok') {
        (ret.data || []).forEach(r => {
          if (r.appsysid) {
            r.appsysid_prim = r.appsysid
            r.appsysid = r?.appsysname || r.appsysid;
          }
        })

        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) =>{
            return { 
              [metric]: {
              names: item.data.map(r => joinDataLabel(r, metric_params.dimensions)),
              data: item.data.map(r => getAppMetricValue(r, metric)),
              showValue: item.data.map(r =>  getAppMetricValue(r, metric)),
            }}
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [metric]);

        } else {
          result[metric] = {
            names: ret.data.map(r => joinDataLabel(r, metric_params.dimensions)),
            data: ret.data.map(r => getAppMetricValue(r, metric)),
            showValue: ret.data.map(r => this.kpi_format[this.metrics[metric].unit](getAppMetricValue(r, metric, undefined, this.metrics[metric], false))),
          };
        }
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

  kpi_format: {
    '%': function(val) {
      val = (val > 0.01 ? 
        (Math.round(val * 10000) / 100).toFixed(2) : 
        Math.round(val * 10000) / 100);
      return Number(val) + '%';
    },

    'ms': function(val) {
      val = periodService.timeFormat(val);
      if (val == '<1ms') val = 0;
      return val;
    },

    'B': function(val) {
      return memFormat(val);
    },

    '次': function(val) {
      return val;
    },
  },

  transformer: '',
}
