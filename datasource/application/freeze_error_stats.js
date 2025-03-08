import moment from 'moment';
import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy, getMetrics, joinDataLabel, getAppMetricValue } from '../util';
import { getAppsysOptions, getAppOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile']

export default {
  id: 'datasource-freeze-error-states',
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
    desc: {
      type: String,
      label: '卡顿类型',
      isDim: true
    },

    os: {
      type: String,
      label: '操作系统',
      isDim: true
    },

    app_version: {
      type: String,
      label: 'APP版本',
      isDim: true
    },

    device: {
      type: String,
      label: '设备型号',
      isDim: true,
    },

    total: {
      type: String,
      label: '卡顿次数',
    },

    ts: {
      type: String,
      label: '最近出现时间'
    },

    user_count: {
      type: String,
      label: '影响用户数',
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
    let group_by = [];
    let options = {
      period: `${period[0]},${period[1]}`,
      group_by: [...metric_params.dimensions.filter( r =>  r !== 'error_label'), 'group'].join(','),
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    for (let metric of metric_params.metrics) {
      options.fields = metric;
      options.sort = metric;

      let ret = await appService.getAppFreezeStats(appid, options, false);
      if (ret.result === 'ok') {
        if (metric_params.dimensions.some( metric =>  metric === 'error_label')) {
          for(let i = 0; i < ret.data.length; i++) {
            let r = ret.data[i];
            let opt = {
              period: `${period[0]},${period[1]}`,
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
              data: item.data.map(r => getAppMetricValue(r, metric))
            }}
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [metric]);

        } else {
          result[metric] = {
            names: ret.data.map(r => joinDataLabel(r, metric_params.dimensions)),
            data: ret.data.map(r => getAppMetricValue(r, metric)),
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
