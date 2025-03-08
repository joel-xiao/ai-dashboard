import npmService from '@/service/npm.service';
import util from "@/views/npm/util";
import { npm_period_list, string2TimestampRange, getRealTimePrecisions, dealPrecision } from '../util';
import { getNetworkArgumentOptions } from '../npm_options';

export default {
  id: 'datasource-network-host-series',
  category: 'network',
  name: '主机',
  type: 'array',
  ver: 1.1,
  order: 10,
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

    host: {
      type: String,
      label: '主机地址',
      ctrl: 'input',
      required: true,
    },

    precision: {
      type: Number,
      label: '精度',
      ctrl: 'select',
      default: 60,
      dependencies: ['period'],
      options: getRealTimePrecisions
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
    
    let options = {
      start_time: parseInt(period[0] / 1000),
      end_time: parseInt(period[1] / 1000),
      instance_id: params.interface,
      precision: dealPrecision(params.precision),
      host: params.host,
      kpi_list: metrics.join(','),
    }
    
    params.vlan && (options.vlan = params.vlan);
    params.site && (options.site = params.site);
    params.cfg && (options.cfg = params.cfg);

    let ret = await npmService.getHostSeries(options);
    if (ret.data && Array.isArray(ret.data.list)) {
      let result = ret.data.list.map(r => {
        let result = {};
        for(let m of metrics) {
          let u = this.metrics[m].unit;
          let maxVal = Math.max(...ret.data.list.map(r => r[m]));
          let unitKey = util.getUnitKey(u);
          let unit =　unitKey ? util.getFitNumUnit(maxVal, unitKey) : null;
          let val = unit ? util.getFitValue(r[m], unit.unit.proportion) : r[m];

          result[m] = [r.utc * 1000, val];
          result[m + '_unit'] = unit ? unit.unit.name : '';
        }
        return result;
      });

      return result;
    }

    return [];
  },
  
  transformer: '',
}