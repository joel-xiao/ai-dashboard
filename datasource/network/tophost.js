import npmService from '@/service/npm.service';
import util from "@/views/npm/util";
import { npm_period_list, string2TimestampRange } from '../util';
import { getNetworkArgumentOptions } from '../npm_options';
export default {
  id: 'datasource-network-tophost-series',
  category: 'network',
  name: 'TOP主机',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 12,
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

    rule: {
      type: String,
      label: '应用',
      ctrl: 'select',
      required: false,
      requiredNotValues: [''],
      dependencies: ['cfg', 'interface'],
      options: async function(cfg, instId) {
        if (!instId) return [];
        
        let rules = await npmService.getRules({instId, cfg});
        let result = ((rules && Array.isArray(rules.data)) ? rules.data : []).map(r => {
          return {
            label: r.ruleName,
            value: r.ruleId,
          };
        });

        result.unshift({ label: '全部', value: '' });
        return result;
      }
    },

    top: {
      type: Number,
      label: 'Top',
      ctrl: 'input',
      required: true,
      default: 5,
      min: 1
    },
  },

  metrics: util.getAllKpis(),

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

    let result = {};
    for (let metric of metrics) {
      let options = {
        start_time: parseInt(period[0] / 1000),
        end_time: parseInt(period[1] / 1000),
        instance_id: params.interface,
        top: params.top,
        kpi: metric,
      }

      params.rule && (options.rule = params.rule);
      params.vlan && (options.vlan = params.vlan);
      params.site && (options.site = params.site);
      params.cfg && (options.cfg = params.cfg);

      let ret = await npmService.getHostTopn(options);
      if (ret && ret.data && ret.data.list && Array.isArray(ret.data.list)) {
        const data = [];
        const names = [];
        const showNames = [];

        let u = this.metrics[metric]?.unit;
        let maxVal = Math.max(...ret.data.list.map(r => r[metric]));
        let unitKey = util.getUnitKey(u);
        let unit = unitKey ? util.getFitNumUnit(maxVal, unitKey) : null;

        ret.data.list.forEach(r => {
          showNames.push(r.hostName || r.host);
          names.push(r.host);
          data.push(unit ? util.getFitValue(r[metric], unit.unit.proportion) : r[metric]);
        });

        result[metric] = {
          names, 
          data,
          showNames,
          unit: unit ? unit.unit.name : u,
        };
      }
    }

    return result;
  },
  
  transformer: '',
}