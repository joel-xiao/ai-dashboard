import appService from '@/service/app.service';
import modelService from '@/service/model.service';
import periodService from '@/service/period';
import statusService from '@/service/status';
import { period_list, parsePeriod, getAppParams } from '../util';
import { RequestStatsFilter } from '@/service/filters';
import { getAppsysOptions, getAppOptions } from '../apm_options';

const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-application-status-tps',
  category: 'application',
  name: '请求状态统计',
  type: 'object',
  ver: 1.1,
  order: 1,
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
      dependencies: ['appsysid'],
      options: async function(appsysid) {
        const {
          result,
          cache,
          sys_cache,
         } = await getAppOptions(
            appsysid, 
            this.appsys_options, 
            this.app_options
          );
        this.appsys_options = sys_cache;
        this.app_options = cache;
        return result;
      },
      required: true,
      output: true,
    },
    biz: {
      type: String,
      label: '业务',
      ctrl: 'multiple-select-cascader',
      required: false,
      dependencies: ['appid'],
      options: async function(appid) {
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
    
    showUnit: {
      type: Boolean,
      label: '显示单位',
      default: true,
      ctrl: 'switch',
    }
  },
  metrics: {
    avg_tps: {
      type: Number,
      label: '平均TPS',
      unit: '',
      description: '',
    },
    max_tps: {
      type: Number,
      label: '最大TPS',
      unit: '',
      description: '',
    },
    min_tps: {
      type: Number,
      label: '最小TPS',
      unit: '',
      description: '',
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

  parseVal(val, dot) {
    let str = parseFloat(val).toFixed(dot);
    isNaN(str) && (str = 0);
    return str;
  },

  requester: async function(args, metrics, query) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    let fields = '';
    metrics && metrics.length > 0 && (fields = metrics.join(','));
    if (fields.indexOf('total') < 0) {
      fields += ',total';
    }

    let options = {
      period: `${period[0]},${period[1]}`,
      fields
    };

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
        params.appid = appid;
      }
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    appid = appParams.appid;
 
    let ret = await appService.getAppRequestStats(appid, options);
    if (!ret.data || !ret.data[0]) ret.data = [{}];

    let group_by = [];
      ret.data.forEach( r => {
       let result = {
         avg_tps: this.parseVal(r.avg_tps, 2),
         max_tps: this.parseVal(r.max_tps, 2),
         min_tps: this.parseVal(r.min_tps, 2),
       };
 
       let data = [];
       let name = [];
       Object.keys(result).forEach(key => {
         let find = metrics.find(r => r === key);
         let metricinfo = this.metrics[key];
         if (find && metricinfo) {
           if (params.showUnit) {
             data.push((result[key] || 0 ) + metricinfo?.unit);
           } else {
             data.push((result[key] || 0 ));
           }
           name.push({ name: this.metrics[key]?.label, key });
         }
       });
       
       group_by.push({
          appsysid: r.appsysid,
          appid: r.appid,
          group: r.group,
          names: name,
          data,
          unit: params.showUnit ? '' : '次',
        })
      })

      if (params.group_by) {
        return {
          group_by: group_by,
          default: {},
        }
      } else {
        return {
          default: group_by[0],
        }
      }
  },

  transformer: '',
}
