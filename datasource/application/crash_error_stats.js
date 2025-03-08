import moment from 'moment';
import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy } from '../util';
import { getAppsysOptions, getAppOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile'];

export default {
  id: 'datasource-crash-error-states',
  category: 'application',
  name: '崩溃异常统计',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 8,
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
    user_count: {
      type: String,
      label: '影响用户数',
    },

    total: {
      type: String,
      label: '崩溃次数',
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
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let fields = '';
    metrics && metrics.length > 0 && (fields = metrics.filter(r => r !== 'name').join(','));
    fields && (options.fields = fields);

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let optionsGroup_by = options.group_by;
    let appid = appParams.appid;

    let group_by = [];

    for (let metric of metrics) {
      options.group_by =  optionsGroup_by ?  optionsGroup_by + ',group,os' : 'group,os';
      options.fields = metric;
      options.sort = metric;

      let ret = await appService.getAppCrashStats(appid, options, false);
      if (ret.result === 'ok') {
        for(let i = 0; i < ret.data.length; i++) {
          let r = ret.data[i];
          let opt = {
            period: `${period[0]},${period[1]}`,
            filter: `group=${r.group}`,
            fields: 'group,error',
            skip: 0,
            limit: 1,
          };

          let raw = await appService.getAppCrashes(appid, opt);
          if (raw && raw.result === 'ok' && raw.data.length > 0) {
            r.label = raw.data[0].error;
          }
        };

        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) =>{
            return { 
              [metric]: {
              names: item.data.map(r => r.label),
              data: item.data.map(r => r[metric])
            }}
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [metric]);

        } else {
          result[metric] = {
            names: ret.data.map(r => r.label),
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
