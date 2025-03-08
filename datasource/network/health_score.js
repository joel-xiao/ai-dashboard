import npmService from '@/service/npm.service';
import util from "@/views/npm/util";
import { npm_period_list, string2TimestampRange } from '../util';

export default {
  id: 'datasource-network-health',
  category: 'network',
  name: '健康评分汇总',
  type: 'object',
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

        // result.unshift({ label: '全部', value: '' });
        this.topoList = result;
        return result;
      }
    },

    rule: {
      type: String,
      label: '应用',
      ctrl: 'select',
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
        if (!find || (!find.val && find.arg !== 'topoNum')) {
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

    if (params.topoNum) {
      let options = {
        'topo.time': `${parseInt(period[0] / 1000)},${parseInt(period[1] / 1000)}`,
      }
  
      params.cfg && (options.cfg = params.cfg);
      params.topoNum && (options['topo.topoId'] = params.topoNum);
      params.rule && (options['topo.rule'] = params.rule);
  
      (params.group_by && typeof(params.group_by) === 'string') && (params.group_by = [params.group_by]);
      const isGroupBy = Array.isArray(params.group_by) && params.group_by.length > 0;
  
      let ret = isGroupBy ? 
        await npmService.getTopoGroupScoreStats(options) :
        await npmService.getTopoScoreStats(options);
  
      if (ret && ret.data) {
        if (isGroupBy) {
          let result = {
            default: {},
            group_by: [],
          };
  
          ret.data.forEach( item => {
            const { appScore, networkScore } = item;
            const new_item = {
              names: ['appScore', 'networkScore'],
              data: [ appScore || 0, networkScore || 0 ],
              rule: item.vlanId < 1 ? item.ruleId : item.ruleId + '-' + item.vlanId,
            };
            result.group_by.push(new_item);
          });
          return result;
        } else {
          const { appScore, networkScore } = ret.data;
          return { 
            default: {
              names: ['appScore', 'networkScore'],
              data: [appScore || 0, networkScore || 0]
            }
          }
        }
      }
    } else {
      let options = {
        time: `${parseInt(period[0] / 1000)},${parseInt(period[1] / 1000)}`,
        //card: params.interface,
      }
      params.cfg && (options.cfg = params.cfg);

      let ret = await npmService.getHealthScores(options);

      let sysname = '全部';
      let appScore = 0;
      let netScore = 0;
      if (params.topoNum) {
        let result = await npmService.getTopoRuleList();
        result = (((result && result.data) ? result.data : [])).map(r => {
          return {
            label: r.title,
            value: r.topoNum,
          }
        });

        let findTopoNum = result.find(r => r.value === params.topoNum);
        if (findTopoNum) {
          sysname = findTopoNum.label;
        }
      }

      netScore = 0;
      if (ret.result === 'ok') {
        if (ret.data && ret.data.data && ret.data.data.topoScoreData) {
          let appCnt = 0;
          let netCnt = 0;
          Object.keys(ret.data.data.topoScoreData).forEach(key => {
            let data = ret.data.data.topoScoreData[key];
            if (params.topoNum) {
              data = data.filter(r => r.topoNum === params.topoNum);
            }
            data.forEach(r => {
              if (r.appScore !== 'N/A') {
                appScore += parseInt(r.appScore);
                appCnt += 1;
              }
              if (r.networkScore !== 'N/A') {
                netScore += parseInt(r.networkScore);
                netCnt += 1;
              }
            });
          });

          appScore = appCnt ? Math.floor(appScore / appCnt) : 0;
          netScore = netCnt ? Math.floor(netScore / netCnt) : 0;
        }

        return {
          default: {
            names: ['appScore', 'networkScore'],
            data: [appScore, netScore]
          }
        };
      }
    }
    

    return [];

  },
  
  transformer: '',
}