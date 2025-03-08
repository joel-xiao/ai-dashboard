import appService from '@/service/app.service';
import { period_list } from '../util';
import { getAppsysOptions, getAppOptions } from '../apm_options';
import { getOptions, makeResult } from '../functions';

const APPLICAION_TYPES = ['mobile'];

export default {
  id: 'datasource-webview-timeseries',
  category: 'application',
  name: 'Webview时间线',
  type: 'array',
  ver: 1.1,
  order: 22,
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
    total: {
      type: Number,
      label: '访问数',
      unit: '次'
    },

    load: {
      type: Number,
      label: '页面加载时间',
      unit: 'ms'
    },

    ajax: {
      type: Number,
      label: '请求响应时间',
      unit: 'ms'
    },

    render: {
      type: Number,
      label: '页面渲染时间',
      unit: 'ms'
    },

    dom: {
      type: Number,
      label: 'DOM完成时间',
      unit: 'ms'
    },

    first: {
      type: Number,
      label: '首字节时间',
      unit: 'ms'
    },

    net: {
      type: Number,
      label: '网络时间',
      unit: 'ms'
    },

    request: {
      type: Number,
      label: '请求发起时间',
      unit: 'ms'
    },
  },

  requester: async function(args, metrics) {
    const default_fields = 'total,tolerated,frustrated';
    const { 
      isOK, 
      msg, 
      options, 
      appid 
    } = await getOptions.call(this, args, metrics, default_fields);
    if (!isOK) {
      return msg;
    }

    let ret = await appService.getWebAppTimeseries(appid, options);
    let result = makeResult.call(this, 'time', ret, options.fields.split(','));
    return result;
  },

  transformer: '',
}
