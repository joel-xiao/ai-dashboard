import moment from 'moment';
import appService from '@/service/app.service';
import modelService from '@/service/model.service';
import statusService from '@/service/status';
import eventService  from '@/service/event.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics, getStatusText } from '../util';
import { RequestStatsFilter } from '@/service/filters';
import periodService from '@/service/period';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';
import { getAppNameById } from '@/service/util';

const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-application-states-bp',
  category: 'application',
  name: '请求统计数据',
  type: 'object',
  ver: 1.1,
  order: 2,
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
      required: false,
      output: true,
    },

    biz: {
      type: String,
      label: '业务',
      ctrl: 'multiple-select-cascader',
      required: false,
      dependencies: ['appid'],
      options: async function(appid) {
        const { result, cache } = await getModelOptions(appid, this.models);
        this.models = cache;
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

    status: {
      type: String,
      label: '状态',
      ctrl: 'select',
      default: 'all',
      options: [{
        label: '全部',
        value: 'all',
      }, {
        label: '缓慢',
        value: 'slow',
      }, {
        label: '极慢',
        value: 'frustrated',
      }, {
        label: 'http错误',
        value: 'httperr',
      }, {
        label: '网络错误',
        value: 'neterr',
      }, {
        label: '4xx错误',
        value: '4xx',
      }, {
        label: '5xx错误',
        value: '5xx',
      }]
    },
    
    /*
    bizOnly: {
      type: Boolean,
      label: '仅业务',
      ctrl: 'switch',
      default: false,
    },*/

    sort: {
      type: String,
      label: '排序',
      ctrl: 'select',
      default: 'total',
      options() {
        let opts = Object.keys(this.metrics).map( r => {
          return {
            value: r,
            label: this.metrics[r].label
          }
        })
        return opts.filter(r => r);
      }
    },

    direction: {
      type: String,
      label: '排序方式',
      ctrl: 'select',
      default: 'desc',
      options: [{
        label: '升序',
        value: 'asc',
      }, {
        label: '降序',
        value: 'desc',
      }]
    },

    limit: {
      type: Number,
      label: '数量',
      ctrl: 'input',
      default: 10,
      min: 1,
    },
  },
  metrics: {
    appsysid: {
      type: String,
      label: '应用系统',
      isDim: true
    },
    appid: {
      type: String,
      label: '应用',
      isDim: true
    },
    group: {
      type: String,
      label: '业务名称',
      isDim: true
    },
    method: {
      type: Number,
      label: '方法',
      description: 'http的方法',
      isDim: true
    },
    status: {
      type: String,
      label: '状态',
      isDim: true
    },
    path: {
      type: Number,
      label: '路径',
      description: '请求的路径',
      isDim: true
    },
    status_code: {
      type: String,
      label: '状态码',
      isDim: true
    },
    province: {
      type: String,
      label: '省份',
      isDim: true
    },
    city: {
      type: String,
      label: '城市',
      isDim: true
    },
    ip_addr: {
      type: String,
      label: 'IP地址',
      isDim: true
    },
    agent: {
      type: String,
      label: '探针',
      isDim: true
    },
    total: {
      type: Number,
      label: '请求数',
      description: '请求总数',
    },
    
    dur: {
      type: Number,
      label: '响应时间',
      description: '平均请求响应时间',
    },
    fast: {
      type: Number,
      label: '快速数',
      description: '快速请求数'
    },
    slow: {
      type: Number,
      label: '缓慢数',
      description: '缓慢请求数',
    },
    slow_rate: {
      type: Number,
      label: '缓慢率',
      description: '缓慢请求率',
    },
    frustrated: {
      type: Number,
      label: '极慢数',
      description: '极慢请求数',
    },
    frustrated_rate: {
      type: Number,
      label: '极慢率',
      description: '极慢请求率',
    },
    err: {
      type: Number,
      label: '错误数',
      description: '错误请求数',
    },
    err_rate: {
      type: Number,
      label: '错误率',
      description: '错误请求率',
    },
    fail: {
      type: Number,
      label: '失败数',
      description: '失败请求数',
    },
    fail_rate: {
      type: Number,
      label: '失败率',
      description: '失败请求率',
    },
    apdex: {
      type: Number,
      label: 'APDEX',
      description: 'APDEX',
    },
    neterr: {
      type: Number,
      label: '网络错误数'
    },
    httperr: {
      type: Number,
      label: 'http错误数'
    },
    err_4xx: {
      type: Number,
      label: '4XX 错误数'
    },
    err_4xx_rate: {
      type: Number,
      label: '4XX 错误率'
    },
    err_5xx: {
      type: Number,
      label: '5XX 错误数'
    },
    err_5xx_rate: {
      type: Number,
      label: '5XX 错误率'
    },
    exception: {
      type: Number,
      label: '异常数量'
    },
    exception_rate: {
      type: Number,
      label: '异常率'
    },
    last_time: {
      type: String,
      label: '最近发生时间',
    },
    alarmCount: {
      type: Number,
      label: '告警数量'
    },
    frezzCount: {
      type: Number,
      label: '卡顿数量'
    },
    crashCount: {
      type: Number,
      label: '崩溃数量'
    }
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
            let find = RequestStatsFilter.find(filter => filter.key === metric);
            if (find) {
              filter.push({ key: metric, val });
            }
            break;
        }
      });
    }
    return filter;
  },

  getStatusFilter(status) {
    const filter = {
      slow: statusService.enumStatusProfile({ time: [1] })
        .map(s => `status=${s}`)
        .join(","),
      frustrated: statusService.enumStatusProfile({ time: [2]})
        .map(s => `status=${s}`)
        .join(","),
      httperr: statusService.enumStatusProfile({ error: [2]})
        .map(s => `status=${s}`)
        .join(","),
      neterr: statusService.enumStatusProfile({ error: [1]})
        .map(s => `status=${s}`)
        .join(","),
      err_4xx: 'err_4xx=1',
      err_5xx: 'err_5xx=1',
    }
    return filter[status];
  },

  requester: async function(args, metrics, query) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }
    let metric_params = getMetrics(metrics, this.metrics);
    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    const excludeFields = ['alarmCount', 'frezzCount', 'crashCount'];
    let fields = 'total,dur,err_rate,slow_rate,fail_rate,err,frustrated,frustrated_rate,slow,fail,apdex,last_time,exception,exception_rate';
    if (metric_params.metrics && metric_params.metrics.length > 0) { 
      let _fields = metric_params.metrics.filter(metric => !excludeFields.find(r => r === metric));
      if (typeof params.sort === 'string' && !_fields.some( field => field === params.sort)) _fields.push(params.sort);
      fields = _fields.join(',');
      !_fields.includes('last_time') && (fields += ',last_time');
    }
    
    fields.startsWith(',') && (fields = fields.substring(1, fields.length));

    let options = {
      period: `${period[0]},${period[1]}`,
      fields,
      group_by: `${metric_params.dimensions.join(',')}`,
    };
    
    if (params.sort) options.sort = params.sort;
    if (params.direction) options.direction = params.direction;

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }
    let models = [];

    if (metric_params.dimensions.find(r => r === 'group')) {
      let ret = await modelService.getModels({
        limit: 1000,
        skip: 0
      });

      if (ret.result === 'ok') {
        models = ret.data;
      }
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

    if (params.bizOnly || metric_params.dimensions.includes('group')) {
      options.filter && (options.filter += `,is_model=true`);
      !options.filter && (options.filter = `is_model=true`);
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    appid = appParams.appid;

    if (params.status) {
      const statusFilter = this.getStatusFilter(params.status);
      options.filter && statusFilter && (options.filter += `,${statusFilter}`);
      !options.filter && (options.filter = statusFilter);
    }

    if (params.sort) {
      if (params.sort === 'alarmCount') {
        return this.requestAlarmCountSort(options, metric_params.metrics);
      }
      if (params.sort === 'frezzCount') {
        return this.requestFrezzCountSort(options, metric_params.metrics);
      }
      if (params.sort === 'crashCount') {
        return this.requestCrashCountSort(options, metric_params.metrics);
      }
    }

    let result = [];
    let p = periodService;
    let ret = await appService.getAppRequestStats(appid, options);
    if (ret?.result === 'ok') {
      ret.data.forEach(r => {
        let findGroup = models.find(m => m.id === r.group);

        result.push({
          ...r,
          total: r.total,
          dur: p.timeFormat(r.dur),
          dur_i: Number(r.dur?.toFixed(2)),
          path: r.path,
          method: r.method,
          model: r.model || '--',
          group_prim: r.group,
          group: findGroup ? findGroup.name : '--',
          appid_prim: r.appid || appid,
          appid: getAppNameById(r.appid) || getAppNameById(appid) || r.appid || appid,
          appsysid_prim: r.appsysid,
          appsysid: r?.appsysname || r.appsysid,
          status: getStatusText(r.status),
          exception: r.exception,
          exception_rate: r.exception_rate,
          err: r.err,
          fail: r.fail,
          slow: r.slow,
          frustrated: r.frustrated,
          fast: r.fast,
          apdex: p.numToFixed(r.apdex, 2),
          err_rate: p.numToFixed(r.err_rate * 100, 1) + '%',
          fail_rate: p.numToFixed(r.fail_rate * 100, 1) + '%',
          slow_rate: p.numToFixed(r.slow_rate * 100, 1) + '%',
          frustrated_rate: p.numToFixed(r.frustrated_rate * 100, 1) + '%',
          //last_time: r.last_time,
          last_time: moment(r.last_time).format('YYYY-MM-DD HH:mm:ss'),
        });
      });
    }

    //告警数量
    await this.loadAlarmCount(metric_params.metrics, options, result);

    //卡顿数量
    await this.loadFrezzCount(metric_params.metrics, options, result);

    //崩溃数量
    await this.loadCrashCount(metric_params.metrics, options, result);

    return result;
  },

  async loadAlarmCount(metrics, options, result) {
    if (metrics.find(r => r === 'alarmCount')) {
      for (let r of result) {
        const opt = {
          period: options.period,
          filter: `appsysid=${r.appsysid_prim}`
        }
        const ret = await eventService.getEventStats(opt);
        r.alarmCount = (ret.data && ret.data[0]) ? ret.data[0].total : 0; 
      };
    }
  },

  async loadFrezzCount(metrics, options, result) {
    if (metrics.find(r => r === 'frezzCount')) {
      for (let r of result) {
        const opt = {
          period: options.period,
          filter: `appsysid=${r.appsysid_prim}`
        }
        const ret = await appService.getAppFreezeStats('_all', opt);
        r.frezzCount = (ret.data && ret.data[0]) ? ret.data[0].total : 0; 
      };
    }
  },

  async loadCrashCount(metrics, options, result) {
    if (metrics.find(r => r === 'crashCount')) {
      for (let r of result) {
        const opt = {
          period: options.period,
          filter: `appsysid=${r.appsysid_prim}`
        }
        const ret = await appService.getAppCrashStats('_all', opt);
        r.crashCount = (ret.data && ret.data[0]) ? ret.data[0].total : 0; 
      };
    }
  },

  async requestAlarmCountSort(options, metrics) {
    const opt = {
      period: options.period,
      group_by: `appsysid`,
      sort: 'total'
    }
    const result = [];
    const ret = await eventService.getEventStats(opt);
    if (ret.data) {
      for (let r of ret.data) {
        const item = { 
          appsysname: r.appsysname,
          appsysid_prim: r.appsysid,
          alarmCount: r.total 
        };
        const opt2 = {
          period: options.period,
          fields: 'total,exception,exception_rate,fail,fail_rate,err,err_rate,slow,slow_rate',
          filter: `appsysid=${r.appsysid}`
        }
        const ret2 = await appService.getAppRequestStats('_all', opt2);
        if (ret2.data && ret2.data[0]) {
          item.total = ret2.data[0].total;
          item.exception = ret2.data[0].exception;
          item.exception_rate = ret2.data[0].exception_rate;
          item.err = ret2.data[0].err;
          item.err_rate = ret2.data[0].err_rate;
          item.fail = ret2.data[0].fail;
          item.fail_rate = ret2.data[0].fail_rate;
          item.slow = ret2.data[0].slow;
          item.slow_rate = ret2.data[0].slow_rate;
        }
        result.push(item);
      }
    }

    //卡顿数量
    await this.loadFrezzCount(metrics, options, result);

    //崩溃数量
    await this.loadCrashCount(metrics, options, result);

    return result;
  },

  async requestFrezzCountSort(options, metrics) {
    const opt = {
      period: options.period,
      group_by: `appsysid`,
      sort: 'total'
    }
    const result = [];
    const ret = await appService.getAppFreezeStats('_all', opt);
    if (ret.data) {
      for (let r of ret.data) {
        const item = { 
          appsysname: r.appsysname,
          appsysid_prim: r.appsysid,
          alarmCount: r.total 
        };
        const opt2 = {
          period: options.period,
          fields: 'total,exception,exception_rate,fail,fail_rate,err,err_rate,slow,slow_rate',
          filter: `appsysid=${r.appsysid}`
        }
        const ret2 = await appService.getAppRequestStats('_all', opt2);
        if (ret2.data && ret2.data[0]) {
          item.total = ret2.data[0].total;
          item.exception = ret2.data[0].exception;
          item.exception_rate = ret2.data[0].exception_rate;
          item.err = ret2.data[0].err;
          item.err_rate = ret2.data[0].err_rate;
          item.fail = ret2.data[0].fail;
          item.fail_rate = ret2.data[0].fail_rate;
          item.slow = ret2.data[0].slow;
          item.slow_rate = ret2.data[0].slow_rate;
        }
        result.push(item);
      }
    }

    //告警数量
    await this.loadAlarmCount(metrics, options, result);

    //崩溃数量
    await this.loadCrashCount(metrics, options, result);

    return result;
  },

  async requestCrashCountSort(options, metrics) {
    const opt = {
      period: options.period,
      group_by: `appsysid`,
      sort: 'total'
    }
    const result = [];
    const ret = await appService.getAppCrashStats('_all', opt);
    if (ret.data) {
      for (let r of ret.data) {
        const item = { 
          appsysname: r.appsysname,
          appsysid_prim: r.appsysid,
          alarmCount: r.total 
        };
        const opt2 = {
          period: options.period,
          fields: 'total,exception,exception_rate,fail,fail_rate,err,err_rate,slow,slow_rate',
          filter: `appsysid=${r.appsysid}`
        }
        const ret2 = await appService.getAppRequestStats('_all', opt2);
        if (ret2.data && ret2.data[0]) {
          item.total = ret2.data[0].total;
          item.exception = ret2.data[0].exception;
          item.exception_rate = ret2.data[0].exception_rate;
          item.err = ret2.data[0].err;
          item.err_rate = ret2.data[0].err_rate;
          item.fail = ret2.data[0].fail;
          item.fail_rate = ret2.data[0].fail_rate;
          item.slow = ret2.data[0].slow;
          item.slow_rate = ret2.data[0].slow_rate;
        }
        result.push(item);
      }
    }

    //告警数量
    await this.loadAlarmCount(metrics, options, result);

    //卡顿数量
    await this.loadFrezzCount(metrics, options, result);
    
    return result;
  },

  transformer: '',
}
