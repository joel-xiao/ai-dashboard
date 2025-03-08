import agentService from '@/service/agent.service';
import { period_list } from '../util';
import { getAppsysOptions, getAppOptions, getAgentOptions } from '../apm_options';
import { getOptions, makeResult } from '../functions';
import { memFormat } from '@/service/util';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-agent-jvm-timeseries',
  category: 'application',
  name: '探针JVM时间线',
  type: 'array',
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
      required: true,
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
  },
  metrics: {
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
    fgc_time: {
      type: Number,
      label: 'FGC',
      unit: 'ms'
    }, 
  },

  requester: async function(args, metrics) {

    const default_fields = 'total,tolerated,frustrated';
    const { 
      isOK, 
      msg, 
      options, 
      appid 
    } = await getOptions.call(this, args, metrics, default_fields);
    if (!isOK) {
      return msg;
    }

    let ret = await agentService.fetchJvmStatsTimeseries(appid, '_all', {...options, apiv2: true});
    let result = makeResult.call(this, 'time', ret, options.fields.split(','));
    return result;
    /*
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }
    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);
    
    let result = {};
    let granularity = periodService.getGranularity(period[0], period[1]);
    const group_bys = params.group_by || [];
    let options = {
      period: `${period[0]},${period[1]}`,
      granularity,
      fields: Array.from(new Set([...group_bys, ...metrics])).join(','),
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;
    let ret = await agentService.fetchJvmStatsTimeseries(appid, '_all', options);
    if (ret.result === 'ok') {
      result = ret.data;
      const not_fields = [...group_bys, 'timestamp'];
      let valueData = [];
      result.forEach((row, idx) => {
        Object.keys(row).filter(key => !not_fields.some( field => key === field)).forEach(key => {
          let val = row[key] || 0;
          let showVal = val;
          let showUnit = this.metrics[key]?.unit || 'B';
          if (key.indexOf('fgc') < 0 && key.indexOf('jvm_cpu') < 0 && key.indexOf('sys_cpu') < 0) {
            showVal = memFormat(val);
            valueData.push(val);
          }

          if (key.indexOf('jvm_cpu') >= 0 || key.indexOf('sys_cpu') >= 0) {
            showVal = (val > 0.01 ? (Math.round(val * 10000) / 100).toFixed(2) : Math.round(val * 10000) / 100);
            val = showVal;
          }

          if (key === 'fgc_time') {
            showVal = periodService.timeFormat(val);
            if (showVal == '<1ms') showVal = 0;
          }

          row[key] = [row.timestamp, val, showVal];
          row[key + '_unit'] = showUnit;
          row['showValue_' + key] = [(key.indexOf('jvm_cpu') >= 0 || key.indexOf('sys_cpu') >= 0) ? (showVal + '%') : showVal];
        });
      });
      if (valueData.length > 0) {
        valueData = valueData.sort((a, b) => b - a);
        const maxVal = valueData[0];
        if (maxVal > 0) {
          const changeVal = memFormat(maxVal);
          const maxUnit = String(changeVal).match(/[^0-9.]/g).join('');
          result.forEach((row) => {
            Object.keys(row).filter(key => !not_fields.some( field => key === field)).forEach(key => {
              if (key.indexOf('fgc') < 0 && key.indexOf('jvm_cpu') < 0 && key.indexOf('sys_cpu') < 0) {
                if (row[key + '_unit'] === 'B') {
                  row[key + '_unit'] = maxUnit;
                }
              }
            })
          })
        }
      }
      
    }
    return result;*/
  },

  transformer: '',
}
