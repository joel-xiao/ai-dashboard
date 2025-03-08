import agentService from '@/service/agent.service';
import appService from '@/service/app.service';
import vipuserService from '@/service/vipuser.service';
import eventService from '@/service/event.service';
import baselineService from '@/service/baseline.service';
import modelService from '@/service/model.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, mergeStatesGroupBy, getMetrics, joinDataLabel, getAppMetricValue, hideEventArgFunc } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions, getAgentOptions } from '../apm_options';
import util from '@/views/event/util';

const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-event-states--v2',
  category: 'application',
  name: '告警事件统计',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 1,
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
      hide:false
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
      required: true,
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
        { label: 'VIP用户', value: 'vip' },
        { label: '应用心跳', value: 'agent' },
        { label: '应用状态', value: 'system' },
        { label: '程序异常', value: 'exception' },
      ],
      isShow: false, //不显示处理
      default: 'all',
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
    appsysid: {
      type: String,
      label: '应用系统',
      isDim: true
    },
    appid: {
      type: String,
      label: '应用',
      isDim: true
    },
    type: {
      type: String,
      label: '告警对象',
      isDim: true
    },
    metric: {
      type: String,
      label: '指标',
      isDim: true
    },
    level: {
      type: Number,
      label: '告警等级',
      isDim: true
    },

    name: {
      type: String,
      label: '告警名称',
      isDim: true
    },
    
    model_id: {
      type: String,
      label: '业务名称',
      isDim: true
    },
    
    agentid: {
      type: String,
      label: '应用实例',
      isDim: true
    },
    total: {
      type: String,
      label: '告警数'
    }
  },
  
  isHide(metrics, arg, args) {
    if (arg === 'biz' || arg === 'agentid') {
      this.arguments.biz.hide = false;
      this.arguments.agentid.hide = false;

      const hideBizTypes = ['app', 'exception', 'system', 'agent', 'vip'];
      const hideAgentTypes = ['all', 'app', 'request', 'biz', 'exception', 'vip'];
      const eventType = args.find(r => r.arg == 'eventType');
      if (eventType && eventType.val) {
        if (arg === 'biz' && hideBizTypes.includes(eventType.val)) {
          this.arguments.biz.hide = true;
        }
        if (arg === 'agentid' && hideAgentTypes.includes(eventType.val)) {
          this.arguments.agentid.hide = true;
        }
      } else if (!eventType && arg === 'agentid') {
        this.arguments.agentid.hide = true;
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
      if (self.arguments[arg].required && !self.arguments[arg].hide && types.includes(eventType.val)) {
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

  getUserNameByID(id) {
    let vip = this.vipusers.find(r => r.user_id === id);
    if (vip) {
      return vip.name;
    }

    return id;
  },

  async loadVipUser() {
    let ret = await vipuserService.getVipUserConfigs();
    this.vipusers = ret.data.map(r => {
      return {
        name: r.name,
        user_id: r.type === 'user_id' ? r.code : undefined,
        user_ip: r.type === 'ip' ? r.code : undefined,
        id: r.id,
      };
    });
  },

  requester: async function(args, metrics) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);
    const metric_params = getMetrics(metrics, this.metrics);
    let result = {};

    let options = {
      period: `${period[0]},${period[1]}`,
      group_by: metric_params.dimensions.join(','),
      sort: 'total',
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }
    
    let filter = util.getEventTypeFilterStr(params.eventType);
    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    if (filter) options.filter = options.filter ? `${options.filter},${filter}` : options.filter;
    if (options.filter) options.filter = options.filter.replace(/group=/g, 'model_id=');
    if (options.group_by) options.group_by = options.group_by.replace(/group/g, 'model_id');

    let group_by = [],
        models = [];

    if (metric_params.dimensions.find(r => r === 'model_id')) {
      let ret = await modelService.getModels({
        limit: 1000,
        skip: 0
      });

      if (ret.result === 'ok') {
        models = ret.data;
      }
    }

    await this.loadVipUser();
    
    for (let metric of metric_params.metrics) {
      options.sort = metric;
      options.fields = metric;
      let ret = await eventService.getEventStats(options);
      if (ret.result === 'ok') {
        (ret.data || []).sort((a, b) => b.total - a.total);
        ret.data.forEach(r => {
          let findGroup = models.find(m => m.id === r.model_id);
          r.group_prim = r.model_id;
          r.model_id = findGroup?.name || r.model_id || '--';
          r.metric = util.getMetricCH(r.metric);
          r.type = util.getFieldTypeName(r);
          r.level = util.getLevelName(r.level);
          r.agentid = Array.isArray(r.agentid) ? r.agentid.join(',') : r.agentid || '';
          r.appsysid_prim = r.appsysid;
          r.appsysid = r?.appsysname ? r.appsysname : r.appsysid;
        });

        if (params.group_by) {
          let groupByResult = getStatesResultGroupBy(ret.data, params.group_by, (item) =>{
            return { 
              [metric]: {
              names: item.data.map(r => joinDataLabel(r, metric_params.dimensions)),
              data: item.data.map(r => getAppMetricValue(r, metric))
            }}
          });
          group_by = mergeStatesGroupBy(group_by, groupByResult, params.group_by, [metric]);

        } else {
          result[metric] = {
            names: ret.data.map(r => joinDataLabel(r, metric_params.dimensions)),
            data: ret.data.map(r => getAppMetricValue(r, metric)),
          };
        }
      }
    }

    if (params.group_by) {
      return {
        group_by: group_by,
      };
    } else {
      return result;
    }
  },

  transformer: '',
}
