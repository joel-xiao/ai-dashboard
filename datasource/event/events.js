import moment from 'moment';
import eventService from '@/service/event.service';
import appService from '@/service/app.service';
import modelService from '@/service/model.service';

import util from "@/views/event/util";
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, hideEventArgFunc } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions, getAgentOptions, getAlarmMetricOptions } from '../apm_options';

const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-events',
  category: 'application',
  name: '告警详情数据',
  type: 'array',
  ver: 1.1,
  order: 3,
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
      old_version_ctrl: 'select',
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
        { label: '所有', value: 'all' },
        { label: '应用指标', value: 'app' },
        { label: '业务请求', value: 'request' },
 //       { label: '业务请求告警', value: 'biz' },
        { label: 'VIP用户', value: 'vip' },
        { label: '应用心跳', value: 'agent' },
        { label: '应用状态', value: 'system' },
        { label: '程序异常', value: 'exception' },
      ],
      isShow: false, //不显示处理
      default: 'all',
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
    limit: {
      type: Number,
      label: '数量',
      ctrl: 'input',
      default: 10,
      min: 1,
    }
  },
  metrics: {
    ts: {
      type: String,
      label: '发生时间'
    },
    name: {
      type: String,
      label: '告警名称',
    },
    level: {
      type: String,
      label: '告警等级'
    },
    type: {
      type: String,
      label: '告警对象',
    },
    appsysid: {
      type: String,
      label: '应用系统',
    },
    appid: {
      type: String,
      label: '应用',
    },
    metric: {
      type: String,
      label: '指标',
    },
    content: {
      type: String,
      label: '事件内容',
    },
    vipuser_name: {
      type: String,
      label: 'VIP用户',
    },
    model_id: {
      type: String,
      label: '业务名称'
    },
    agentid: {
      type: String,
      label: '应用实例'
    }
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

    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    const must_fields = [ 
      "id",
      "agentid",
      "alert_id",
      "average",
      "bottom",
      "top",
      "class",
      "level",
      "model_id",
      "reason",
      "threshold",
      "type",
      "ts",
      "value",
    ].join(',');
    let fields = metrics.filter(r => r !== 'content').join(',');
    let result = {};
    let options = {
      period: `${period[0]},${period[1]}`,
      fields: must_fields + ',' + fields,
    };

    // metric 指标 key 必传,否则会导致指标类型判断错误
    if (!options.fields?.includes('metric')) options.fields = options.fields + ',metric';

    if (params.limit) {
      options.skip = params.skip || 0;
      if (!isNaN(params.limit)) {
        options.limit = params.limit;
      } else {
        options.limit = 10;
      }
    }

    let filter = util.getEventTypeFilterStr(params.eventType);
    let appParams = await getAppParams(params, options, this.arguments, false);
    options = appParams.options;
    if (params.eventType === 'agent') options.fields += ',ip';
    if (filter) options.filter = options.filter ? `${options.filter},${filter}` : options.filter;
    if (options.filter) options.filter = options.filter.replace(/group=/g, 'model_id=');

    if (params.metric && params.metric !== 'all') {
      options.filter += `,metric=${params.metric}`;
    }
    if (params.level && params.level !== 'all') {
      options.filter += `,level=${params.level}`;
    }
    options.filter?.startsWith(',') && (options.filter = options.filter.substr(1));

    let models = [];
    let opt = {
      limit: 1000,
      skip: 0
    }
    let res= await modelService.getModels(opt);
    if (res.result === 'ok') {
      models = res.data;
    }
    let ret = await eventService.getEvents(options);
    if (ret.result === 'ok') {
      result = ret.data;
      result.forEach(r => {
        let findGroup = models.find(m => m.id === r.model_id);
        r.group_prim = r.model_id;
        r.model_id = findGroup ? findGroup.name : '--';
        r.metricVal = r.metric;
        r.metric_i18n = 'i18n:' + util.getMetricText(r.metric);
        r.content = util.getFieldContent(r);
        r.metric = util.getMetricCH(r.metric);
        r.type = util.getFieldTypeName(r);
        r.level_showValue = util.getLevelSpan(r.level);
        r.level = util.getLevelName(r.level);
        r.agentid = (Array.isArray(r.agentid) && r.agentid.length > 0) ? r.agentid.join(',') : '--';
        r.ts = moment(r.ts).format('YYYY-MM-DD HH:mm:ss');
        r.appsysid_prim = r.appsysid;
        r.vipuser_name = r?.vipuser_name || '--';
        r.appsysid = r?.appsysname ? r.appsysname : r.appsysid;
      });
    }

    return result;
  },

  transformer: '',
}
