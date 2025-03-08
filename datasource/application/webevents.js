import appService from '@/service/app.service';
import periodService from '@/service/period';
import webService from '@/service/web.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { RequestFilter } from '@/service/filters';
import moment from "moment";
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile', 'web'];

export default {
  id: 'datasource-webapp-uevents',
  category: 'application',
  name: '用户行为详情数据',
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
    name: {
      type: String,
      label: '操作名称',
    },
    starttime: {
      type: String,
      label: '开始时间',
    },
    uevent_wait_text: {
      type: String,
      label: '用户等待时间',
    },
    load_text: {
      type: String,
      label: '加载时间',
    },
    render_text: {
      type: String,
      label: '渲染时间',
    },
    ajax_text: {
      type: String,
      label: '响应时间',
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
    
    params.method && (filter.method = params.method);
    params.path && (filter.path = params.path);

    let filterStr = Object.keys(filter).map(key => {
      return `${key}=${params[key]}`;
    }).join(',');

    let options = {
      period: `${period[0]},${period[1]}`,
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

    let appParams = await getAppParams(params, options, this.arguments, false);
    options = appParams.options;
    appid = appParams.appid;
    
    if (!this.umodels) {
      let opt = {
        skip: 0,
        limit: 1000,
      };
      let ret = await webService.getModels(opt);
      this.umodels = ret.data;
    }

    let ret = await appService.getWebAppUEvents(appid, options);
    if (ret.result === 'ok') {
      ret.data.forEach(r => {
        r.load_text = periodService.timeFormat(r.load) || '--';
        r.ajax_text = periodService.timeFormat(r.ajax) || '--';
        r.render_text = periodService.timeFormat(r.render) || '--';
        r.uevent_wait_text = periodService.timeFormat(r.uevent_wait) || '--';

        r.starttime = moment(r.start).format('YYYY-MM-DD HH:mm:ss');

        let umodel = r.id.split('^')[0];
        let model = this.umodels.find(model => model.id === umodel);
        model && (r.name = model.name);
      });

      result = ret.data;
    }

    return result;
  },

  transformer: '',
}
