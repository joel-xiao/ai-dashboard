import userService from '@/service/user.service';
import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics, mergeStatesGroupBy } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['web', 'mobile'];

export default {
  id: 'datasource-user-session-states',
  category: 'application',
  name: '用户会话',
  type: 'array',
  multiMetric: true,
  ver: 1.1,
  order: 2,
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
    appsysid: {
      type: Number,
      label: '应用系统',
      isDim: true,
    },

    appid: {
      type: Number,
      label: '应用',
      isDim: true,
      description: '访问应用',
    },
    
    province: {
      type: Number,
      label: '省份',
      isDim: true,
      description: '访问省份',
    },

    city: {
      type: Number,
      label: '城市',
      isDim: true,
      description: '访问城市的用户数',
    },

    device: {
      type: Number,
      label: '设备',
      isDim: true,
      description: '访问设备',
    },
    os: {
      type: Number,
      label: '操作系统',
      isDim: true,
      description: '系统',
    },
    
    resolution: {
      type: String,
      label: '分辨率',
      isDim: true
    },

    ip_addr: {
      type: String,
      label: 'IP地址',
      isDim: true
    },
    total: {
      type: Number,
      label: '会话数',
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
      fields: '',
      sort: '',
      group_by: metric_params.dimensions.join(',')
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    options.fields = metric_params.metrics.join(',');
    let ret = await userService.getSessionStats(options);
    if (ret.result === 'ok') {
      (ret.data || []).forEach(r => {
        if (r.type) {
          r.name = r.type;
        }
        r.appsysid_prim = r.appsysid;
        r.appsysid = r?.appsysname ? r.appsysname : r.appsysid;
      });
      result = ret.data;
    }
    
    return result;
  },

  transformer: '',
}
