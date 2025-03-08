import moment from 'moment';
import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { getAppsysOptions, getAppOptions } from '../apm_options';
import { getOptions, makeResult } from '../functions';

const APPLICAION_TYPES = ['mobile'];

export default {
  id: 'datasource-crashs',
  category: 'application',
  name: '崩溃详情数据',
  type: 'array',
  ver: 1.1,
  order: 9,
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
    ts: {
      type: String,
      label: '发生时间',
    },
    appsysid: {
      type: String,
      label: '应用系统',
    },
    appid: {
      type: String,
      label: '应用',
    },
    desc: {
      type: String,
      label: '崩溃名称'
    },
    app_version: {
      type: String,
      label: '应用版本',
    },
    os: {
      type: String,
      label: '操作系统',
    },
    
    device: {
      type: String,
      label: '设备型号',
    },
    user_id: {
      type: String,
      label: '用户ID',
    },
    session_id: {
      type: String,
      label: '会话ID',
    },
    error: {
      type: String,
      label: '异常信息',
    },
    // browser: {
    //   type: String,
    //   label: '浏览器',
    // },
    city: {
      type: String,
      label: '城市',
    },
    province: {
      type: String,
      label: '省份',
    },
    
    ip: {
      type: String,
      label: 'IP',
    }
  },

  requester: async function(args, metrics) {
    const kpis = [...metrics];
    if (metrics.find(r => r === 'os') && !metrics.find(r => r === 'os_version')) {
      kpis.push('os_version');
    }

    const default_fields = '';
    const { 
      isOK, 
      msg, 
      options, 
      appid,
      params,
    } = await getOptions.call(this, args, kpis, default_fields);
    if (!isOK) {
      return msg;
    }

    let ret = await appService.getAppCrashes(appid, options);
    let result = makeResult.call(this, 'raw', ret, options.fields.split(','));
    const gRet = await appService.getAppGroups();
    const groups = gRet.data;
    result.forEach(r => {
      r.ts = moment(r.ts).format('YYYY-MM-DD HH:mm:ss');
      r.os = r.os_version;
      const find = groups.find(g => g.id === r.appsysid);
      find && (r.appsysid = find.name);
    });
    return result;
  },

  transformer: '',
}
