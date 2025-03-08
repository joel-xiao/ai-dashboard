import appService from '@/service/app.service';
import sqlService from '@/service/sql';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics, joinDataLabel, getAppMetricValue, mergeStatesGroupBy} from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-sql-tmpl-top--v2',
  category: 'application',
  name: 'SQL语句统计',
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
    }
  },
  metrics: {
    sql: {
      type: String,
      label: 'SQL语句',
      isDim: true
    },

    // model: {
    //   type: String,
    //   label: 'SQL名称',
    //   isDim: true
    // },

    dbhost: {
      type: String,
      label: 'DB主机',
      isDim: true
    },

    db: {
      type: String,
      label: '数据库',
      isDim: true
    },

    dbtype: {
      type: String,
      label: '类型',
      isDim: true
    },
    total: {
      type: Number,
      label: '查询次数',
      unit: '次'
    },
    dur: {
      type: Number,
      label: '响应时间',
      unit: 'ms'
    },
    fast: {
      type: Number,
      label: '快速数',
      description: 'SQL快速数',
      unit: '次'
    },
    tolerated: {
      type: Number,
      label: '缓慢数',
      description: 'SQL缓慢数',
      unit: '次'
    },
    frustrated: {
      type: Number,
      label: '极慢数',
      description: 'SQL极慢数',
      unit: '次'
    },
    sqlerr: {
      type: Number,
      label: '错误数',
      description: 'SQL错误数',
      unit: '次'
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

    const not_metric = ['sql'];
    let result = {};
    let group_by = [];
    let options = {
      period: `${period[0]},${period[1]}`,
      group_by: [...metric_params.dimensions].filter( metric => !not_metric.some( m => m === metric)).join( ','),
    };

    if (metric_params.dimensions.includes('sql')) {
      options.group_by = options.group_by ? `${options.group_by},group` : 'group';
    }

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    for (let kpi of metric_params.metrics) {
      options.fields = kpi;
      options.sort = kpi;
      let ret = await sqlService.getSqlStats(appid, options);
      if (ret.result === 'ok') {
        ret.data = ret.data.filter( item => getAppMetricValue(item, kpi, '', {}, true));
        ret.data.forEach(r => {
          r.sql = r.src?.template;
          r['fast'] = r['fast'] ? r['fast'] : (r['total'] - r['tolerated'] - r['frustrated']);
        });
        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) => {
            return {
              [kpi]: {
                names: item.data.map(r => joinDataLabel(r, metric_params.dimensions) || '--'),
                data: item.data.map(r => getAppMetricValue(r, kpi, '', {}, true)),
                unit: this.metrics[kpi]?.unit || '',
              }
            }
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [kpi]);

        } else {
          result[kpi] = {
            names: ret.data.map(r => joinDataLabel(r, metric_params.dimensions) || '--'),
            data: ret.data.map(r => getAppMetricValue(r, kpi, '', {}, true)),
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
