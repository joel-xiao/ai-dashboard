import npmService from '@/service/npm.service';
import { npm_period_list, numberToIp, string2TimestampRange } from '../util';
import store from "@/store";
import { getNetworkArgumentOptions } from '../npm_options';

export default {
  id: 'datasource-network-alarmlist',
  category: 'network',
  name: '告警列表',
  type: 'array',
  ver: 1.1,
  order: 14,
  arguments: {
    period: {
      type: Number,
      label: '时间',
      ctrl: 'select-and-time',
      default: 'past1hour',
      options: npm_period_list,
      required: true,
      validator: function (value) {
        return true;
      },
    },

    cfg: {
      type: String,
      label: '中控',
      ctrl: 'select',
      default: '',
      hide: true,
    },
    
    probe: {
      type: String,
      label: '探针',
      ctrl: 'select',
      required: true,
      dependencies: ['cfg'],
      options: async function (cfg) {
        return await getNetworkArgumentOptions('probe', [cfg]);
      }
    },

    interface: {
      type: String,
      label: '接口',
      ctrl: 'select',
      required: true,
      dependencies: ['cfg', 'probe'],
      options: async function (cfg, probId) {
        return await getNetworkArgumentOptions('interface', [cfg, probId]);
      }
    },

    vlan: {
      type: String,
      label: 'VLan',
      ctrl: 'select',
      required: false,
      requiredNotValues: [],
      dependencies: ['cfg', 'probe', 'interface'],
      options: async function(cfg, probe, instId) {
        return await getNetworkArgumentOptions('vlan', [cfg, probe, instId]);
      }
    },

    site: {
      type: String,
      label: '站点',
      ctrl: 'select',
      required: false,
      requiredNotValues: [],
      dependencies: ['cfg', 'probe', 'interface', 'vlan'],
      options: async function(cfg, probe, instId, vlan) {
        return await getNetworkArgumentOptions('site', [cfg, probe, instId, vlan]);
      }
    },

    pageSize: {
      type: Number,
      label: '每页数量',
      ctrl: 'input',
      required: false,
      default: 5,
      min: 1
    },

    autoScroll: {
      type: Boolean,
      label: '自动翻页',
      ctrl: 'switch',
      required: false,
      default: false,
    },
  },

  metrics: {
    timeStmap: { type: String, label: '告警时间' },
    targetId: { type: Number, label: '告警配置id' },
    alarmType: { type: Number, label:	'告警类型' },
    serverName: { type: String, label: '服务器别名' },
    instName: { type: String, label: '接口别名' },
    ruleName: { type:	String,	label: '规则别名' },
    baseLineTypeName: { type:	String,	label: '告警类型翻译' },
    siteName: { type:	String,	label: '站点别名' },
    vlanName: { type:	String,	label: 'vlan别名' },
    state: { type: Number,	label: '告警状态'},
    kpi: { type: String, label: '指标字段' },
    kpiName: { type: String, label: '指标翻译' },
    alarmMsg: { type:	String,	label: '告警内容' },
    alarmTargetName: { type: String, label: '告警对象' },
    baseLineAlarmType: { type: Number, label: '基线的告警类型' },
    actualValue: { type: Number, label: '触发阈值' },
    serverSiteName: { type:	String, label: '服务器站点别名' },
    patternName: { type: String, label: '模型别名' },
    messagetype: { type: Number, label: '业务类型' },
    messageName: { type: String, label: '业务别名' },
    id: { type:	Number, label: '告警记录id' },
    srctype: { type: Number, label: '数据来源对象' },
    analyzerid: { type:	String, label: '探针ip' },
    instid: { type: Number, label: '接口id' },
    ruleid: { type:	Number, label: '规则id' },
    alarmLevelName: { type:	String, label: '告警级别翻译' },
    alarmLevel: { type:	Number, label: '告警级别' },
    appProtoType: { type:	Number, label: '协议类型' },
    patternId: { type: Number, label: '模型id' },
    errorCode: { type: Number, label: '错误码' },
    baselineGroupId: { type: Number, label: '告警分组id' },
    linkLabelType: { type: Number, label: '链路聚合' },
    linkLabel: { type: Number, label: '告警绑定的链路值' },
    clientNetLabelType: { type:	Number, label: '客户端网络层聚合' },
    clientNetLabel: { type:	Number, label: '客户端网络层id' },
    serverNetLabelType: { type:	Number, label: '服务器网路层聚合' },
    serverNetLabel: { type:	Number, label: '服务器网络层id' },
  },

  checkArguments(args) {
    let self = this;
    let result = true;
    Object.keys(self.arguments).forEach(arg => {
      if (!result) { return }

      if (self.arguments[arg].required) {
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

    let period = string2TimestampRange(params.period);
    
    !this.pageNum && (this.pageNum = 0);

    if (params.autoScroll) {
      this.pageNum += 1;
    } else {
      this.pageNum = 1;
    }

    let options = {
      time: `${parseInt(period[0] / 1000)},${parseInt(period[1] / 1000)}`,
      instId: params.interface,
      pageSize: params.pageSize || 5,
      page: this.pageNum,
    }

    params.vlan && (options.vlan = params.vlan);
    params.site && (options.site = params.site);
    params.cfg && (options.cfg = params.cfg);

    let ret = await npmService.getAlarmInfoList(options);
  
    if (ret && ret.result === 'ok' && ret.data) {
      let data = ret.data.rows || [];

      let resultData = data.map(r => {
        let result = {};
        metrics.forEach((m, idx) => {
          result[m] = r[m];
          if(m==='analyzerid'){
            result[m] = numberToIp(result[m])
          }else{
          }
        });
        return result;
      });

      resultData.length < options.pageSize && (this.pageNum = 1);
      return resultData;
    }

    return [];
  },
  
  transformer: '',
}