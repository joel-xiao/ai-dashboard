import userService from '@/service/user.service';
import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';
import moment from 'moment';

const APPLICAION_TYPES = ['web', 'mobile', 'server'];

export default {
  id: 'datasource-ips',
  category: 'application',
  name: 'IP访问详情',
  type: 'array',
  multiMetric: true,
  ver: 1.1,
  order: 2,
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
      required: false,
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
    ip: {
      type: String,
      label: '用户IP',
    },
    province: {
      type: String,
      label: '省份',
    },
    city: {
      type: String,
      label: '城市',
    },
    appsysid: {
      type: String,
      label: '应用系统'
    },
    appid: {
      type: String,
      label: '应用'
    },
    ts: {
      type: String,
      label: '最后访问时间',
    },
    access_count: {
      type: String,
      label: '访问次数',
    },
    freeze: {
      type: String,
      label: '卡顿数',
    },
    crash: {
      type: String,
      label: '崩溃数',
    },
    exception: {
      type: String,
      label: '异常数',
    },
    js_err: {
      type: String,
      label: '脚本错误数',
    },
  },
  
  checkArguments(args) {
    let self = this;
    let result = true;
    Object.keys(self.arguments).forEach(arg => {
      if (!result) { return }

      if (self.arguments[arg].required) {
        let find = args.find(r => r.arg === arg);
        if (!find || !find.val) {
          result = false;
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
      fields: ''
    };

    options.fields = metric_params.metrics.join(',');
    options.group_by = metric_params.dimensions.join(',')
    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let ret = await userService.getUserIPs(options);
    if (ret.result === 'ok') {
      result = ret.data;
      result.forEach(r => {
        r.appsysid_prim = r.appsysid;
        r.appsysname && (r.appsysid = r.appsysname);
        r.ts = moment(r.ts).format('YYYY-MM-DD HH:mm:ss');
      });

      const numMetrics = ['access_count', 'freeze', 'crash', 'exception', 'js_err'];

      metrics.forEach(m => {
        result.forEach(r => {
          r[m] = r[m] || (numMetrics.includes(m) ? 0 : '');
        })
      })
    }

    return result;
  },

  transformer: '',
}
