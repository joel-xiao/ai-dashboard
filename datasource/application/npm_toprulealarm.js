import npmService from '@/service/npm.service';
import appService from '@/service/app.service';
import util from "@/views/npm/util";
import { npm_period_list, getPrecisions, parsePeriod, fixNpmPeriod } from '../util';
import { getNetworkArgumentOptions } from '../npm_options';

export default {
  id: 'datasource-appsys-npmtoprules',
  category: 'application',
  name: 'NPM的TOP规则告警',
  type: 'Object',
  ver: 1.1,
  order: 200,

  arguments: {
    appsysid: {
      type: String,
      label: '应用系统ID',
      ctrl: 'multiple-select',
      options: async function() {
        const { result, cache } = await getAppsysOptions(this.appsys_options);
        this.appsys_options = cache;
        return result;
      },
      required: true,
      output: true,
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
  },


  metrics: {
    name: {
      type: String,
      label: '规则'
    },

    total: {
      type: String,
      label: '次数',
      unit: '次'
    },
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

  async getRules(appsysids) {
    if (!this.appGroups) {
      const ret = await appService.getAppGroups();
      if (ret && ret.data) {
        this.appGroups = ret.data;
      }
    }

    !Array.isArray(appsysids) && (appsysids = [appsysids]);

    const ret = [];
    for (let sys of appsysids) {
      const sysInfo = this.appGroups.find(r => r.id === sys);
      if (sysInfo) {
        const result_ids = [];
        const result_names = [];
        sysInfo.apps.forEach(app => {
          result_ids.push(...app.net_nodes.map(r => r.id));
          result_names.push(...app.net_nodes.map(r => r.name));
        });

        ret.push({
          ids: result_ids,
          names: result_names,
        });
      }
    };

    return ret;
  },

  requester: async function (args, metrics, query, realtime, instance) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);

    let period;
    if (params.period === 1) {
      period = params.sysPeriod;
      period = `${parseInt(period[0] / 1000)},${parseInt(period[1] / 1000)}`;
    } else if (Array.isArray(params.period)) {
      params.period = [parseInt(params.period[0] / 1000), parseInt(params.period[1] / 1000)];
      period = params.period;// `${params.period[0]},${params.period[1]}`;
    } else {
      period = params.period;
    } 

    const rules = await this.getRules(params.appsysid);
    const isExtern = (instance && instance.isExtern) ? 1 : 0;

    let options = {
      startTime: period[0],
      endTime: period[1],
    }

    params.interface && (options.card = params.interface);
    params.vlan && (options.vlan = params.vlan);
    params.site && (options.site = params.site);
    params.rule && (options.rule = params.rule);
    params.cfg && (options.cfg = params.cfg);
    params.delay && (options.delay = params.delay);
    params.precision && (options.precision = params.precision);
    options.precision >= 60 && delete options.delay;

    const ruleids = [];
    for (let rule of rules) {
      ruleids.push(...rule.ids)
    }

    let result;
    options.ruleId = ruleids.join(',');
    !options.ruleId && delete options.ruleId;

    const ret = await npmService.getTopRuleAlarm(options);
    if (ret && ret.result === 'ok' && ret.data) {
      let data = ret.data;
      /*let data = [
        {
          "ruleName": "tcp_other111",
          "ruleId": "1001",
          "alarm": 103
        }, {
          "ruleName": "tcp_other222",
          "ruleId": "1002",
          "alarm": 321
        }
      ];*/

      result = data.map(r => {
        return {
          id: r.ruleId,
          name: r.ruleName,
          total: r.alarm,
        }
      });
    }
    return result;
  }
}
