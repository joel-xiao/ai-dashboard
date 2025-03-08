import appService from '@/service/app.service';
import { RequestStatsFilter } from '@/service/filters';
import { period_list } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';
import { getOptions, makeResult } from '../functions';

const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-application-timeseries',
  category: 'application',
  name: '请求时间线',
  type: 'array',
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
            APPLICAION_TYPES
          );
        
        this.appsys_options = sys_cache;
        this.app_options = cache;
        return result;
      },
      required: true,
      output: true,
    },

    biz: {
      type: String,
      label: '业务',
      ctrl: 'multiple-select-cascader',
      required: false,
      dependencies: ['appid'],
      options: async function(appid) {
        const { result, cache } = await getModelOptions(appid, this.models);
        this.models = cache;
        return result;
      }
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
      label: '请求数',
      description: '请求总数',
      output_val: 'status=1',
      output: true,
      unit: '次'
    },
    fast: {
      type: Number,
      label: '快速数',
      output: true,
      unit: '次'
    },
    slow: {
      type: Number,
      label: '缓慢数',
      description: '缓慢请求数',
      unit: '次'
    },
    slow_rate: {
      type: Number,
      label: '缓慢率',
      description: '缓慢请求率',
      unit: '%',
    },
    frustrated: {
      type: Number,
      label: '极慢数',
      description: '极慢请求数',
      unit: '次'
    },
    frustrated_rate: {
      type: Number,
      label: '极慢率',
      description: '极慢请求率',
      unit: '%',
    },
    fail: {
      type: Number,
      label: '失败数',
      description: '失败请求数',
      unit: '次'
    },
    fail_rate: {
      type: Number,
      label: '失败率',
      description: '失败请求率',
      unit: '%',
    },
    err: {
      type: Number,
      label: '错误数',
      description: '错误请求数',
      unit: '次'
    },
    err_rate: {
      type: Number,
      label: '错误率',
      description: '错误请求率',
      unit: '%',
    },
    dur: {
      type: Number,
      label: '响应时间',
      description: '平均请求响应时间',
      unit: 'ms',
    },
    apdex: {
      type: Number,
      label: 'APDEX',
      description: 'APDEX',
    },
    neterr: {
      type: Number,
      label: '网络错误数',
      unit: '次'
    },
    httperr: {
      type: Number,
      label: 'http错误数',
      unit: '次'
    },
    err_4xx: {
      type: Number,
      label: '4XX 错误数',
      unit: '次'
    },
    err_5xx: {
      type: Number,
      label: '5XX 错误数',
      unit: '次'
    },
    err_4xx_rate: {
      type: Number,
      label: '4XX 错误率',
      unit: '%',
    },
    err_5xx_rate: {
      type: Number,
      label: '5XX 错误率',
      unit: '%',
    }
  },

  requester: async function(args, metrics, query) {
    const default_fields = 'total,dur,fast,err_rate,slow,slow_rate,frustrated,frustrated_rate,fail,fail_rate,err,apdex';
    const { 
      isOK, 
      msg, 
      options, 
      appid 
    } = await getOptions.call(this, args, metrics, default_fields, query, RequestStatsFilter);
    if (!isOK) {
      return msg;
    }

    let ret = await appService.getTimeseries(appid, options);
    let result = makeResult.call(this, 'time', ret, options.fields.split(','));
    return result;
  },
  
  transformer: '',
}
