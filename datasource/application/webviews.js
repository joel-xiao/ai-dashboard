import moment from 'moment';
import appService from '@/service/app.service';
import periodService from '@/service/period';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile'];

export default {
  id: 'datasource-webviews',
  category: 'application',
  name: 'Webview详情数据',
  type: 'array',
  ver: 1.1,
  order: 23,
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
      type: Number,
      label: '应用系统',
    },
    appid: {
      type: Number,
      label: '应用',
    },
    model: {
      type: String,
      label: '页面名称',
    },
    app_version: {
      type: String,
      label: '应用版本'
    },
    domain: {
      type: String,
      label: '域名',
    },
    ip_addr: {
      type: String,
      label: 'IP地址',
    },
    device: {
      type: String,
      label: '设备'
    },
    browser: {
      type: String,
      label: '浏览器'
    },
    city: {
      type: String,
      label: '城市',
    },
    province: {
      type: String,
      label: '省份',
    },
    os: {
      type: String,
      label: '操作系统',
    },
    os_version: {
      type: String,
      label: '系统版本',
    },
    net_type: {
      type: String,
      label: '网络类型',
    },
    resolution: {
      type: String,
      label: '分辨率'
    },
    user_id: {
      type: String,
      label: '用户ID',
    },
    session_id: {
      type: String,
      label: '会话ID'
    },
    "navigationTiming#load_event": {
      type: Number,
      label: '页面加载时间',
    },
    "navigationTiming#ajax": {
      type: Number,
      label: '请求响应时间',
    },
    "navigationTiming#render": {
      type: Number,
      label: '页面渲染时间',
    },
    "navigationTiming#dom_ready": {
      type: Number,
      label: 'DOM完成时间',
    },
    "navigationTiming#first": {
      type: Number,
      label: '首字节时间',
    },
    "navigationTiming#tcp": {
      type: Number,
      label: '网络时间',
    },
    "navigationTiming#request": {
      type: Number,
      label: '请求发起时间',
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
      group_by: 'group,url',
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let fields = '';
    metrics && metrics.length > 0 && (fields = metrics.join(','));
    //fields && (options.fields = fields);

    let appParams = await getAppParams(params, options, this.arguments, false);
    options = appParams.options;
    let appid = appParams.appid;

    let ret = await appService.getWebpages(appid, options);
    if (ret.result === 'ok') {
      ret.data.forEach(r => {
        r['navigationTiming#load_event'] = periodService.timeFormat((r.navigation_timing?.load_event + r.navigation_timing?.load_event_pos));
        r['navigationTiming#render'] = periodService.timeFormat(r.navigation_timing?.render);
        r['navigationTiming#dom_ready'] = periodService.timeFormat(r.navigation_timing?.dom_ready);
        r['navigationTiming#first'] = periodService.timeFormat(r.navigation_timing?.first);
        r['navigationTiming#ajax'] = periodService.timeFormat(r.navigation_timing?.ajax);
        r['navigationTiming#request'] = periodService.timeFormat(r.navigation_timing?.request);
        r['navigationTiming#tcp'] = periodService.timeFormat(r.navigation_timing?.tcp);
        r['model'] = r?.model || '--';
        r.appsysid = r?.appsysname || r.appsysid;
      });

      result = ret.data;
    }
    
    return result;
  },

  transformer: '',
}
