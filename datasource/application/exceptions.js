import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { RequestFilter } from '@/service/filters';
import moment from "moment";
import { getAppsysOptions, getAppOptions } from '../apm_options';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-application-exceptions',
  category: 'application',
  name: '异常详情数据',
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
    time: {
      type: String,
      label: '时间',
      output: true,
    },
    appsysid: {
      type: String,
      label: '应用系统'
    },
    appid: {
      type: String,
      label: '应用'
    },
    name: {
      type: String,
      label: '异常名称',
      output: true,
    },
    message: {
      type: String,
      label: '错误信息',
      output: true,
    },
    method: {
      type: String,
      label: '方法',
      output: true,
    },
    class: {
      type: String,
      label: '类',
    },
    interface: {
      type: String,
      label: '程序接口',
      output: true,
    },
    url: {
      type: String,
      label: 'URL',
      output: true,
    },
    agentid: {
      type: String,
      label: '探针',
      output: true,
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
            let find = RequestFilter.find(filter => filter.key === metric);
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
    let filter = {};
    metrics = metrics.filter(r => r !== 'time');
    let fields = metrics.join(',') + ',ts';
    
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
      }
    }

    let appParams = await getAppParams(params, options, this.arguments, false);
    options = appParams.options;
    appid = appParams.appid;
    const gRet = await appService.getAppGroups();
    const groups = gRet.data;
    let ret = await appService.getAppExceptions(appid, options);
    if (ret.result === 'ok') {
      ret.data.forEach(r => {
        r.time = moment(r.ts).format('YYYY-MM-DD HH:mm:ss');
        const find = groups.find(g => g.id === r.appsysid);
        find && (r.appsysid = find.name)
      });
      result = ret.data;
    }

    return result;
  },

  transformer: '',
}
