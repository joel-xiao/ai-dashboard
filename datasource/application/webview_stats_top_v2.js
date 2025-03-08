import appService from '@/service/app.service';
import periodService from '@/service/period';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy, getMetrics, joinDataLabel, getAppMetricValue } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile'];

export default {
  id: 'datasource-webview-top--v2',
  category: 'application',
  name: 'Webview统计',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 21,
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
    appid:{
      type: String,
      label: '应用',
      isDim: true,
    },

    model: {
      type: String,
      isDim: true,
      label: '页面名称',
    },

    url: {
      type: String,
      isDim: true,
      label: 'URL',
    },

    domain: {
      type: String,
      isDim: true,
      label: '域名',
    },

    province: {
      type: String,
      isDim: true,
      label: '省份',
    },

    city: {
      type: String,
      isDim: true,
      label: '城市'
    },

    device: {
      type: String,
      isDim: true,
      label: '设备',
    },

    os: {
      type: String,
      isDim: true,
      label: '操作系统',
    },

    app_version: {
      type: String,
      isDim: true,
      label: '应用版本',
    },

    browser: {
      type: String,
      isDim: true,
      label: '浏览器',
    },

    resolution: {
      type: String,
      isDim: true,
      label: '分辨率'
    },
    total: {
      type: Number,
      label: '访问数',
      unit: '次'
    },
    load: {
      type: Number,
      label: '页面加载时间',
      unit: 'ms'
    },
    ajax: {
      type: Number,
      label: '请求响应时间',
      unit: 'ms'
    },
    render: {
      type: Number,
      label: '页面渲染时间',
      unit: 'ms'
    },
    net: {      
      type: Number,
      label: '网络时间',
      unit: 'ms'
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
    if (typeof val === 'number') {
      return parseFloat(val).toFixed(2);
    }

    return val;
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
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    let group_by = [];
    for (let metric of metric_params.metrics) {
      options.sort = metric;
      options.fields = metric;
      let ret = await appService.getWebAppStats(appid, options);
      if (ret.result === 'ok') {
        ret.data.forEach(r => {
          r.ajax && (r.ajax = this.timeFormat(r.ajax) || '--');
          r.load && (r.load = this.timeFormat(r.load) || '--');
          r.render && (r.render = this.timeFormat(r.render) || '--');
          r.net && (r.net = this.timeFormat(r.net) || '--');
          if (r.appsysid) {
            r.appsysid_prim = r.appsysid
            r.appsysid = r?.appsysname || r.appsysid;
          }
        })
        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) =>{
            return { 
              [metric]: {
              names: item.data.map(r => joinDataLabel(r, metric_params.dimensions)),
              data: item.data.map(r => getAppMetricValue(r, metric)),
              unit: this.metrics[metric]?.unit || '',
              showValue: item.data.map(r => metric !== 'total' ? periodService.timeFormat(getAppMetricValue(r, metric)) : getAppMetricValue(r, metric)),
            }}
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [metric]);

        } else {
          result[metric] = {
            names: ret.data.map(r => joinDataLabel(r, metric_params.dimensions)),
            data: ret.data.map(r => getAppMetricValue(r, metric)),
            unit: this.metrics[metric]?.unit || '',
            showValue: ret.data.map(r => metric !== 'total' ? periodService.timeFormat(getAppMetricValue(r, metric)) : getAppMetricValue(r, metric)),
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
