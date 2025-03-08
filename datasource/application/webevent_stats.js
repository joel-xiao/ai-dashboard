import appService from '@/service/app.service';
import periodService from '@/service/period';
import webService from '@/service/web.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile', 'web'];

export default {
  id: 'datasource-webapp-uevent-stats',
  category: 'application',
  name: '用户行为统计',
  type: 'array',
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
      isDim: true
    },
    uevent_model: {
      type: String,
      isDim: true,
      label: '操作名称',
    },
    page_model: {
      type: String,
      isDim: true,
      label: '页面名称',
    },
    uevent_count: {
      type: Number,
      label: '操作次数',
    },
    ajax_text: {
      type: String,
      label: '平均响应时间',
    },
    uevent_wait_text: {
      type: String,
      label: '平均等待时间',
    },
    render_text: {
      type: String,
      label: '平均渲染时间',
    },
    load_text: {
      type: String,
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

    const is_uevent_model = metrics.some( m => m === 'uevent_model');
    if (!this.umodels && is_uevent_model) {
      let ret = await webService.getModels();
      this.umodels = ret?.data || [];
    }

    let fields = [
      'ajax',
      'ajax_pos',
      'dom',
      'dom_content',
      'dom_pos',
      'dom_ready',
      'dom_ready_pos',
      'first',
      'first_pos',
      'front',
      'frustrated',
      'html',
      'html_pos',
      'init_dom_tree',
      'init_dom_tree_pos',
      'load',
      'load_event',
      'load_event_pos',
      'net',
      'render',
      'render_pos',
      'request',
      'request_pos',
      'server',
      'tolerated',
      'total',
      'uevent_count',
    ]
    const metric_params = getMetrics(metrics, this.metrics, ['uevent_wait_text']);
    let result = {};
    let options = {
      period: `${period[0]},${period[1]}`,
      group_by: metric_params.dimensions.join(','),
      fields: metric_params.metrics.map(metric => metric.split('_text')[0]).join(','),
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    let ret = await appService.getWebAppUEventStats(appid, options);
    if (ret.result === 'ok') {
      result = ret.data || [];
      result.forEach(r => {
        r.load_text = periodService.timeFormat(r.load) || '--';
        r.ajax_text = periodService.timeFormat(r.ajax) || '--';
        r.render_text = periodService.timeFormat(r.render) || '--';
        r.uevent_wait_text = periodService.timeFormat(r.uevent_wait) || '--';

        let model = this.umodels.find(model => model.id === r.uevent_model);
        model && (r.uevent_model = model.name);
      });
      
      /*
      let data = [];
      let name = [];
      data.push(...result.data.map(r => r.total));
      name.push(...result.data.map(r => {
        return {
          name: r[params.field],
          key: 'total',
        }
      }));
    
      result = {
        default: {
          names: name,
          data,
        }
      };*/
    }

    return result;
  },

  transformer: '',
}
