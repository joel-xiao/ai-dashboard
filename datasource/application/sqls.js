import sqlService from '@/service/sql';
import periodService from '@/service/period';
import { period_list } from '../util';
import { getAppsysOptions, getAppOptions } from '../apm_options';
import moment from 'moment';
import { getOptions, makeResult } from '../functions';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-sqls-states',
  category: 'application',
  name: 'SQL语句详情',
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
    }
  },
  metrics: {
    ts: {
      type: String,
      label: '时间',
    },

    // model: {
    //   type: String,
    //   label: 'SQL名称',
    // },

    appsysid: {
      type: String,
      label: '应用系统',
    },

    appid: {
      type: String,
      label: '应用',
    },

    gname: {
      type: String,
      label: '业务名称',
    },

    sql: {
      type: String,
      label: 'SQL语句',
    },

    agentid: {
      type: String,
      label: '探针',
    },

    dbhost: {
      type: String,
      label: 'DB主机',
    },

    dbtype: {
      type: String,
      label: '类型',
    },

    db: {
      type: String,
      label: '数据库',
    },

    bind_value: {
      type: String,
      label: '绑定值',
    },

    dur: {
      type: Number,
      label: '响应时间',
    },
  },

  requester: async function(args, metrics) {
    const default_fields = '';
    const { 
      isOK, 
      msg, 
      options, 
      appid,
    } = await getOptions.call(this, args, metrics, default_fields);
    if (!isOK) {
      return msg;
    }
  
    options.fields = '';
    let ret = await sqlService.getSqls(appid, options);
    let result = makeResult.call(this, 'raw', ret, options.fields?.split(','));
    result.forEach(r => {
      r.dur = periodService.timeFormat(r.dur);
      r.sql = r.src.template;
      r.ts = moment(r.ts).format('YYYY-MM-DD HH:mm:ss');
      r.appsysid = r?.appsysname || r.appsysid;
    });
    return result;
  },

  transformer: '',
}
