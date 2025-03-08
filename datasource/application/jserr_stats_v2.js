import appService from '@/service/app.service';
import modelService from '@/service/model.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy, getMetrics, getAppMetricValue, joinDataLabel } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile','web'];

export default {
  id: 'datasource-jserr-states--v2',
  category: 'application',
  name: '脚本错误指标统计',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 14,
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
    appsysid:{
      type: String,
      label: '应用系统',
      isDim: true,
    },
    appid:{
      type: String,
      label: '应用',
      isDim: true,
    },
    error: {
      type: String,
      isDim: true,
      label: '错误信息',
    },
    uri: {
      type: String,
      isDim: true,
      label: '页面',
    },
    browser: {
      type: String,
      isDim: true,
      label: '浏览器',
    },
    total: {
      type: String,
      label: '错误次数'
    }
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
      group_by: metric_params.dimensions.join(','),
      sort: 'total',
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    for (let kpi of metric_params.metrics) {
      options.sort = kpi;
      options.fields = kpi;
      let ret = await appService.getWebAppErrorStats(appid, options, false);
      if (ret.result === 'ok') 
      (ret.data || []).forEach(r => {
        if (r.appsysid) {
          r.appsysid_prim = r.appsysid
          r.appsysid = r?.appsysname || r.appsysid;
        }
      });{
        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) => {
            return { 
              [kpi]: {
              names: item.data.map(r => joinDataLabel(r, metric_params.dimensions)),
              data: item.data.map(r => getAppMetricValue(r, kpi))
            }}
          });

          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [kpi]);

        } else {
          result[kpi] = {
            names: ret.data.map(r => joinDataLabel(r, metric_params.dimensions)),
            data: ret.data.map(r => getAppMetricValue(r, kpi)),
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
