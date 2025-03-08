import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy, getMetrics } from '../util';
import moment from 'moment';
import { getAppsysOptions, getAppOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile']

export default {
  id: 'datasource-freeze-states',
  category: 'application',
  name: '卡顿指标统计',
  type: 'array',
  multiMetric: true,
  ver: 1.1,
  order: 10,
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
      label: '卡顿名称',
      isDim: true,
    },
    error_label: {
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
    total: {
      type: String,
      label: '卡顿次数',
    },
    user_count: {
      type: String,
      label: '影响用户数',
    },
    last_time: {
      type: String,
      label: '最近出现时间',
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

    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};
    const metric_params = getMetrics(metrics, this.metrics);
    
    const dims = metric_params.dimensions;
    const dimlist = [];
    dims.forEach(r => {
      let key = r;
      if (r === 'error_label') {
        key = 'desc';
      }
      const exist = dimlist.find(d => d === key);
      !exist && dimlist.push(key);
    })

    let options = {
      period: `${period[0]},${period[1]}`,
      group_by: dimlist.join(','),
    };
    options.fields = metric_params.metrics.join(',');
    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;
    let ret = await appService.getAppFreezeStats(appid, options, false);
    if (ret.result === 'ok') {
      (ret.data || []).forEach(r => {
        r.desc && (r.error_label = r.desc);
        r.appsysid_prim = r.appsysid;
        r.appsysid = r?.appsysname || r.appsysid;
      });
      result = ret.data;
    }

    if (metric_params.metrics.find(r => r === 'last_time')) {
      result.forEach(r => {
        r.last_time = moment(r.last_time).format('YYYY-MM-DD HH:mm:ss');
      })
    }
    return result;
  },

  transformer: '',
}
