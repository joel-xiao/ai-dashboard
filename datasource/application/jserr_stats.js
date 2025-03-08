import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy, getMetrics, getAppMetricValue, joinDataLabel } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';
import moment from 'moment';

const APPLICAION_TYPES = ['mobile','web'];

export default {
  id: 'datasource-jserr-states',
  category: 'application',
  name: '脚本错误指标统计',
  type: 'array',
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
    error: {
      type: String,
      label: '错误信息',
      isDim: true
    },
    uri: {
      type: String,
      label: '页面',
      isDim: true
    },
    browser: {
      type: String,
      label: '浏览器',
      isDim: true
    },
    total: {
      type: String,
      label: '错误次数'
    },
    last_time: {
      type: String,
      label: '最近出现时间'
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
    let metric_params = getMetrics(metrics, this.metrics);
    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};
    let options = {
      period: `${period[0]},${period[1]}`,
      sort: 'total',
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    options.group_by = metric_params.dimensions.join(',');
    options.fields = 'total,last_time';//metric_params.metrics.join(',');
    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;
    let ret = await appService.getWebAppErrorStats(appid, options);
    if (ret.result === 'ok') {
      (ret.data || []).forEach(r => {
        if (r.appsysid) {
          r.appsysid_prim = r.appsysid;
          r.appsysid = r?.appsysname || r.appsysid;
        }
        if (r.last_time) {
          r.last_time = moment(r.last_time).format('YYYY-MM-DD HH:mm:ss');
        }
      });
      result = ret.data;
    }
    return result;
  },

  transformer: '',
}
