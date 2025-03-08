import periodService from '@/service/period';
import appService from '@/service/app.service';
import eventService from '@/service/event.service';
import modelService from '@/service/model.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, hideEventArgFunc } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions, getAgentOptions } from '../apm_options';
import util from '@/views/event/util';

const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-event-timeseries',
  category: 'application',
  name: '告警时间线',
  type: 'array',
  ver: 1.1,
  order: 2,
  arguments: {
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
      required: false
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
      },
      hide: false
    },
    agentid: {
      type: String,
      label: '实例',
      ctrl: 'multiple-select-cascader',
      dependencies: ['appid'],
      options: async function(appid) {
        const { result, cache } = await getAgentOptions(appid, this.agents);
        this.agents = cache;
        return result;
      },
      required: false,
      output: true,
      hide: false
    },
    eventType: {
      type: String,
      label: '告警类型',
      ctrl: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '应用指标', value: 'app' },
        { label: '业务请求', value: 'request' },
     //   { label: '业务请求告警', value: 'biz' },
        { label: 'VIP用户', value: 'vipuser' },
        { label: '应用心跳', value: 'agent' },
        { label: '应用状态', value: 'system' },
        { label: '程序异常', value: 'exception' },
      ],
      isShow: false, //不显示处理
      default: 'all',
    },
  },
  metrics: {
    total: {
      type: Number,
      label: '告警数'
    },
    // all: {
    //   type: Number,
    //   label: '告警数',
    // },
    // app: {
    //   type: Number,
    //   label: '应用告警',
    // },
    // request: {
    //   type: Number,
    //   label: '业务请求告警',
    // },
    // biz: {
    //   type: Number,
    //   label: '业务功能告警',
    // },
    // vipuser: {
    //   type: Number,
    //   label: 'VIP用户告警',
    // },
    // system: {
    //   type: Number,
    //   label: '应用状态告警',
    // },
    // agent: {
    //   type: Number,
    //   label: '应用心跳告警',
    // },
    // exception: {
    //   type: Number,
    //   label: '异常状态告警',
    // }
  },

  isHide(metrics, arg, args) {
    if (arg === 'biz' || arg === 'agentid') {
      this.arguments.biz.hide = false;
      this.arguments.agentid.hide = false;

      const hideBizTypes = ['app', 'exception', 'system', 'agent', 'vip'];
      const hideAgentTypes = ['all', 'app', 'request', 'biz', 'exception', 'vip'];
      const eventType = args.find(r => r.arg === 'eventType');
      if (eventType && eventType.val) {
        if (arg === 'biz' && hideBizTypes.includes(eventType.val)) {
          this.arguments.biz.hide = true;
        }
        if (arg === 'agentid' && hideAgentTypes.includes(eventType.val)) {
          this.arguments.agentid.hide = true;
        }
      }
    }

    return this.arguments[arg].hide;
  },
  
  checkArguments(args) {
    let self = this;
    let result = true;
    const eventType = args.find(r => r.arg === 'eventType');
    const types = ['agent', 'system'];
    Object.keys(self.arguments).forEach(arg => {
      if (!result) { return }
      hideEventArgFunc(arg, args, self.arguments);
      if (self.arguments[arg].required && !self.arguments[arg].hide && eventType && types.includes(eventType.val)) {
        let find = args.find(r => r.arg === arg);
        if (!find || !find.val) {
          result = false;
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

  requester: async function(args, metrics) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    const alias_bys = {
      group: 'model_id',
    }
    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};
    let options = {
      period: `${period[0]},${period[1]}`,
      granularity: periodService.getGranularity(period[0], period[1]),
      fields: 'total'
    };

    let filter = util.getEventTypeFilterStr(params.eventType);
    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    if (filter) options.filter = options.filter ? `${options.filter},${filter}` : options.filter;
    if (options.filter) options.filter = options.filter.replace(/group=/g, alias_bys.group + '=');
    if (options.group_by) options.group_by = options.group_by.replace(/group/g, alias_bys.group);

    if (options.filter) {
      options.filter = options.filter.replace('appid=_all', '');
    }

    options.filter.endsWith(',') && (options.filter = options.filter.substring(0, options.filter.length - 1));
    
    let ret = await eventService.getEventTimeseries(options);
    if (ret.result === 'ok') {
      if (params.group_by) {
        result.total = ret.data.map(r => {
          r.total = [r.timestamp, r.total || 0];
          r.total_unit = '次';
          return r;
        });
      } else {
        result.total = ret.data.map(r => {
          return [r.timestamp, r.total || 0];
        });
        result.total_unit = '次';
      }
    }

    if (params.group_by) {
      let filters = params.group_by.split(',');
      filters.push('timestamp');
      let keys = Object.keys(result);
      let groups = [];
      keys.forEach( key => {
        result[key].forEach(r => {
          let items = groups;
          filters.forEach(by => {
            const alias_by = alias_bys[by] || by;
            items = items.filter( item => item[by] === r[alias_by]);
          })
          items = items[0]
          if (items) {
            items[key] = r.total || 0;
            items['filter-' + key] = true;
          } else {
            let group = {[key]: r.total, merge: true, ['filter-' + key]: true};
            filters.forEach(by => {
              const alias_by = alias_bys[by] || by;
              group[by] = r[alias_by] || '';
            })
            !group.total_unit && (group.total_unit = '次');
            groups.push(group);
          }
        })
      });
      
      groups.forEach( r => {
        keys.forEach(key => {
          if (!r[key]) {
            r[key] = [r.timestamp, 0]
          } else {
            r[key] = [r[key][0], r[key][1] || 0];
          }
        })
      })
      groups = groups.sort( (a,b) => a.timestamp - b.timestamp);
      groups = groups.sort( (a,b) => a.timestamp - b.timestamp).map( r => { delete r.timestamp; return r});
      return groups;

    } else {
      let data = [];
      if(result[Object.keys(result)[0]]) {
        result[Object.keys(result)[0]].forEach((r, idx) => {
          let item = {};
          Object.keys(result).forEach(key => {
            item[key] = result[key][idx];
          });
          data.push(item);
        });
      }
  
      return data;
    }
  },

  transformer: '',
}
