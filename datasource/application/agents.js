import agentService from '@/service/agent.service';
import appService from '@/service/app.service';
import periodService from '@/service/period';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { getPercent } from '@/service/util'
import { RequestFilter } from '@/service/filters';
import { getAppsysOptions, getAppOptions, getAgentOptions } from '../apm_options';
import moment from 'moment';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-agents',
  category: 'application',
  name: '探针详情数据',
  type: 'array',
  ver: 1.1,
  order: 4,
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
      ctrl: 'multiple-select-cascader',
      dependencies: ['appid'],
      options: async function(appid) {
        const { result, cache } = await getAgentOptions(appid, this.agents);
        this.agents = cache;
        return result;
      },
      required: true,
      output: true,
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
    limit: {
      type: Number,
      label: '数量',
      ctrl: 'input',
      default: 10,
      min: 1,
    }
  },
  metrics: {
    appsysid: {
      type: String,
      label: '应用系统',
    },
    appid: {
      type: String,
      label: '应用',
    },
    id: {
      type: String,
      label: '实例名称',
    },
    ip: {
      type: String,
      label: 'IP地址',
    },
    gc_count: {
      type: Number,
      label: 'FullGC次数'
    },
    thread_num: {
      type: Number,
      label: '线程数'
    },
    jdbc_conn_num: {
      type: Number,
      label: 'jdbc连接数'
    },
    exception_count: {
      type: Number,
      label: '异常次数'
    },
    perm_gen_usage: {
      type: Number,
      label: '永久代'
    },
    mem_usage: {
      type: Number,
      label: '内存使用率'
    },
    status: {
      type: String,
      label: '探针状态',
    },
    collection_status: {
      type: String,
      label: '采集状态'
    },
    start_timestamp: {
      type: String,
      label: '启动时间',
    },
    running_time: {
      type: Number,
      label: '运行时长'
    },
    last_ts: {
      type: String,
      label: '最后心跳',
    },
    version: {
      type: String,
      label: '探针版本',
    },
    server: {
      type: String,
      label: '服务类型',
    },
    os: {
      type: String,
      label: '操作系统',
    },
    hostname: {
      type: String,
      label: '主机',
    },
    gc: {
      type: String,
      label: 'GC类型'
    },
    pid: {
      type: Number,
      label: 'PID'
    },
    os_version: {
      type: String,
      label: '操作系统版本',
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

  parseQuery(query) {
    let filter = [];
    if (query && query.length > 0) {
      query.forEach(part => {
        let params =  part.split('=');
        let metric = params[0];
        let val = params[1];

        switch(metric) {
          case 'appid':
            filter.push({ key: 'appid', val });
            break;
          case 'appsysid':
            filter.push({ key: 'appsysid', val });
            break;
          case 'ts':
            let ts = val.split('~');
            filter.push({ key: 'ts', val: ts });
            break;
          default:
            let find = RequestFilter.find(filter => filter.key === metric);
            if (find) {
              filter.push({ key: metric, val });
            }
            break;
        }
      });
    }

    return filter;
  },

  requester: async function(args, metrics, query) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};
    let filter = {};
    const jvmMetrics = ['gc_count', 'thread_num', 'jdbc_conn_num',  'perm_gen_usage', 'mem_usage'];
    const excepMetrics = ['exception_count'];
    let fields = metrics.filter(r => r !== 'running_time').filter(s => !jvmMetrics.includes(s)).filter(g => !excepMetrics.includes(g)).join(',');
    params.method && (filter.method = params.method);
    params.path && (filter.path = params.path);

    let filterStr = Object.keys(filter).map(key => {
      return `${key}=${params[key]}`;
    }).join(',');

    let options = {
      period: `${period[0]},${period[1]}`,
      fields: fields ? `${fields},id` : 'id',
    };

    filterStr && (options.filter = filterStr);

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let queryInfo = this.parseQuery(query);
    let appid = params.appid;
    if (queryInfo.length > 0) {
      options.filter = queryInfo.filter(r => !['ts', 'appid'].find(key => key === r.key) )
        .map(r => `${r.key}=${r.val}`)
        .join(',');
      !options.filter && delete options.filter;
      
      let tsQuery = queryInfo.find(r => r.key === 'ts');
      if (tsQuery) {
        options.period = `${tsQuery.val[0]},${tsQuery.val[1]}`;
      }

      let appQuery = queryInfo.find(r => r.key === 'appid');
      if (appQuery) {
        appid = appQuery.val;
        params.appid = appid;
      }
    }

    const ts2time = (start_ts, last_ts, type) => {
      let dur = last_ts - start_ts;
      if (start_ts > 0 && last_ts > 0 && last_ts - start_ts > 0) {
        if (dur >= 1000 * 60 * 60 * 24) {
          let dur_str = type == 'dur' ? '##DAYS##天' : '##DAYS##天前';
          dur = dur_str.replace(/##DAYS##/, (dur / 1000 / 60 / 60 / 24).toFixed(2));
        } else if (dur >= 1000 * 60 * 60) {
          let dur_str = type == 'dur' ? '##HOURS##小时' : '##HOURS##小时前';
          dur = dur_str.replace(/##HOURS##/, (dur / 1000 / 60 / 60).toFixed(2));
        } else {
          let dur_str = type == 'dur' ? '##MINUTES##分钟' : '##MINUTES##分钟前';
          dur = dur_str.replace(/##MINUTES##/, (dur / 1000 / 60).toFixed(2));
        }
      } else {
        dur = 0;
      }
      return dur;
    };
    let agentStats = [];
    let statsOptions = {
      period: `${period[0]},${period[1]}`,
      group_by: 'agent',
      fields: 'total,dur,err_rate,err,exception',
    };

    let jvmOptions = {
      period: `${+period[1] - 5 * 60 * 1000},${period[1]}`,
      fields: 'thread_num,jdbc_conn_num,gc_old_count_new,gc_old_count,perm_gen_usage,mem_usage',
      apiv2: true
    };

    if (params.appid) {
      if (Array.isArray(params.appid)) {
        const apps = params.appid.filter(r => r);
        statsOptions.filter = apps.map(r => `appid=${r}`).join(',');
      } else {
        statsOptions.filter = `appid=${params.appid}`;
      }
      let aret = await appService.getAppRequestStats('_all', statsOptions);
      agentStats = aret.data;
    }

    let appParams = await getAppParams(params, options, this.arguments, false);
    options = appParams.options;
    appid = appParams.appid;
    if (appid) {
      if (Array.isArray(appid)) {
        const apps = appid.filter(r => r);
        options.filter = apps.map(r => `appid=${r}`).join(',');
      } else {
        options.filter = `appid=${appid}`;
      }
    }

    if (
      (Array.isArray(params.agentid) && params.agentid.length > 0) || 
      (!Array.isArray(params.agentid) && params.agentid)) {
      if (Array.isArray(params.agentid)) {
        options.filter = params.agentid.map(r => `id=${r}`).join(',');
      } else {
        options.filter =`id=${params.agentid}`;
      }
      options.is_all = true;
    }

    const asyncRequest = () => {
      return new Promise(async (resolve, reject) => {
        let ret = await agentService.fetchAgents('_all', options);
        if (ret.result === 'ok') {
          result = ret.data;
          let exPromise = result.map(async r => {
            let exOptions = {
              period: `${period[0]},${period[1]}`,
              fields: 'message,agentid',
              filter: `agentid=${r.id}`,
            };

            return await appService.getAppExceptions('_all', exOptions);
          });

          let jvmPromise = result.map(async r => {
            return await agentService.fetchJvmStats('_all', r.id, jvmOptions);
          })

          let exRet = await Promise.all(exPromise);
          let jvmRet = await Promise.all(jvmPromise);
          result.forEach(async (r, idx) => {
            r['running_time'] = ts2time(r.start_timestamp, r.last_ts, 'dur');
            r.start_timestamp = moment(r.start_timestamp).format('YYYY-MM-DD HH:mm:ss');
            r.last_ts = ts2time(r.last_ts, new Date().getTime(), 'last');
            // r['collection_status'] = r?.collection_status ? '采集中' : '未采集';
            r['collection_status'] = (r.status == 'Running' || r.is_run) ? r.collection_status ? r.collection_status === 'true' ? '采集中' : r.collection_status ==='false' ? '未采集' : '未采集' : '未采集' : '未采集';


            r.appsysid_prim = r.appsysid;
            r.appsysid = r?.appsysname || r.appsysid;
            let stats = null;
            if (Array.isArray(agentStats) && agentStats.length > 0) {
              stats = agentStats.find(s => s.agent == r.id);
            }
            if (stats) {
              r['req_total'] = stats.total || '--';
              if (Number(stats.total) > 0 && stats.exception > 0) {
                stats.exception_rate = Number((stats.exception  / stats.total).toFixed(2))
              }
              r['req_dur'] = periodService.timeFormat(stats.dur);
              r['req_err'] = `${stats.err} (${getPercent(stats.err_rate, stats.err)}%)`;
              r['req_exception'] = `${stats.exception} (${getPercent(stats.exception_rate, stats.exception)}%)`;
              exRet[idx].result === 'ok' && Array.isArray(exRet[idx].data) && (r['exception_count'] = exRet[idx].data.length);
              if (jvmRet[idx].result == 'ok' && Array.isArray(jvmRet[idx].data)) {
                let agentItem = jvmRet[idx].data[0] || {};
                r['jdbc_conn_num'] = agentItem.jdbc_conn_num || '0';
                r['thread_num'] = agentItem.thread_num || '0';
                r['gc_count'] = agentItem.gc_old_count_new || agentItem.gc_old_count  || '0';
                r['perm_gen_usage'] = agentItem.perm_gen_usage || '0';
                r['mem_usage'] = agentItem.mem_usage || '0';
            }
            } else {
              r['req_total'] = '--';
              r['req_dur'] = '--';
              r['req_err'] = '--';
              r['req_exception'] = '--';
              r['jdbc_conn_num'] = '--';
              r['thread_num'] = '--';
              r['gc_count'] = '--';
              r['perm_gen_usage'] = '--';
              r['mem_usage'] = '--';
              r['exception_count'] = '--';
            }
          });
          resolve(result);
        }
      })
    }
    
    return await asyncRequest();
  },

  transformer: '',
}
