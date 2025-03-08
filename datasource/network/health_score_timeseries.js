import npmService from '@/service/npm.service';
import util from "@/views/npm/util";
import { npm_period_list, string2TimestampRange, getPrecisions, getRealTimePrecisions, dealPrecision } from '../util';

export default {
  id: 'datasource-network-health-timeseries',
  category: 'network',
  name: '健康评分时序',
  type: 'array',
  ver: 1.1,
  order: 15,
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

    topoNum: {
      type: String,
      label: '应用系统',
      ctrl: 'select',
      dependencies: ['cfg'],
      required: true,
      options: async function(cfg) {
        if (this.topoList) {
          return this.topoList;
        }

        let result = [];
        let ret = await npmService.getTopoRuleList({cfg});
        result = ((ret && ret.data) ? ret.data : []).map(r => {
          return {
            label: r.title,
            value: r.topoNum,
          }
        });

        this.topoList = result;
        return result;
      }
    },

    rule: {
      type: String,
      label: '应用',
      ctrl: 'select',
      requiredNotValues: [],
      dependencies: ['cfg', 'topoNum'],
      options: async function(cfg, topoNum) {
        let result = [];
        let ret = await npmService.getTopoRules({ cfg, id: topoNum });

        ((ret && ret.data) ? ret.data : []).forEach(r => {
          result.push(...r.list.map(item => {
            return {
              label: item.name,
              value: item.ruleId,
            }
          }));
        });
        result.unshift({ label: '全部', value: '' });
        return result;
      }
    },

    precision: {
      type: Number,
      label: '精度',
      ctrl: 'select',
      default: 60,
      dependencies: ['period'],
      options: function(period) {
        let list = getRealTimePrecisions(period);
        return list;
      }
    },
  },

  metrics: {
    appScore: { type: String, label: '应用分数' },
    networkScore: { type: String, label: '网络分数' }
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

    let options = {
      'topo.time': `${parseInt(period[0] / 1000)},${parseInt(period[1] / 1000)}`,
      'topo.precision': dealPrecision(params.precision),
    }

    params.cfg && (options.cfg = params.cfg);
    params.topoNum && (options['topo.topoId'] = params.topoNum);
    params.rule && (options['topo.rule'] = params.rule);

    let ret = await npmService.getTopoScoreTimeseries(options);
    if (ret && ret.data && ret.data.list) {
      return ret.data.list.map(r => {
        return {
          appScore: [r.timeStamp * 1000, r.appScore],
          networkScore: [r.timeStamp * 1000, r.networkScore],
        }
      });
    }

    return [];

  },
  
  transformer: '',
}
