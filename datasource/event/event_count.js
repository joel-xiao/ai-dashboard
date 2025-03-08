
import eventService from '@/service/event.service';
import appService from '@/service/app.service';
import modelService from '@/service/model.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics, hideEventArgFunc } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions, getAgentOptions, getAlarmMetricOptions } from '../apm_options';
import EventUtil from '@/views/event/util';

const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-event-count',
  category: 'application',
  name: '告警事件数量',
  type: 'object',
  ver: 1.1,
  order: 4,
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

    eventType: {
      type: String,
      label: '告警类型',
      ctrl: 'select',
      options: [
        { label: '所有', value: 'all' },
        { label: '应用告警', value: 'app' },
        { label: '请求告警', value: 'request' },
        { label: '业务请求告警', value: 'biz' },
        { label: 'VIP用户告警', value: 'vip' },
        { label: '应用心跳', value: 'agent' },
        { label: '应用状态', value: 'system' },
        { label: '程序异常', value: 'exception' },
      ],
      isShow: false, //不显示处理
      default: 'all',
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

    metric: {
      type: String,
      label: '告警指标',
      ctrl: 'select',
      dependencies: ['eventType'],
      options: (eventType) => { 
        return getAlarmMetricOptions(eventType);
      }
    },
    level: {
      type: String,
      label: '告警等级',
      ctrl: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '轻微', value: '1' },
        { label: '严重', value: '2' },
        { label: '紧急', value: '3' },
      ]
    },
  },
  metrics: {
    count: { type: String, label: '告警数' }
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
      if (self.arguments[arg].required && !self.arguments[arg].hide && types.includes(eventType?.val)) {
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
    let metric_params = getMetrics(metrics, this.metrics);
    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    let options = {
      period: `${period[0]},${period[1]}`,
      fields: 'total'
    };

    let filter = EventUtil.getEventTypeFilterStr(params.eventType);
    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    if (filter) options.filter = options.filter ? `${options.filter},${filter}` : options.filter;
    if (options.filter) options.filter = options.filter.replace(/group=/g, 'model_id=');
    if (options.group_by) options.group_by = options.group_by.replace(/group/g, 'model_id');

    if (params.metric && params.metric !== 'all') {
      options.filter += `,metric=${params.metric}`;
    }
    if (params.level && params.level !== 'all') {
      options.filter += `,level=${params.level}`;
    }
    options.filter?.startsWith(',') && (options.filter = options.filter.substr(1));

    let ret = await eventService.getEventStats(options);
    if (ret.result === 'ok') {
      (ret.data || []).forEach(r => {
        if (r?.model_id) {
          r.group = r.model_id;
        }
      })
      if (params.group_by) {
        let group_by = getStatesResultGroupBy(ret.data, params.group_by, (item) => {
          let total = 0;
          item.data.forEach(r => total += r.total);
          return {
            names: ['count'],
            data: [total]
          }
        });
        
        return {
          default: {},
          group_by: group_by,
        };
      } else {
        let total = 0;
        let data = ret.data;
        if (metric_params.dimensions.includes('model_id')) {
          data = data.filter(r => r.model_id);
        }
        data.forEach(r => total += r.total);
        return {
          default: {
            names: ['count'],
            data: [total]
          },
        };
      }
    }

    return {
      default: {
        names: ['count'],
        data: [0]
      }
    };
  },

  transformer: '',
}
