import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy, getMetrics } from '../util';
import { MobileCrashFilter } from '@/service/filters';
import moment from 'moment';
import { getAppsysOptions, getAppOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile'];

export default {
  id: 'datasource-crash-states',
  category: 'application',
  name: '崩溃指标统计',
  type: 'array',
  multiMetric: true,
  ver: 1.1,
  order: 7,
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
            APPLICAION_TYPES,
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
    name: {
      type: String,
      label: '崩溃名称',
      isDim: true,
    },
    type: {
      type: String,
      label: '崩溃类型',
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

    device:{
      type: String,
      label: '设备型号',
      isDim: true,
    },
    total: {
      type: String,
      label: '崩溃次数',
    },

    last_time: {
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

  parseQuery(query) {
    let filter = [];
    if (query && query.length > 0) {
      query.forEach(part => {
        let params =  part.split('=');
        let metric = params[0];
        let val = params[1];

        switch(metric) {
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
            let find = MobileCrashFilter.find(filter => filter.key === metric);
            if (find) {
              filter.push({ key: metric, val });
            }
            break;
        }
      });
    }

    return filter;
  },

  requester: async function(args, metrics, query) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);
    const metric_params = getMetrics(metrics, this.metrics);
    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};
    let options = {
      period: `${period[0]},${period[1]}`,
      group_by: [...metric_params.dimensions.filter( r =>  {
        return r !== 'error_label' && r !== 'name'
      })].join(','),
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let queryInfo = this.parseQuery(query);
    let appid = params.appid;
    if (queryInfo.length > 0) {
      options.filter = queryInfo.filter(r => !['ts', 'appid'].find(key => key === r.key) )
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
      }
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let optionsGroup_by = options.group_by;
    appid = appParams.appid;
    let group_by = [];
    options.fields = metric_params.metrics.join(',');
    if (metric_params.dimensions.includes('name') && !metric_params.dimensions.includes('type')) {
      options.group_by = options.group_by ? `${options.group_by},type`: 'type';
    }
    let ret = await appService.getAppCrashStats(appid, options, false);
    if (ret.result === 'ok') {
      (ret.data || []).forEach(r => {
        if (r.type) {
          r.name = r.type;
        }
        r.appsysid_prim = r.appsysid;
        r.appsysid = r?.appsysname ? r.appsysname : r.appsysid;
      });
      result = ret.data;
    }

    if (metric_params.metrics.find(r => r === 'last_time') && (metric_params.dimensions.length + metric_params.metrics.length) > 2 && Array.isArray(result)) {
      result.forEach(r => {
        r.last_time = moment(r.last_time).format('YYYY-MM-DD HH:mm:ss');
      })
    }

    return result;
  },

  transformer: '',
}
