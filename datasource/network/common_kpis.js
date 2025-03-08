import npmService from '@/service/npm.service';
import util from "@/views/npm/util";
import { npm_period_list, getPrecisions, parsePeriod, fixNpmPeriod } from '../util';
import { getNetworkArgumentOptions } from '../npm_options';

export default {
  id: 'datasource-network-common',
  category: 'network',
  name: '网络时序',
  type: 'array',
  ver: 1.1,
  order: 17,
  arguments: {
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
      label: 'VLAN',
      ctrl: 'select',
      required: false,
      requiredNotValues: [''],
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
      requiredNotValues: [''],
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
      requiredNotValues: [],
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
        return result;
      }
    },

    precision: {
      type: String,
      label: '精度',
      ctrl: 'select',
      default: 'min',
      dependencies: ['period'],
      options: getPrecisions
    },
  },

  metrics: util.getGroupKpis('all'),

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

  requester: async function (args, metrics, query, realtime, instance) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod, true);

    let precision = params.precision
    if (!precision) {
      let list = getPrecisions(period);
      precision = list.find(r => r.default);
    }

    period = fixNpmPeriod(period, precision);
    const isExtern = (instance && instance.isExtern) ? 1 : 0;

    let options = {
      serTime: period,
      instId: params.interface,
      precision: precision,
      kpis: metrics.join(','),
      kpiExtend: isExtern
    }

    params.vlan && (options.vlan = params.vlan);
    params.site && (options.site = params.site);
    params.rule && (options.ruleId = params.rule);
    params.cfg && (options.cfg = params.cfg);
    // options['unitAdaption'] = '0';
    let ret = await npmService.getFlowStats(options);
    if (ret && ret.result === 'ok' && ret.data) {
      let kpi = ret.data.kpi;
      let data = ret.data.data;

      // return data.map(r => {
      //   let result = {};
      //   metrics.forEach((kpiName, idx) => {
      //     const metric = kpiName.toLowerCase();
      //     const u = this.metrics[kpiName]?.unit;
      //     const maxVal = Math.max(...data.map(s => s[metric]));
      //     const unitKey = util.getUnitKey(u);
      //     const unit = unitKey ? util.getFitNumUnit(maxVal, unitKey) : null;
      //     const showVal = unit ? util.getFitValue(r[metric], unit.unit.proportion) : r[metric];
      //     result[kpiName] = [r.utc, (unit?.unit?.name === '%' ? (r[metric] * 100) : r[metric]), showVal];
      //     result[kpiName + '_unit'] = unit ? unit?.unit?.name : '';
      //     result['showValue_' + kpiName] = showVal + (unit ? unit?.unit?.name : '');
      //   });
      //   return result;
      // });
      return data.map(r => {
        let result = {};
        metrics.forEach((m, idx) => {
          let kpiName = m.toLowerCase();
          let unit = kpi[kpiName].unit;
          result[m] = [r.utc, r[kpiName]];
          result[m + '_unit'] = unit;
        });
        return result;
      });
    }

    return [];
  },

  transformer: '',
}