import moment from 'moment';
import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy, getMetrics, joinDataLabel, getAppMetricValue } from '../util';
import { getAppsysOptions, getAppOptions } from '../apm_options';
import { getOptions, makeResult } from '../functions';

const APPLICAION_TYPES = ['mobile']

export default {
  id: 'datasource-freeze-error-states--v2',
  category: 'application',
  name: '卡顿异常统计',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 11,
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

    desc: {
      type: String,
      label: '卡顿类型',
      isDim: true,
    },

    os: {
      type: String,
      label: '操作系统',
      isDim: true,
    },

    app_version: {
      type: String,
      label: 'APP版本',
      isDim: true,
    },

    device: {
      type: String,
      label: '设备型号',
      isDim: true,
    },

    error_label: {
      type: String,
      label: '卡顿名称',
      isDim: true,
    },

    total: {
      type: String,
      label: '卡顿次数',
    },

    user_count: {
      type: String,
      label: '影响用户数',
    },
    
  },
  
  requester: async function(args, metrics) {
    const default_fields = '';
    const { 
      isOK, 
      msg, 
      options, 
      appid,
      params,
      metric_params,
    } = await getOptions.call(this, args, metrics, default_fields);
    if (!isOK) {
      return msg;
    }

    options.group_by = metric_params.dimensions.filter( r =>  r !== 'error_label').join(',');
    if (metric_params.dimensions.includes('error_label')) {
      options.group_by += ',group';
    }

    let group_by = [];
    const result = {};
    for (let metric of metric_params.metrics) {
      options.fields = metric;
      options.sort = metric;

      let ret = await appService.getAppFreezeStats(appid, options, false);
      if (ret.result === 'ok') {
        (ret.data || []).forEach(r => {
          if (r.appsysid) {
            r.appsysid_prim = r.appsysid
            r.appsysid = r?.appsysname || r.appsysid;
          }
        })
        if (metric_params.dimensions.some( metric =>  metric === 'error_label')) {
          for(let i = 0; i < ret.data.length; i++) {
            let r = ret.data[i];
            let opt = {
              period: options.period,
              filter: `group=${r.group}`,
              fields: 'group,error',
              skip: 0,
              limit: 1,
            };
  
            let raw = await appService.getAppFreezes(appid, opt);
            if (raw && raw.result === 'ok' && raw.data.length > 0) {
              r.error_label = raw.data[0].error;
            }
          };
        }

        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) =>{
            return { 
              [metric]: {
              names: item.data.map(r => joinDataLabel(r, metric_params.dimensions)),
              data: item.data.map(r => getAppMetricValue(r, metric)),
              showValue: item.data.map(r => getAppMetricValue(r, metric))
            }}
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [metric]);

        } else {
          result[metric] = {
            names: ret.data.map(r => joinDataLabel(r, metric_params.dimensions)),
            data: ret.data.map(r => getAppMetricValue(r, metric)),
            showValue: ret.data.map(r => getAppMetricValue(r, metric)),
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

  transformer: '',
}
