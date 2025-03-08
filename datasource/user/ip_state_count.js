import userService from '@/service/user.service';
import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['web', 'mobile', 'server'];

export default {
  id: 'datasource-user-ip-states-count',
  category: 'application',
  name: '用户IP访问统计',
  type: 'object',
  ver: 1.1,
  order: 3,
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
  },
  metrics: {
    access_count: {
      type: Number,
      label: '访问次数',
      description: '访问次数',
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
      fields: 'access_count',
    };

    options.group_by = metric_params.dimensions.join(',');
    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;

    let ret = await userService.getUserIPStats(options);
    if (ret.result === 'ok') {
      ret.data.forEach(r => {
        r.appsysid_prim = r.appsysid;
        r.appsysname && (r.appsysid = r.appsysname);
      });

      if (params.group_by) {
        let group_by = getStatesResultGroupBy(ret.data, params.group_by, (item) => {
          return {
            names: ['access_count'],
            data: [item.data?.[0]?.access_count || 0],
          }
        });
        result.group_by = group_by;
        result['default'] = {};
      } else {
        result = {
          default: {
            names: ['access_count'],
            data: [ret.data?.[0]?.access_count || 0],
          }
        };
      }
    }

    return result;
  },

  transformer: '',
}
