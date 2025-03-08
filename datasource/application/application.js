import appService from '@/service/app.service';
import modelService from '@/service/model.service';
import periodService from '@/service/period';
import statusService from '@/service/status';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { RequestStatsFilter } from '@/service/filters';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

var modelsCache = {};
var sysGroupCache = null;
const APPLICAION_TYPES = undefined;

export default {
  id: 'datasource-application-status',
  category: 'application',
  name: '请求状态统计',
  type: 'object',
  ver: 1.1,
  order: 1,
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
    
    showUnit: {
      type: Boolean,
      label: '显示单位',
      default: true,
      ctrl: 'switch',
    }
  },
  metrics: {
    total: {
      type: Number,
      label: '请求数',
      unit: '次',
      description: '请求总数',
    },
    fast: {
      type: Number,
      label: '快速数',
      unit: '次',
    },
    dur: { 
      type: Number,
      label: '响应时间',
      unit: 'ms',
      description: '响应时间',
    },
    slow: {
      type: Number,
      label: '缓慢数',
      unit: '次',
      description: '请求缓慢数',
    },
    slow_rate: {
      type: Number,
      label: '缓慢率',
      unit: '%',
      description: '缓慢请求率',
    },
    frustrated: {
      type: Number,
      label: '极慢数',
      unit: '次',
      description: '极慢请求数',
    },
    frustrated_rate: {
      type: Number,
      label: '极慢率',
      unit: '%',
      description: '极慢请求率',
    },
    err: {
      type: Number,
      label: '错误数',
      unit: '次',
      description: '错误请求数',
    },
    err_rate: {
      type: Number,
      label: '错误率',
      unit: '%',
      description: '错误请求率',
    },
    fail: {
      type: Number,
      label: '失败数',
      unit: '次',
      description: '失败请求数',
    },
    fail_rate: {
      type: Number,
      label: '失败率',
      unit: '%',
      description: '失败请求率',
    },
    
    apdex: {
      type: Number,
      label: 'APDEX',
      unit: '',
      description: 'APDEX',
    },

    neterr: {
      type: Number,
      label: '网络错误数',
      unit: '次',
    },
    httperr: {
      type: Number,
      label: 'http错误数',
      unit: '次',
    },
    err_4xx: {
      type: Number,
      label: '4XX 错误数',
      unit: '次',
    },
    err_4xx_rate: {
      type: Number,
      label: '4XX 错误率',
      unit: '%',
    },
    err_5xx: {
      type: Number,
      label: '5XX 错误数',
      unit: '次',
    },
    err_5xx_rate: {
      type: Number,
      label: '5XX 错误率',
      unit: '%',
    },
    
    exception: { 
      type: Number,
      label: '异常数',
      unit: '次',
      description: '程序异常的数量',
    },
    biz: { 
      type: Number,
      label: '业务数',
      unit: '次',
      description: '业务的数量',
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

  parseRateVal(val, dot = 2) {
    let str = parseFloat(val)
    isNaN(str) && (str = 0);
    str = str * 100;
    str = str.toFixed(dot) + '';
    while(true) {
      if (str.endsWith('0') || str.endsWith('.')) {
        str = str.substring(0, str.length - 1);
      } else {
        break;
      }
    }

    return str;
  },

  requester: async function(args, metrics, query) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);

    let fields = '';
    metrics && metrics.length > 0 && (fields = metrics.filter(r => r !== 'exception' && this.metrics[r]).join(','));
    if (fields.indexOf('total') < 0) {
      fields += ',total';
    }

    let options = {
      period: `${period[0]},${period[1]}`,
      fields
    };

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

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    appid = appParams.appid;

    options.fields = 'total';
    let exceptionStatsRet = await appService.getAppExceptionStats(appid, options, metrics);
    let exception = 
      (exceptionStatsRet.result === 'ok' && exceptionStatsRet.data && exceptionStatsRet.data.length > 0) ?
      exceptionStatsRet.data[0].total || 0 : 0;

      options.fields = fields;

    // let result = await appService.getAppRequestStatusStats(appid, options);
    // result = statusService.wrapStatusData(result.data);
    let ret = await appService.getAppRequestStats(appid, options);

    /*{
      default: {
      },
      group_by: [{
        appid: '',
        appsysid: '',
        names: name,
        data: _data,
        unit: params.showUnit ? '' : '次',
      }]
    }*/
    if (params.group_by) {
      const result = [];
      ret.data.forEach(r => {
        let res;
        const item = {};
        params.group_by.split(',').forEach(g => {
          r[g] && (res = exceptionStatsRet.data.filter(ex => ex[g] = r[g]));
          item[g] = r[g];
        });
        r.exception = res[0] ? res[0].total : 0;

        const { names, data, unit } = this.formatterRequesterResult(r, params, metrics);
        item.names = names;
        item.data = data;
        item.unit = unit;
        result.push(item);
      });

      return { default: {}, group_by: result };
    } else {
      return {
        default: this.formatterRequesterResult({...(ret.data[0] || {}), exception}, params, metrics),
      }
    }
  },

  getUnit (val) {
    if (!val) return '';
    const units = String(val).match(/[^0-9.]/g);
    return units && units.length > 0 ? units.join('') : '';
  },

  formatterRequesterResult(data, params, metrics) {
    let result = {
      total: data.total,
      dur: periodService.timeFormat(data.dur, !params.showUnit),
      fail: data.fail,
      fail_rate: this.parseRateVal(data.fail_rate),
      slow: data.slow,
      slow_rate: this.parseRateVal(data.slow_rate),
      err: data.err,
      err_rate: this.parseRateVal(data.err_rate),
      frustrated: data.frustrated,
      frustrated_rate: this.parseRateVal(data.frustrated_rate),
      biz: data.biz,
      exception: data.exception,
      fast: data.fast,
      neterr: data.neterr || 0,
      httperr: data.httperr || 0,
      err_4xx: data.err_4xx || 0,
      err_4xx_rate: this.parseRateVal(data.err_4xx_rate),
      err_5xx: data.err_5xx || 0,
      err_5xx_rate: this.parseRateVal(data.err_5xx_rate),
    };

    let sortArr = Object.entries(result),
        sortRet = {};
    sortArr.sort((a, b) => b[1] - a[1]);
    sortArr.forEach(r => {
      sortRet[r[0]] = r[1];
    })

    result = sortRet;
    if (data.apdex) {
      if (parseInt((data.apdex+'').charAt(0)) >= 1) {
        result.apdex = '1';
      } else {
        result.apdex = data.apdex.toFixed(2) === '1.00' ? '1' : data.apdex.toFixed(2);
      }
    } else {
      result.apdex = '1';
    }
  
    let _data = [];
    let name = [];
    let units = [];
    Object.keys(result).forEach(key => {
      let find = metrics.find(r => r === key);
      let metricinfo = this.metrics[key];

      if (find && metricinfo) {
        if (find === 'dur' || find === 'apdex') {
          _data.push((result[key] || 0 ));
          if (find === 'dur') {
            units.push(this.getUnit(result[key]));
          } else {
            units.push((metricinfo?.unit || ''));
          }
        } else {
          if (params.showUnit) {
            _data.push((result[key] || 0 ) + (metricinfo?.unit || ''));
            units.push((metricinfo?.unit || ''));
          } else {
            _data.push((result[key] || 0 ));
            units.push((metricinfo?.unit || ''));
          }
        }
        name.push({ name: this.metrics[key]?.label, key });
      }
    });
    return {
      names: name,
      data: _data,
      unit: params.showUnit ? units : '',
    }
  },

  transformer: '',
}
