import npmService from '@/service/npm.service';
import util from "@/views/npm/util";
import { period_list, getPrecisions } from '../util';
import { getNetworkArgumentOptions } from '../npm_options';

export default {
  id: 'datasource-network-appkpi',
  category: 'network',
  name: '应用',
  type: 'array',
  ver: 1.1,
  order: 8,
  arguments: {
    period: {
      type: Number,
      label: '时间',
      ctrl: 'select',
      default: 60 * 60 * 1000,
      options: period_list,
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

    precision: {
      type: String,
      label: '精度',
      ctrl: 'select',
      default: '',
      dependencies: ['period'],
      options: getPrecisions
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

    let period;
    if (params.period === 1) {
      period = params.sysPeriod;
    } else {
      period = [
        Date.now() - params.period,
        Date.now(),
      ];
    }

    let precision = util.getGranularityName(period[0], period[1]);
    let options = {
      startTime: parseInt(period[0] / 1000),
      endTime: parseInt(period[1] / 1000),
      ruleId: params.rule,
      instId: params.interface,
      precision: params.precision || precision,
      kpis: metrics.join(','),
    }

    params.vlan && (options.vlan = params.vlan);
    params.cfg && (options.cfg = params.cfg);

    let ret = await npmService.getFlowStats(options);
    if (ret.result === 'ok') {
      let kpi = ret.data.kpi;
      let data = ret.data.data;

      return data.map(r => {
        let result = {};
        metrics.forEach((m, idx) => {
          let kpiName = m.toLowerCase();
          result[m] = [r.utc, r[kpiName]];
          result[m + '_unit'] = kpi[kpiName].unit;
        });
        return result;
      });
    }

    return [];
  },
  
  transformer: '',
}