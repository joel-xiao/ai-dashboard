import userService from '@/service/user.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics, joinDataLabel, getAppMetricValue, mergeStatesGroupBy } from '../util';
import { getAppsysOptions, getAppOptions } from '../apm_options';

const APPLICAION_TYPES = ['web', 'mobile', 'server'];

export default {
  id: 'datasource-user-ip-states--v2',
  category: 'application',
  name: '用户IP访问',
  type: 'object',
  multiMetric: true,
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
      isDim: true
    },
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
    city: {
      type: String,
      label: '城市',
      isDim: true
    },
    province: {
      type: String,
      label: '省份',
      isDim: true
    },
    access_count: {
      type: Number,
      label: '访问次数',
      description: '访问的次数',
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

    const metric_params = getMetrics(metrics, this.metrics);
    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};
    let group_by = [];

    let options = {
      period: `${period[0]},${period[1]}`,
      group_by:metric_params.dimensions.join(','),
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;

    for (let metric of metric_params.metrics) {
      options.fields = metric;
      options.sort = metric;
      let ret = await userService.getUserIPStats(options);
      if (ret.result === 'ok') {
        ret.data.forEach(r => {
          r.load && (r.load = r.load.toFixed(2) + 'ms');
          r.ajax && (r.ajax = r.ajax.toFixed(2) + 'ms');
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
            }}
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [metric]);

        } else {
          result[metric] = {
            names: ret.data.map(r => joinDataLabel(r, metric_params.dimensions)),
            data: ret.data.map(r => getAppMetricValue(r, metric)),
          };
        }
      }
    }

    if (params.group_by) { 
      return {
        group_by: group_by,
      }
    } else {
      return result;
    }
  },

  transformer: '',
}
