import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy } from '../util';
import periodService from '@/service/period';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile'];

export default {
  id: 'datasource-webview-top',
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
    load: {
      type: Number,
      label: '页面加载时间',
    },

    ajax: {
      type: Number,
      label: '请求响应时间',
    },

    total: {
      type: Number,
      label: '访问数',
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

    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);
    let result = {};
    let options = {
      period: `${period[0]},${period[1]}`,
      group_by: 'group,url',
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let fields = '';
    metrics && metrics.length > 0 && (fields = metrics.filter(r => r !== 'url').join(','));
    fields && (options.fields = fields);

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    let group_by = [];
    
    for (let metric of metrics) {
      options.fields = metric;
      options.sort = metric;
      let ret = await appService.getWebAppStats(appid, options);
      if (ret.result === 'ok') {
        ret.data.forEach(r => {
          r.ajax = periodService.timeFormat(r.ajax) || '--';
          r.load = periodService.timeFormat(r.load) || '--';
        })
        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) =>{
            return { 
              [metric]: {
              names: item.data.map(r => r.url),
              data: item.data.map(r => r[metric])
            }}
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [metric]);

        } else {
          result[metric] = {
            names: ret.data.map(r => r.url),
            data: ret.data.map(r => r[metric]),
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
