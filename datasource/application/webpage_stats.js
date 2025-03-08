import appService from '@/service/app.service';
import periodService from '@/service/period';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['web'];

export default {
  id: 'datasource-webpage-states',
  category: 'application',
  name: '页面统计',
  type: 'array',
  ver: 1.1,
  order: 18,
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
    model: {
      type: String,
      label: '页面名称',
      isDim: true
    },
    url: {
      type: String,
      label: 'URL',
      isDim: true
    },
    domain: {
      type: String,
      label: '域名',
      isDim: true
    },
    province: {
      type: String,
      label: '省份',
      isDim: true
    },
    city: {
      type: String,
      label: '城市',
      isDim: true
    },
    device: {
      type: String,
      label: '设备',
      isDim: true
    },
    os: {
      type: String,
      label: '操作系统',
      isDim: true
    },
    app_version: {
      type: String,
      label: '应用版本',
      isDim: true
    },
    browser: {
      type: String,
      label: '浏览器',
      isDim: true
    },
    resolution: {
      type: String,
      label: '分辨率',
      isDim: true
    },
    total: {
      type: Number,
      label: '访问数',
    },
    load: {
      type: Number,
      label: '页面加载时间',
    },
    ajax: {
      type: Number,
      label: '请求响应时间',
    },
    render: {
      type: Number,
      label: '页面渲染时间',
    },
    net: {      
      type: Number,
      label: '网络时间',
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

  timeFormat(val) {
    const p = periodService;
    return p.timeFormat(val);
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
      period: `${period[0]},${period[1]}`
    };
    options.group_by = metric_params.dimensions.join(',');
    options.fields = metric_params.metrics.join(',');
    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    let ret = await appService.getWebAppStats(appid, options);
    if (ret.result === 'ok') {
      (ret.data || []).forEach(r => {
        if(r.appsysid) {
          r.appsysid_prim = r.appsysid;
          r.appsysid = r?.appsysname || r.appsysid;
        }
      })
      result = ret.data;
      result.forEach(r => {
        r.ajax && (r.ajax = this.timeFormat(r.ajax) || '--');
        r.load && (r.load = this.timeFormat(r.load) || '--');
        r.render && (r.render = this.timeFormat(r.render) || '--');
        r.net && (r.net = this.timeFormat(r.net) || '--');
        r['model'] = r?.model || '--';
        r['uevent_model'] = r?.uevent_model || '--';
      });
    }

    return result;
  },

  transformer: '',
}
