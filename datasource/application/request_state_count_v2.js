import appService from '@/service/app.service';
import modelService from '@/service/model.service';
import search from '@/service/search';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy, getMetrics, joinDataLabel, getAppParmaFields, getAppMetricValue } from '../util';
import { RequestStatsFilter } from '@/service/filters';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-application-states-count--v2',
  category: 'application',
  name: '请求统计数字',
  type: 'object',
  ver: 1.1,
  order: 2,
  multiMetric: true,
  arguments: {
    appsysid: {
      type: String,
      label: '应用系统ID',
      ctrl: 'multiple-select',
      APPLICAION_TYPES,
      options: async function () {
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
      options: async function (appsysid) {
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
      required: false,
      output: true,
    },
    
    biz: {
      type: String,
      label: '业务',
      ctrl: 'multiple-select-cascader',
      required: false,
      dependencies: ['appid'],
      options: async function (appid) {
        const { result, cache } = await getModelOptions(appid, this.models);
        this.models = cache;
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
    },
   /* bizOnly: {
      type: Boolean,
      label: '仅业务',
      ctrl: 'switch',
      default: false,
    }*/
  },
  metrics: {
    appsysid: {
      type: String,
      label: '应用系统',
      isDim: true
    },
    appid:{
      type: String,
      label: '应用',
      isDim: true,
      description: '请求的应用',
    },
    group:{
      type: String,
      label: '业务名称',
      isDim: true,
      description: '请求的业务',
    },

    method: {
      type: String,
      label: '方法',
      isDim: true,
      description: 'http的方法',
    },
    path: {
      type: String,
      label: '路径',
      isDim: true,
      description: '请求的路径',
    },
    status_code: {
      type: String,
      label: '状态码',
      isDim: true,
      description: '状态码',
    },
    /*host: {
      type: String,
      label: '主机',
      isDim: true,
      description: '主机',
    },*/
    province: {
      type: String,
      label: '省份',
      isDim: true,
      description: '省份',
    },
    city: {
      type: String,
      label: '城市',
      isDim: true,
      description: '城市',
    },
    ip_addr: {
      type: String,
      label: 'IP地址',
      isDim: true,
      description: 'IP地址',
    },
    agent: {
      type: String,
      label: '探针',
      isDim: true,
      description: '探针',
    },
    browser: {
      type: String,
      label: '浏览器',
      isDim: true,
      description: '浏览器',
    },
    os: {
      type: String,
      label: '操作系统',
      isDim: true,
      description: '操作系统',
    },

    total: {
      type: Number,
      label: '请求数',
      description: '请求总数',
      unit: '次'
    },

    dur: {
      type: Number,
      label: '响应时间',
      unit: 'ms'
    },

    normal: {
      type: Number,
      label: '快速数',
      description: '快速请求数',
      unit: '次'
    },
    
    slow: {
      type: Number,
      label: '缓慢数',
      description: '缓慢请求数',
      unit: '次'
    },

    slow_rate: {
      type: Number,
      label: '缓慢率',
      description: '缓慢请求率',
      unit: '%',
    },

    frustrated: {
      type: Number,
      label: '极慢数',
      description: '极慢请求数',
      unit: '次'
    },

    frustrated_rate: {
      type: Number,
      label: '极慢率',
      description: '极慢请求率',
      unit: '%',
    },

    err: {
      type: Number,
      label: '错误数',
      description: '错误请求数',
      unit: '次'
    },

    err_rate: {
      type: Number,
      label: '错误率',
      description: '错误请求率',
      unit: '%',
    },

    fail: {
      type: Number,
      label: '失败数',
      description: '失败请求数',
      unit: '次'
    },

    fail_rate: {
      type: Number,
      label: '失败率',
      description: '失败请求率',
      unit: '%',
    },

    apdex: {
      type: Number,
      label: 'APDEX',
      description: 'APDEX',
    },

    neterr: {
      type: Number,
      label: '网络错误数',
      unit: '次'
    },
    httperr: {
      type: Number,
      label: 'http错误数',
      unit: '次'
    },
    err_4xx: {
      type: Number,
      label: '4XX 错误数',
      unit: '次'
    },
    err_4xx_rate: {
      type: Number,
      label: '4XX 错误率',
      unit: '%'
    },
    err_5xx: {
      type: Number,
      label: '5XX 错误数',
      unit: '次'
    },
    err_5xx_rate: {
      type: Number,
      label: '5XX 错误率',
      unit: '%'
    },

    user_count: {
      type: Number,
      label: '用户数',
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

  parseQuery(query) {
    let filter = [];
    if (query && query.length > 0) {
      query.forEach(part => {
        let params = part.split('=');
        let metric = params[0];
        let val = params[1];

        switch (metric) {
          case 'appid':
            filter.push({ key: 'appid', val });
            break;
          case 'appsysid':
            filter.push({ key: 'appsysid', val });
            break;
          case 'ts':
            let ts = val.split('~');
            filter.push({ key: 'ts', val: ts });
            break;
          default:
            let find = RequestStatsFilter.find(filter => filter.key === metric);
            if (find) {
              filter.push({ key: metric, val });
            }
            break;
        }
      });
    }

    return filter;
  },

  isEmpty(obj) {
    if (obj === null || obj === undefined) {
      return true;
    }
    if (typeof obj === 'string' && obj.trim() === '') {
      return true;
    }
    if (Array.isArray(obj) && obj.length === 0) {
      return true;
    }
    if (typeof obj === 'object' && Object.keys(obj).length === 0) {
      return true;
    }
    return false;
  },

  requester: async function (args, metrics, query) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let result = {};
    let group_by = [];
    const metric_params = getMetrics(metrics, this.metrics);
    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);

    let options = {
      period: `${period[0]},${period[1]}`,
      group_by: metric_params.dimensions.join(','),
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let queryInfo = this.parseQuery(query);
    let appid = params.appid;
    if (queryInfo.length > 0) {
      options.filter = queryInfo.filter(r => !['ts', 'appid'].find(key => key === r.key))
        .map(r => `${r.key}=${r.val}`)
        .join(',');
      !options.filter && delete options.filter;

      let tsQuery = queryInfo.find(r => r.key === 'ts');
      if (tsQuery) {
        options.period = `${tsQuery.val[0]},${tsQuery.val[1]}`;
      }

      let appQuery = queryInfo.find(r => r.key === 'appid');
      if (appQuery) {
        appid = appQuery.val;
        params.appid = appid;
      }
    }
    
    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    appid = appParams.appid;

    if (params.bizOnly || options.group_by.includes('group')) {
      options.filter && (options.filter += `,is_model=true`);
      !options.filter && (options.filter = `is_model=true`);
    }


    if (metric_params.dimensions.includes('group') && !this.models) {
      let opt = { skip: 0, limit: 1000};
      let ret = await modelService.getModels(opt);
      this.models = ret.data;
    }

    for (let kpi of metric_params.metrics) {
      options.fields = getAppParmaFields(kpi, 'status');
      options.sort = kpi === 'normal' ? 'total' : kpi;

      if (kpi === 'user_count') {
        options.fields += ',total';
      }

      let ret = await appService.getAppRequestStats(this.isEmpty(appid) ? '_all' : appid, options);
      if (ret?.result === 'ok') {
        ret.data.forEach(r => {
          if (r.group) {
            const findGroup = this.models && this.models.find(s => s.id === r.group);
            r.group_prim = r.group;
            r.group = findGroup ? findGroup.name : r.group;
          }
          r.normal = r.total - r?.slow - r?.frustrated;

          if (r.appsysid) {
            r.appsysid_prim = r.appsysid
            r.appsysid = r?.appsysname || r.appsysid;
          }
        });

        // 过滤掉为 0 的数据
        ret.data = ret.data.filter( r => getAppMetricValue(r, kpi, 'status', this.metrics[kpi], true))

        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) => {
            return {
              [kpi]: {
                names: item.data.map(r => joinDataLabel(r, metric_params.dimensions) || '--'),
                showValue: item.data.map(r => getAppMetricValue(r, kpi, 'status', this.metrics[kpi], true)),
                unit: this.metrics[kpi]?.unit || '',
                data: item.data.map(r => r[kpi])
              }
            }
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [kpi]);

        } else {
          result[kpi] = {
            names: ret.data.map(r => joinDataLabel(r, metric_params.dimensions) || '--'),
            showValue: ret.data.map(r => getAppMetricValue(r, kpi, 'status', this.metrics[kpi], true)),
            unit: this.metrics[kpi]?.unit || '',
            data: ret.data.map(r => r[kpi])
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
