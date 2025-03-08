import appService from '@/service/app.service';
import aiopsService from '@/service/aiops.service';
import periodService from '@/service/period';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { RequestStatsFilter } from '@/service/filters';
import { getAppsysOptions, getAppOptions } from '../apm_options';

export default {
  id: 'datasource-health-timeseries',
  category: 'application',
  name: '健康评分时间线',
  type: 'array',
  ver: 1.1,
  order: 3,
  arguments: {
    appsysid: {
      type: String,
      label: '应用系统ID',
      ctrl: 'multiple-select',
      options: async function() {
        const { result, cache } = await getAppsysOptions(this.appsys_options);
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
      dependencies: ['appsysid'],
      options: async function(appsysid) {
        const {
          result,
          cache,
          sys_cache,
         } = await getAppOptions(
            appsysid, 
            this.appsys_options, 
            this.app_options
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
    score: {
      type: Number,
      label: '分数',
      description: '分数',
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
    let granularity = periodService.getGranularity(period[0], period[1]);
    let options = {
      period: `${period[0]},${period[1]}`,
      granularity,
    };

    let queryInfo = this.parseQuery(query);
    
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
        params.appid = appQuery.val;
      }
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;

    let ret = await aiopsService.getHealthScoreTimeseries(options);
    if (ret.result === 'ok') {
      result = ret.data.map(r => {
        r.score = [r.timestamp, r.score ? Number(r.score.toFixed(2)) : 0];
        return r;
      });
    }

    return result;
  },
  
  transformer: '',
}