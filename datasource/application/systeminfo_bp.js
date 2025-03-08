import appService from '@/service/app.service';
import modelService from '@/service/model.service';
import agentService from '@/service/agent.service';
import statusService from '@/service/status';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics, getStatusText } from '../util';
import { RequestStatsFilter } from '@/service/filters';
import periodService from '@/service/period';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-system-info-bp',
  category: 'application',
  name: '系统统计数据',
  type: 'object',
  ver: 1.2,
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
    syscount: {
      type: String,
      label: '应用系统数',
    },
    appcount: {
      type: String,
      label: '应用数',
    },
    agentcount: {
      type: String,
      label: '实例数',
    },
    modelcount: {
      type: String,
      label: '业务数',
    }
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

  getStatusFilter(status) {
    const filter = {
      slow: statusService.enumStatusProfile({ time: [1] })
        .map(s => `status=${s}`)
        .join(","),
      frustrated: statusService.enumStatusProfile({ time: [2]})
        .map(s => `status=${s}`)
        .join(","),
      httperr: statusService.enumStatusProfile({ error: [2]})
        .map(s => `status=${s}`)
        .join(","),
      neterr: statusService.enumStatusProfile({ error: [1]})
        .map(s => `status=${s}`)
        .join(","),
      err_4xx: 'err_4xx=1',
      err_5xx: 'err_5xx=1',
    }
    return filter[status];
  },

  requester: async function(args, metrics, query) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let syscount = 0;
    let appcount = 0;
    let agentcount = 0;
    let modelcount = 0;

    let ret = await appService.getAppGroups();
    if (ret && ret.data) {
      syscount = ret.data.length;
      ret.data.forEach(sys => {
        if (sys.apps && sys.apps.length > 0) {
          sys.apps.forEach(app => {
            appcount += app.appid.length;
          });
        }
      });
    }

    ret = await modelService.getModels({skip: 0, limit: 10000,});
    if (ret && ret.data) {
      modelcount = ret.data.length;
    }

    ret = await agentService.fetchAgents('_all', {
      is_all: true,
      fields: 'appid,id,ip,server,service_type,hostname,version,status,start_timestamp,last_ts,collection_status,gc,os,os_version,pid,vm,collection_status'
    });

    if (ret && ret.data) {
      agentcount = ret.data.filter( r => r.collection_status === 'true').length;
    }

    return {
      syscount: {
        data: [syscount],
        names: ['应用系统数'],
      },
      appcount: {
        data: [appcount],
        names: ['应用数'],
      },
      agentcount: {
        data: [agentcount],
        names: ['实例数'],
      },
      modelcount: {
        data: [modelcount],
        names: ['业务数'],
      },
    };
  },

  transformer: '',
}
