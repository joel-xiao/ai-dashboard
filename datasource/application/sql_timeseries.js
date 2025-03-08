import sqlService from '@/service/sql';
import { period_list } from '../util';
import { getAppsysOptions, getAppOptions } from '../apm_options';
import { getOptions, makeResult } from '../functions';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-sql-timeseries',
  category: 'application',
  name: 'SQL时间线',
  type: 'array',
  ver: 1.1,
  order: 6,
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
      label: '查询次数',
      description: 'SQL查询次数',
      unit: '次'
    },

    tolerated: {
      type: Number,
      label: '缓慢数',
      description: 'SQL缓慢数',
      unit: '次'
    },

    frustrated: {
      type: Number,
      label: '极慢数',
      description: 'SQL极慢数',
      unit: '次'
    },
    dur: {
      type: Number,
      label: '响应时间',
      description: 'SQL平均响应时间',
      unit: 'ms'
    },
    sqlerr: {
      type: Number,
      label: '错误数',
      description: 'SQL错误数',
      unit: '次'
    },
    // sqlerr_rate: {
    //   type: Number,
    //   label: '错误率',
    //   description: 'SQL错误率',
    // },
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

    let ret = await sqlService.getSqlTimeseries(appid, options);
    let result = makeResult.call(this, 'time', ret, options.fields.split(','));
    return result;
  },

  transformer: '',
}
