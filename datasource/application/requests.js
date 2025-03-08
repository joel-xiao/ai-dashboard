import moment from 'moment';
import requestService from '@/service/httprequest';
import appService from '@/service/app.service';
import periodService from '@/service/period';
import { period_list, getStatusText } from '../util';
import { RequestFilter } from '@/service/filters';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';
import { getOptions, makeResult } from '../functions';

const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-application-request',
  category: 'application',
  name: '请求详情数据',
  type: 'array',
  ver: 1.1,
  order: 4,
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

    method: {
      type: String,
      label: '方法',
      ctrl: 'select',
      options: [
        { label: '全部', value: '' },
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'PUT', value: 'PUT' },
        { label: 'OPTION', value: 'OPTION' },
        { label: 'SERVICE', value: 'SERVICE' },
        { label: 'TRACE', value: 'TRACE' },
      ],
    },

    path: {
      type: String,
      label: '路径',
      ctrl: 'input',
    },

    limit: {
      type: Number,
      label: '数量',
      ctrl: 'input',
      default: 10,
      min: 1,
    },
    bizOnly: {
      type: Boolean,
      label: '仅业务',
      ctrl: 'switch',
      default: false,
    }
  },
  metrics: {
    ts: {
      type: Number,
      label: '开始时间',
    },
    appsysid: {
      type: String,
      label: '应用系统',
    },
    appid: {
      type: String,
      label: '应用',
    },
    method: {
      type: String,
      label: '方法',
      output: true,
    },
    ret_code: {
      type: String,
      label: '状态码',
      output: true,
    },
    dur: {
      type: String,
      label: '响应时间',
    },
    agent_id: {
      type: String,
      label: '探针',
      output: true,
    },
    ip_addr: {
      type: String,
      label: 'IP',
      output: true,
    },
    trxid: {
      type: String,
      label: '事务',
      output: true,
    },
    status: {
      type: Number,
      label: '状态',
      output: true,
    },
    city: {
      type: String,
      label: '城市',
      output: true,
    },
    province: {
      type: String,
      label: '省份',
      output: true,
    },
    host: {
      type: String,
      label: '主机',
      output: true,
    },
    user_id: {
      type: String,
      label: '用户ID',
      output: true,
    },
    session_id: {
      type: String,
      label: '会话ID',
      output: true,
    },
    span_id: {
      type: String,
      label: 'SpanID',
      output: true,
    },
    model: {
      type: String,
      label: '业务名称',
      output: true,
    },
    path: {
      type: String,
      label: '路径',
      output: true,
    },
    body: {
      type: String,
      label: '请求体',
    },
    res_body: {
      type: String,
      label: '返回体',
    },
    header: {
      type: String,
      label: '请求头',
    },
    res_header: {
      type: String,
      label: '返回头',
    },
    agent_id: {
      type: String,
      label: '探针ID'
    },
    code: {
      type: String,
      label: '返回码',
    },
  },

  requester: async function(args, metrics, query) {
    const default_fields = '';
    const { 
      isOK, 
      msg, 
      options, 
      appid,
      params,
    } = await getOptions.call(this, args, metrics, default_fields);
    if (!isOK) {
      return msg;
    }

    let filters = [];
    params.method && filters.push(`method=${params.method}`);
    params.path && filters.push(`path=${params.path}`);
    params.bizOnly && filters.push(`is_model=true`);
    if (filters.length > 0) {
      options.filter && (options.filter += ',');
      options.filter += filters.join(',');
    }
  
    const not_fields = ['res_body', 'res_header', 'body', 'header'];
    // options.fields = options.fields.split(',').filter( field => !not_fields.some( not_field => not_field === field)).join(',');
    options.apiv2 = !options.fields.split(',').some( field => not_fields.some( r => r === field));

    let ret = await requestService.queryRequests(appid, options);
    let result = makeResult.call(this, 'raw', ret, options.fields.split(','));

    const gRet = await appService.getAppGroups();
    const groups = gRet.data;
    result.forEach(r => {
      r.dur_prim = r.dur;
      r.dur = periodService.timeFormat(r.dur);
      r.ts = moment(r.ts).format('YYYY-MM-DD HH:mm:ss');
      const find = groups.find(g => g.id === r.appsysid);
      find && (r.appsysid = find.name);
      r.status = getStatusText(r.status);
    });
    return result;

/*

    if (!this.checkArguments(args)) {
      return 'arg fail';
    }
    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};
    let filter = {};
    let fields = metrics.join(',');
    
    params.method && (filter.method = params.method);
    params.path && (filter.path = params.path);

    let filterStr = Object.keys(filter).map(key => {
      return `${key}=${params[key]}`;
    }).join(',');

    let options = {
      period: `${period[0]},${period[1]}`,
      fields,
      sort: 'ts',
    };

    filterStr && (options.filter = filterStr);
    
    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let queryInfo = this.parseQuery(query);
    let appid = params.appid;
    if (queryInfo.length > 0) {
      options.filter = queryInfo.filter(r => !['ts', 'appid'].find(key => key === r.key) )
        .map(r => `${r.key}=${r.val}`)
        .join(',');
      !options.filter && delete options.filter;
      
      let tsQuery = queryInfo.find(r => r.key === 'ts');
      if (tsQuery) {
        options.period = `${tsQuery.val[0]},${tsQuery.val[1]}`;
      }

      let appQuery = queryInfo.find(r => r.key === 'appid');
      if (appQuery) {
        appid = appQuery.val;
        params.appid = appid;
      }
    }

    if (params.bizOnly) {
      options.filter && (options.filter += `,exists=model`);
      !options.filter && (options.filter = `exists=model`);
    }

    let appParams = await getAppParams(params, options, this.arguments, false);
    options = appParams.options;
    appid = appParams.appid;
    const gRet = await appService.getAppGroups();
    const groups = gRet.data;
    let ret = await requestService.queryRequests(appid, options);
    if (ret.result === 'ok') {
      result = ret.data;
      result.forEach(r => {
        r.dur_prim = r.dur;
        r.dur = periodService.timeFormat(r.dur);
        r.ts = moment(r.ts).format('YYYY-MM-DD HH:mm:ss');
        const find = groups.find(g => g.id === r.appsysid);
        find && (r.appsysid = find.name);
        r.status = getStatusText(r.status);
      });
    }
    return result;*/
  },

  transformer: '',
}
