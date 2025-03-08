import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics, joinDataLabel, getAppMetricValue, getAppParmaFields, mergeStatesGroupBy } from '../util';
import { getAppsysOptions, getAppOptions } from '../apm_options';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-exception-states--v2',
  category: 'application',
  name: '异常统计',
  type: 'object',
  ver: 1.1,
  order: 5,
  multiMetric: true,
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
      isDim: true
    },
    appid: {
      type: String,
      label: '应用',
      isDim: true
    },
    name: {
      type: String,
      label: '异常名称',
      isDim: true
    },
    url: {
      type: String,
      label: 'URL',
      isDim: true
    },
    total: {
      type: Number,
      label: '异常数',
      description: '发生异常的总数',
      // unit: '次'
    },
    per: {
      type: Number,
      label: '异常占比',
      unit: '%'
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

    let ret = await appService.getAppExceptionStats(appid, {
      period: `${period[0]},${period[1]}`,
      field: 'total',
      filter: options.filter,
      group_by: params.group_by
    });
    const all_data = ret?.data || [];

    let group_by = [];
    ret = await appService.getAppExceptionStats(appid, options);
    for (let kpi of metric_params.metrics) {
      options.fields = getAppParmaFields(kpi, 'exception');
      options.sort = options.fields;
      if (ret.result === 'ok') {
        ret.data.forEach(r => {
          const all_data_filter = all_data.filter( all_item => params.group_by ? params.group_by.split(',').every( by => (all_item[by] === r[by] || all_item[by] === r[by + '_prim'])) : true);
          const all_data_total = all_data_filter.reduce((prev, item) => prev + item.total, 0);
          r.per = r.total / (all_data_total || 0) * 100;
          if (r.per === Infinity || r.per === -Infinity) r.per = 0;

          if (r.appsysid && !r.appsysid_prim) {
            r.appsysid_prim = r.appsysid
            r.appsysid = r?.appsysname || r.appsysid;
          }
        });

        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) => {
            return {
              [kpi]: {
                names: item.data.map(r => joinDataLabel(r, metric_params.dimensions) || '--'),
                data: item.data.map(r => getAppMetricValue(r, kpi, '', (kpi === 'per' ? {} : this.metrics[kpi]), true)),
                unit: this.metrics[kpi]?.unit || '',
              }
            }
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [kpi]);

        } else {
          result[kpi] = {
            names: ret.data.map(r => joinDataLabel(r, metric_params.dimensions) || '--'),
            data: ret.data.map(r => getAppMetricValue(r, kpi, '', (kpi === 'per' ? {} : this.metrics[kpi]), true)),
            unit: this.metrics[kpi]?.unit || '',
          }
        }
      }
    };
    if (params.group_by) {
      return {
        group_by: group_by,
      }
    } else {
      return result;
    }
  },

  transformer: '',
}
