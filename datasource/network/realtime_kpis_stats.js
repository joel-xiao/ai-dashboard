import npmService from '@/service/npm.service';
import util from "@/views/npm/util";
import { npm_period_list, getRealTimePrecisions } from '../util';
import { getNetworkArgumentOptions } from '../npm_options';

export default {
  id: 'datasource-network-rtk',
  category: 'network',
  name: '网络指标汇总',
  type: 'object',
  ver: 1.1,
  order: 17,
  arguments: {
    period: {
      type: String,
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
      options: async function(cfg, instId) {
        if (!instId) return [];
        
        let rules = await npmService.getRules({instId, cfg});
        let result = (rules && Array.isArray(rules.data) ? rules.data : []).map(r => {
          return {
            label: r.ruleName,
            value: r.ruleId,
          };
        });
        return result;
      }
    },

    precision: {
      type: Number,
      label: '精度',
      ctrl: 'select',
      default: 60,
      dependencies: ['period'],
      options: getRealTimePrecisions
    },

    delay: {
      type: Number,
      label: '数据时间补偿',
      ctrl: 'input',
      required: false,
      // dependencies: ['period'],
      // showArgsDependencies: [['past1second','past120second']],
      // dependencies: ['realtime'],
      showArgsDependencies: [60 * 1000],
      min: 1,
      default: 5,
      unit: 's'
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

  requester: async function(args, metrics, query, realtime, instance) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);

    let period;
    if (params.period === 1) {
      period = params.sysPeriod;
      period = `${parseInt(period[0] / 1000)},${parseInt(period[1] / 1000)}`;
    } else if (Array.isArray(params.period)) {
      period = [parseInt(params.period[0] / 1000), parseInt(params.period[1] / 1000)];
    } else {
      period = params.period;
    }

    // if(!(params.period && params.period.includes('second'))) {
    //   delete params.delay;
    // }
    args.forEach(arg => {
      let _arg = this.arguments[arg.arg];
      if(_arg && Array.isArray(_arg.showArgsDependencies) && Array.isArray(_arg.dependencies)) {
        let _arg_idx = _arg.dependencies.findIndex( arg => arg === 'realtime');
        if(_arg_idx >= 0 && realtime > 0 && realtime < _arg.showArgsDependencies[_arg_idx]) {
        } else {
          delete params.delay;
        }
      }
    });

    
    const isExtern = (instance && instance.isExtern) ? 1 : 0;

    let options = {
      serTime: period,
      card: params.interface,
      kpi: metrics.join(','),
      kpiExtend: isExtern,
    }

    params.vlan && (options.vlan = params.vlan);
    params.site && (options.site = params.site);
    params.rule && (options.rule = params.rule);
    params.cfg && (options.cfg = params.cfg);
    params.delay && (options.delay = params.delay);
    params.precision && (options.precision = params.precision);

    options.precision >= 60 && delete options.delay;

    (params.group_by && typeof(params.group_by) === 'string') && (params.group_by = [params.group_by]);
    const isGroupBy = Array.isArray(params.group_by) && params.group_by.length > 0 && params[params.group_by[0]].includes(',');

    let ret = isGroupBy ? 
      await npmService.getRealTimeKpiInfoList(options) : 
      await npmService.getRealTimeKpiInfo(options);

    if (ret && ret.result === 'ok' && ret.data && Array.isArray(ret.data.list)) {
      let data = ret.data.list;
      if (isGroupBy) {
        let result = {
          default: {},
          group_by: [],
        };

        let groupby = params.group_by[0];
        groupby === 'interface' && (groupby = 'card');
        const groupby_val = options[groupby] &&  options[groupby].split(',') || [];
        groupby_val.forEach(g => {
          const groupData = data.find(r => r.id == g);
          if (groupData) {
            const item = {
              names: groupData.kpiList.map((k, idx) => metrics[idx]),
              data: groupData.kpiList.map(k => k.num + ' ' + k.unit),
            };
            item[params.group_by[0]] = g;
            result.group_by.push(item);
          }
        });
        return result;
      } else if (params?.group_by && params.group_by.length > 0) {
          let groupby = params.group_by[0];
          groupby === 'interface' && (groupby = 'card');
          
          let result = {
            default: {},
            group_by: [{
              names: data.map((r, idx) => metrics[idx]),
              data: data.map(r => r.num + ' ' + r.unit),
              [params.group_by[0]] : options[groupby] &&  options[groupby] || ''
            }],
          };
          return result;
      } else {
        let result = {
          default: {
            names: data.map((r, idx) => metrics[idx]),
            data: data.map(r => r.num + ' ' + r.unit),
          }
        }
        return result;
      }
    }

    return [];
  },
  
  transformer: '',
}