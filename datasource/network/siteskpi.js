import npmService from '@/service/npm.service';
import util from "@/views/npm/util";
import { npm_period_list, string2TimestampRange } from '../util';
import { getNetworkArgumentOptions } from '../npm_options';

export default {
  id: 'datasource-network-sitekpis',
  category: 'network',
  name: '站点指标',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 16,
  arguments: {
    topNum: {
      type: Number,
      label: 'Top',
      required: true,
      ctrl: 'input',
      default: 5,
      min: 1
    },

    period: {
      type: Number,
      label: '时间',
      ctrl: 'select',
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
      ctrl: 'multiple-select',
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
      options: async function (cfg, instId) {
        if (!instId) return [];

        let rules = await npmService.getRules({ instId, cfg });
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

    sortname: {
      type: String,
      label: '排序指标',
      ctrl: 'select',
      options: function () {
        const list = util.getGroupKpis('rule');
        let result = Object.keys(list).map(key => { 
          return {
            label: list[key].label,
            value: key,
          }
        });

        result.unshift({
          label: '无',
          value: '',
        });
        return result;
      },
      default: '',
    },

    sortorder: {
      type: String,
      label: '排序类型',
      ctrl: 'select',
      default: 'desc',
      options: [{
        label: '倒序',
        value: 'desc',
      }, {
        label: '正序',
        value: 'asc',
      }],
    },
  },

  metrics: util.getGroupKpis('rule'),

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

    let options = {
      startTime: parseInt(period[0] / 1000),
      endTime: parseInt(period[1] / 1000),
      instId: params.interface,
      kpis: metrics.join(','),
      kpiExtend: 1,
      topNum: parseInt(params.topNum),
    };

    params.rule && (options.rule = params.rule);
    params.cfg && (options.cfg = params.cfg);
    params.vlan && (options.vlan = params.vlan);
    params.site && (options.site = params.site);

    if (params.sortname && params.sortorder) {
      options.sortname = params.sortname;
      options.sortorder = params.sortorder;
    }

    const ret = await npmService.getSitesKpi(options);

    if (ret.result === 'ok') {
      if (!Array.isArray(ret.data)) ret.data = [];
      const result = {};
      metrics.forEach(kpi => {
        let u = this.metrics[kpi]?.unit;
        let maxVal = Math.max(...ret.data.map(r => r[kpi].value));
        let unitKey = util.getUnitKey(u);
        let unit = unitKey ? util.getFitNumUnit(maxVal, unitKey) : null;

        result[kpi] = {
          names: ret.data.map(r => r.name),
          data: ret.data.map(r => unit ? util.getFitValue(r[kpi].value, unit.unit.proportion) : r[kpi].value),
          unit: unit ? unit.unit.name : '',
          showValue: ret.data.map(r => `${r[kpi].num} ${r[kpi].unit} `)
        }
      });
      return result;
    }

    return [];
  },
  
  transformer: '',
}
