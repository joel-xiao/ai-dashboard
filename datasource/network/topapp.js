import npmService from '@/service/npm.service';
import util from "@/views/npm/util";
import { npm_period_list, string2TimestampRange } from '../util';
import { getNetworkArgumentOptions } from '../npm_options';

export default {
  id: 'datasource-network-top-app',
  category: 'network',
  name: 'TOP应用',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 13,
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
/*
    app: {
      type: String,
      label: '应用',
      ctrl: 'select',
      dependencies: ['cfg'],
      options: async function(cfg) {
        !this.appTree && (this.appTree = {});
        if (this.appTree[cfg]) {
          return this.appTree[cfg].map(r => {
            return {
              label: r.title,
              value: r.topoNum,
            }
          });
        }

        let ret = await npmService.getAppTree({cfg});
        this.appTree[cfg] = ret.data || [];
        let result = this.appTree.map(r => {
          return {
            label: r.title,
            value: r.topoNum,
          }
        });

        return result;
      }
    },
*/
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

    top: {
      type: Number,
      label: 'Top',
      ctrl: 'input',
      required: true,
      default: 5,
      min: 1
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
    
    let result = {};
    for (let metric of metrics) {
      let options = {
        startTime: parseInt(period[0] / 1000),
        endTime: parseInt(period[1] / 1000),
        topNum: params.top,
        kpi: metric
      }
      
      params.interface && (options.instId = params.interface);
      params.rule && (options.rule = params.rule);
      params.vlan && (options.vlanId = params.vlan);
      params.site && (options.siteId = params.site);
      params.cfg && (options.cfg = params.cfg);

      let ret = await npmService.getTopnApp(options);
      if (ret.data && Array.isArray(ret.data) && ret.data.length > 0) {
        let data = [];
        let name = [];
        let showValue = [];

        let u = ret.data[0][metric]?.unit || ''
        let unit;
        if(u){
          ret.data.forEach(r => {
            name.push(r.ruleName);
            data.push(parseFloat(r[metric].num));
            showValue.push((r[metric].num) + (r[metric].unit));
          });
        }else{
          u = this.metrics[metric]?.unit;
          if (!u) { 
            let data_unit = ret.data[0].unit;
            u = util.getMinUnit(data_unit);
          }
          let maxVal = Math.max(...ret.data.map(r => r[metric]?.value || r[metric]));
          let unitKey = util.getUnitKey(u);
          unit = unitKey ? util.getFitNumUnit(maxVal, unitKey) : null;

          ret.data.forEach(r => {
            name.push(r.ruleName);
            data.push(unit ? util.getFitValue(r[metric]?.value || r[metric], unit.unit.proportion) : r[metric]?.value || r[metric]);
            showValue.push((r?.num || r[metric].num) + (r?.unit || r[metric].unit));
          });

          u = unit?.unit?.name || ''
        }

        result[metric] = {
          names: name, 
          data,
          showValue,
          unit: u,
        };
      }
    }
    return result;
  },
  
  transformer: '',
}