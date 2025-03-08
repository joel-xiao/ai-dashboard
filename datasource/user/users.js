import userService from '@/service/user.service';
import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['web', 'mobile'];

export default {
  id: 'datasource-users',
  category: 'application',
  name: '用户详情',
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
    id: {
      type: String,
      label: '用户ID',
    },
    appsysid: {
      type: String,
      label: '应用系统',
    },
    appid: {
      type: String,
      label: '应用',
    },
    ip: {
      type: String,
      label: 'IP地址',
    },
    province: {
      type: String,
      label: '省份',
    },
    city: {
      type: String,
      label: '城市',
    },
    browser: {
      type: String,
      label: '浏览器',
    },
    device: {
      type: String,
      label: '设备型号',
    },
    os: {
      type: String,
      label: '操作系统',
    },
    resolution: {
      type: String,
      label: '分辨率',
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
      period: `${period[0]},${period[1]}`
    };
    options.fields = metric_params.metrics.join(',');
    options.group_by = metric_params.dimensions.join(',')
    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }


    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let ret = await userService.getUsers(options);
    if (ret.result === 'ok') {
      result = ret.data;
      const gRet = await appService.getAppGroups();
      const groups = gRet.data;
      result.forEach(r => {
        if (r.appsysid) {
          const find = groups.find(g => g.id === r.appsysid);
          find && (r.appsysid = find.name);
        }
      })
    }

    return result;
  },

  transformer: '',
}
