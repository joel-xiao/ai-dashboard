import appService from '@/service/app.service';
import agentService from '@/service/agent.service';
import periodService from '@/service/period';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { memFormat, formatNumber } from '@/service/util';
import { getAppsysOptions, getAppOptions, getAgentOptions } from '../apm_options';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-agent-jvm-stats',
  category: 'application',
  name: '探针JVM汇总',
  type: 'object',
  ver: 1.1,
  order: 9,
  arguments: {
    appsysid: {
      type: String,
      label: '应用系统ID',
      ctrl: 'multiple-select',
      APPLICAION_TYPES,
      options: async function() {
        const { result, cache } = await getAppsysOptions(this.appsys_options, APPLICAION_TYPES);
        this.appsys_options = cache;
        return result;
      },
      required: true,
      output: true,
    },
    
    appid: {
      type: String,
      label: '应用ID',
      ctrl: 'multiple-select-cascader',
      APPLICAION_TYPES,
      dependencies: ['appsysid'],
      options: async function(appsysid) {
        const {
          result,
          cache,
          sys_cache,
         } = await getAppOptions(
            appsysid, 
            this.appsys_options, 
            this.app_options,
            APPLICAION_TYPES
          );
        this.appsys_options = sys_cache;
        this.app_options = cache;
        return result;
      },
      required: true,
      output: true,
    },
    agentid: {
      type: String,
      label: '实例',
      ctrl: 'select-cascader',
      required: true,
      dependencies: ['appid'],
      options: async function(appid) {
        const { result, cache } = await getAgentOptions(appid, this.agents);
        this.agents = cache;
        return result;
      }
    },
    period: {
      type: Number,
      label: '时间',
      ctrl: 'select-and-time',
      default: 5 * 60 * 1000,
      options: period_list,
      required: true,
      validator: function (value) {
        return true;
      },
    },

    shwoUnit: {
      type: Boolean,
      label: '显示单位',
      ctrl: 'switch',
      default: false,
    }
  },
  metrics: {
    cpu: {
      type: Number,
      label: 'CPU利用率',
      unit:'%',
    },

    mem: {
      type: Number,
      label: '内存利用率',
      unit:'MB',
    },
  },
  
  checkArguments(args) {
    let self = this;
    let result = true;
    Object.keys(self.arguments).forEach(arg => {
      if (!result) { return }

      if (self.arguments[arg].required) {
        let find = args.find(r => r.arg === arg);
        if (find && Array.isArray(find.val) && find.val.length === 0) {
          result = false;
        } else {
          if (!find || !find.val) {
            result = false;
          }
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
    let period = parsePeriod(params.period, params.sysPeriod);
    
    let result = {};
    let granularity = periodService.getGranularity(period[0], period[1]);
    let fields = 'old_gen_used,total_physical_memory,avg_sys_cpu';
    //metrics && metrics.length > 0 && (fields = metrics.join(','));
    let options = {
      period: `${period[0]},${period[1]}`,
      granularity,
      fields,
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    let ret = await agentService.fetchJvmStatsTimeseries(appid, '_all', {...options, apiv2: true});
    if (ret.result === 'ok') {
      result = ret.data;
      if (params.group_by) {
        let groupByResult = getStatesResultGroupBy(result, params.group_by, (item) =>{
          return this.formatterRequesterResult(item.data, params);
        });

        return {
          default: {},
          group_by: groupByResult,
        }
      } else {
        return {
          default: this.formatterRequesterResult(result, params),
        }
      }
    }

    return { 
      default: {
        names: ['cpu', 'mem'],
        data: [0, 0],
        units: ['%', '%'],
      }
    };
  },

  formatterRequesterResult(result, params) {
    let cpu = 0;
    let mem = 0;

      result.forEach(r => {
        if (r.old_gen_used === null || r.old_gen_used === undefined) {
          r.old_gen_used = 0;
        }
        if (r.total_physical_memory === null || r.total_physical_memory === undefined) {
          r.total_physical_memory = 0;
        }
        if (r.avg_sys_cpu === null || r.avg_sys_cpu === undefined) {
          r.avg_sys_cpu = 0;
        }

        const mem_used = r.old_gen_used / r.total_physical_memory;
        if (mem_used !== Infinity && !isNaN(mem_used)) {
          mem += mem_used;
        } else {
          mem += 0;
        }

        cpu += r.avg_sys_cpu;
      });

      cpu = ((cpu / result.length) * 100).toFixed(2);
      mem = ((mem / result.length) * 100).toFixed(2);

      if (params.shwoUnit) {
        cpu += '%';
        mem += '%';
      }

      return {
        names: ['cpu', 'mem'],
        data: [cpu, mem],
        units: ['%', '%'],
      }
  },

  transformer: '',
}
