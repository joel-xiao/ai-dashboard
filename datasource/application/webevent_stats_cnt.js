import appService from '@/service/app.service';
import periodService from '@/service/period';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy,getMetrics } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile', 'web'];

export default {
  id: 'datasource-webapp-uevent-cnt',
  category: 'application',
  name: '用户行为统计数量',
  type: 'object',
  multiMetric: false,
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
  },
  metrics: {
    uevent_count: {
      type: Number,
      label: '操作次数',
    },
    ajax: {
      type: Number,
      label: '平均响应时间',
    },
    uevent_wait: {
      type: Number,
      label: '平均等待时间',
    },
    render: {
      type: Number,
      label: '平均渲染时间',
    },
    load: {
      type: Number,
      label: '平均加载时间',
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

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;
    // 
    options.fields = metrics.filter(r => r !== 'uevent_wait').join(',');
    // options.group_by = 'uevent_model';
    let ret = await appService.getWebAppUEventStats(appid, options);
    if (ret.result === 'ok') {
      ret.data.forEach(r => {
        r.load = periodService.timeFormat(r.load) || '--';
        r.ajax = periodService.timeFormat(r.ajax) || '--';
        r.render = periodService.timeFormat(r.render) || '--';
        r.uevent_wait = periodService.timeFormat(r.uevent_wait) || '--';
      });

      if (params.group_by) {
        let group_by = [];
        ret.data.forEach( item => {
          group_by.push({
            appsysid: item.appsysid,
            appid: item.appid,
            group: item.group,
            names: metrics.map(key => {
              return {
                name: this.metrics[key]?.label,
                key: key,
              }
            }),
            data: metrics.map( key => item[key] || 0),
          });
        }) 
        result['group_by'] = group_by;
        result['default'] = {};
      } else {
        let item = ret.data && ret.data[0] || {};
        result['default'] = {
          names: metrics.map(key => {
            return {
              name: this.metrics[key]?.label,
              key: key,
            }
          }),
          data: metrics.map( key => item[key] || 0),
        }
      }
    }
    
    return result;
  },

  transformer: '',
}
