import appService from '@/service/app.service';
import modelService from '@/service/model.service';
import search from '@/service/search';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy } from '../util';
import { RequestStatsFilter } from '@/service/filters';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-application-states-count',
  category: 'application',
  name: '请求统计数字',
  type: 'object',
  ver: 1.1,
  order: 2,
  multiMetric: true,
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
    
    limit: {
      type: Number,
      label: '数量',
      ctrl: 'input',
      default: 10,
    },
    bizOnly: {
      type: Boolean,
      label: '仅业务',
      ctrl: 'switch',
      default: false,
    }
  },
  metrics: {
    path: {
      type: String,
      label: '路径',
      isDim: true,
      description: '请求的路径',
    },
    method: {
      type: String,
      label: '方法',
      isDim: true,
      description: 'http的方法',
    },
    agent_id: {
      type: String,
      label: '探针',
      isDim: true,
      description: '探针',
    },

    host: {
      type: String,
      label: '主机',
      isDim: true,
      description: '主机',
    },

    ip_addr: {
      type: String,
      label: 'IP地址',
      isDim: true,
      description: 'IP地址',
    },

    ret_code: {
      type: String,
      label: '状态码',
      isDim: true,
      description: '状态码',
    },

    city: {
      type: String,
      label: '城市',
      isDim: true,
      description: '城市',
    },

    province: {
      type: String,
      label: '省份',
      isDim: true,
      description: '省份',
    },
    
    total: {
      type: Number,
      label: '请求数',
      description: '请求总数',
    },

    user_count: {
      type: Number,
      label: '用户数',
      description: '用户访问的总数',
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

  parseQuery(query) {
    let filter = [];
    if (query && query.length > 0) {
      query.forEach(part => {
        let params =  part.split('=');
        let metric = params[0];
        let val = params[1];

        switch(metric) {
          case 'appid':
            filter.push({ key: 'appid', val });
            break;
          case 'appsysid':
            filter.push({ key: 'appsysid', val });
            break;
          case 'ts':
            let ts = val.split('~');
            filter.push({ key: 'ts', val: ts });
            break;
          default:
            let find = RequestStatsFilter.find(filter => filter.key === metric);
            if (find) {
              filter.push({ key: metric, val });
            }
            break;
        }
      });
    }

    return filter;
  },

  requester: async function(args, metrics, query) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);
    
    let result = {};
    let fields = 'total';
    metrics.find(r => r === 'user_count') && (fields = 'user_count');
    metrics.find(r => r === 'dur') && (fields = 'dur');
    let _fields = fields.split(',');
    if (typeof params.sort === 'string' && !_fields.some( field => field === params.sort)) _fields.push(params.sort);
    fields= _fields.join(',');

    let group_by = [];
    for (let kpi of metrics) {
      if (kpi === 'total' || kpi === 'user_count')
        continue;
      let userCount = kpi === 'user_count';
      let options = {
        period: `${period[0]},${period[1]}`,
        fields: userCount ? 'user_count' : 'total',
        group_by: kpi,
        sort: userCount ? 'user_count' : 'total',
      };
      
      if (params.sort) {
        options.sort = params.sort;
      }
  
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

      let appParams = await getAppParams(params, options, this.arguments);
      options = appParams.options;
      appid = appParams.appid;
      
      //let ret = await search.getStats(appid, options);
      let ret = await appService.getAppRequestStats(appid, options);
      if (ret?.result === 'ok') {
        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) =>{
            return { 
              [kpi]: {
              names: item.data.map(r => r[kpi] || '--'),
              data: item.data.map(r => r.total)
            }}
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [kpi]);

        } else {
          result[kpi] = {
            names: ret.data.map(r => r[kpi] || '--'),
            data: ret.data.map(r => r.total),
          }
        }
      }
    };
    if (params.group_by) { 
      return {
        group_by: group_by,
      }
    } else {
      return result;
    }
  },

  transformer: '',
}
