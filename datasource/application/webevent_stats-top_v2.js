import appService from '@/service/app.service';
import periodService from '@/service/period';
import webService from '@/service/web.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics, joinDataLabel, mergeStatesGroupBy, getAppMetricValue } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile', 'web'];

export default {
  id: 'datasource-webapp-uevent-stats-top--v2',
  category: 'application',
  name: '用户行为统计',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 5,
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

    bizOnly: {
      type: Boolean,
      label: '仅业务',
      ctrl: 'switch',
      default: true,
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
    appid: {
      type: String,
      label: '应用',
      isDim: true,
    },
    uevent_model: {
      type: String,
      isDim: true,
      label: '操作名称',
    },
    uevent_count: {
      type: Number,
      label: '操作次数',
      unit: '次'
    },
    load: {
      type: String,
      label: '加载时间',
      unit: 'ms'
    },
    render: {
      type: String,
      label: '渲染时间',
      unit: 'ms'
    },
    ajax: {
      type: String,
      label: '响应时间',
      unit: 'ms'
    },
    uevent_wait: {
      type: String,
      label: '用户等待时间',
      unit: 'ms'
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

    const is_uevent_model = metrics.some( m => m === 'uevent_model');
    if (!this.models && is_uevent_model) {
      let ret = await webService.getModels();
      this.models = ret?.data || [];
    }

    const metric_params = getMetrics(metrics, this.metrics);
    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};
    let group_by = [];
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

    if (params.bizOnly || metric_params.dimensions.includes('group')) {
      options.is_model = true;
      // options.filter && (options.filter += `,is_model=true`);
      // !options.filter && (options.filter = `is_model=true`);
    }

    for (let kpi of metric_params.metrics) {
      options.sort = kpi === 'uevent_wait' ? 'uevent_count' : kpi;
      options.fields = kpi === 'uevent_wait' ? 'uevent_count' : kpi;
      let ret = await appService.getWebAppUEventStats(appid, options);

      ret.data.forEach( item => {
        if (is_uevent_model) {
          let model = this.models.find(model => model.id === item.uevent_model);
          model && (item.uevent_model = model.name);
        }
      });

      if (kpi === 'uevent_wait') {
        ret.data.sort((a, b) => b.uevent_wait - a.uevent_wait);
      }

      if (ret.result === 'ok') {
        ret.data = ret.data.filter(r => r[kpi]);
        (ret.data || []).forEach(r => {
          if (r.appsysid) {
            r.appsysid_prim = r.appsysid
            r.appsysid = r?.appsysname || r.appsysid;
          }
        })
        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) => {
            return { 
              [kpi]: {
              names: item.data.map(r => joinDataLabel(r, metric_params.dimensions)),
              showValue: item.data.map(r => kpi !== 'uevent_count' ? periodService.timeFormat(getAppMetricValue(r, kpi)) : getAppMetricValue(r, kpi)),
              data: item.data.map(r => getAppMetricValue(r, kpi)),
              unit: this.metrics[kpi]?.unit,
            }}
          });

          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [kpi]);

        } else {
          result[kpi] = {
            names: ret.data.map(r => joinDataLabel(r, metric_params.dimensions)),
            showValue: ret.data.map(r => kpi !== 'uevent_count' ? periodService.timeFormat(getAppMetricValue(r, kpi)) : getAppMetricValue(r, kpi)),
            data: ret.data.map(r => getAppMetricValue(r, kpi)),
            unit: this.metrics[kpi]?.unit,
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
