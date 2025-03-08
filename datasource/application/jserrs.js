import moment from 'moment';
import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile','web'];

export default {
  id: 'datasource-jserrs',
  category: 'application',
  name: '脚本错误详情',
  type: 'array',
  ver: 1.1,
  order: 17,
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
    appsysid: {
      type: String,
      label: '应用系统',
    },
    appid: {
      type: String,
      label: '应用',
    },
    ts: {
      type: String,
      label: '时间',
    },
    view: {
      type: String,
      label: '错误页面',
    },
    ip: {
      type: String,
      label: 'IP地址',
    },
    os: {
      type: String,
      label: '操作系统',
    },
    browser: {
      type: String,
      label: '浏览器',
    },
    user_id: {
      type: String,
      label: '用户ID',
    },
    session_id: {
      type: String,
      label: '会话ID',
    },
    resolution: {
      type: String,
      label: '分辨率'
    },
    city: {
      type: String,
      label: '城市',
    },
    province: {
      type: String,
      label: '省份',
    },
    error: {
      type: String,
      label: '错误信息',
    },
    url: {
      type: String,
      label: '访问地址',
    },
    app_version: {
      type: String,
      label: '应用版本',
    },
    device: {
      type: String,
      label: '设备',
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
      sort: 'ts',
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let fields = '';
    metrics && metrics.length > 0 && (fields = metrics.join(','));
    fields && (options.fields = fields);

    let appParams = await getAppParams(params, options, this.arguments, false);
    options = appParams.options;
    let appid = appParams.appid;
    const gRet = await appService.getAppGroups();
    const groups = gRet.data;
    let ret = await appService.getWebAppErrors(appid, options);
    if (ret.result === 'ok') {
      result = ret.data;
      result.forEach(r => {
        const find = groups.find(g => g.id === r.appsysid);
        find && (r.appsysid = find.name);
        r.ts = moment(r.ts).format('YYYY-MM-DD HH:mm:ss');
      })
    }
    
    return result;
  },

  transformer: '',
}
