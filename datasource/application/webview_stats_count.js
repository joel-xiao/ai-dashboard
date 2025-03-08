import appService from '@/service/app.service';
import periodService from '@/service/period';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile'];

export default {
  id: 'datasource-webview-states-cnt',
  category: 'application',
  name: 'webview汇总',
  type: 'object',
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
  },
  metrics: {
    total: {
      type: Number,
      label: '访问数',
    },
    net: {
      type: Number,
      label: '网络时间',
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

  parseFloatValue(kpi, val) {
    if (kpi === 'load' || kpi === 'ajax' || kpi === 'render') {
      val = val.toFixed(2);
      val === '0.00' && (val = 0);
    }

    return val;
  },

  requester: async function(args, metrics) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};
    let options = {
      period: `${period[0]},${period[1]}`,
    };

    let fields = '';
    metrics && metrics.length > 0 && (fields = metrics.filter(r => r !== 'url').join(','));
    fields && (options.fields = fields);

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    let ret = await appService.getWebAppStats(appid, options);
    if (ret.result === 'ok') {
      ret.data.forEach(r => {
        r.net && (r.net = periodService.timeFormat(r.net) || '--');
        r.load && (r.load = periodService.timeFormat(r.load) || '--');
        r.ajax && (r.ajax = periodService.timeFormat(r.ajax) || '--');
        r.render && (r.render = periodService.timeFormat(r.render) || '--');
      });
      if (params.group_by) {
        let group_by = [];
        Array.isArray(ret.data) && ret.data.forEach( r => {
          group_by.push({
            appsysid: r.appsysid,
            appid: r.appid,
            group: r.group,
            names: metrics.map(r => {
              return {
                name: this.metrics[r]?.label,
                key: r,
              }
            }),
            data: metrics.map(metric => (r[metric] || 0)),
          });
        });
        result['group_by'] = group_by;
        result['default'] = {};
      } else {
        let data = ret.data[0] || {};
        result = {
          default: {
            names: metrics.map(r => {
              return {
                name: this.metrics[r]?.label,
                key: r,
              }
            }),
            data: metrics.map(r => (data[r] || 0)),
          },
        }
      }
    }

    return result;
  },

  transformer: '',
}
