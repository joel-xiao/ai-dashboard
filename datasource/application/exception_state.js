import moment from 'moment';
import appService from '@/service/app.service';
import periodService from '@/service/period';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics, joinDataLabel, getAppMetricValue, getAppParmaFields } from '../util';
import { getAppsysOptions, getAppOptions } from '../apm_options';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-exception-states',
  category: 'application',
  name: '异常统计',
  type: 'array',
  ver: 1.1,
  order: 5,
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
    name: {
      type: String,
      label: '异常名称',
      isDim: true
    },
    url: {
      type: String,
      label: 'URL',
      isDim: true
    },

    request_total: {
      type: Number,
      label: '请求数',
      description: '请求数',
    },
 
    total: {
      type: Number,
      label: '异常数',
      description: '发生异常的总数',
    },
    per: {
      type: Number,
      label: '异常占比'
    },

    last_time: {
      type: String,
      label: '最近发生时间',
      description: '最近发生异常的时间',
    },

    diff: {
      type: Number,
      label: '异常变化',
      description: '异常数变化',
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

  requester: async function(args, metrics) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    const metric_params = getMetrics(metrics, this.metrics);
    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);

    const not_fields = { 'request_total': true, 'diff': true, 'per': true };
    let options = {
      period: `${period[0]},${period[1]}`,
      group_by: metric_params.dimensions.join(','),
      fields: metric_params.metrics.filter(r => !not_fields[r]).join(','),
      sort: 'total',
    };
    
    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    let ret = await appService.getAppExceptionStats(appid, {
      period: `${period[0]},${period[1]}`,
      filter: options.filter,
    });
    let total = ret.data[0]?.total;
    
    if (!options.fields) {
      options.fields = 'total';
    } else if (!options.fields.includes('total')) {
      options.fields += ',total';
    }

    ret = await appService.getAppExceptionStats(appid, options);
    if (ret?.result === 'ok') {
      ret.data.forEach( r => {
        r.per = parseInt(r.total / total * 100) + '%';
        if (r.appsysid) {
          r.appsysid_prim = r.appsysid;
          r.appsysid = r?.appsysname || r.appsysid;
        }
        if (r.last_time) {
          r.last_time = moment(r.last_time).format('YYYY-MM-DD HH:mm:ss');
        }
      });
    };

    if (metric_params.metrics.find(r => r === 'request_total')) {
      options.fields = 'total';
      options.skip = 0;
      delete options.limit;
      // options.limit = ret.data.length;
      const ret2 = await appService.getAppRequestStats(appid, options);
      for (let row of ret.data) {
        const data = ret2?.data?.find( r => metric_params.dimensions.every( key => row[key] === r[key] || row[key + '_prim'] === r[key]));
        if (data) {
          row.request_total = data.total;
        }
      }
    }

    if (metric_params.metrics.find(r => r === 'diff')) {
      let lastPeriod = periodService.getLastPeriodRang(period[0], period[1]);
      options.period = `${lastPeriod[0]},${lastPeriod[1]}`,
      options.fields = 'total';
      options.skip = 0;
      delete options.limit;
      options.limit = ret.data.length;
      const ret2 = await appService.getAppExceptionStats(appid, options);

      for (let row of ret.data) {
        const data = ret2?.data?.find( r => metric_params.dimensions.every( key => row[key] === r[key] || row[key + '_prim'] === r[key]));
        if (data) {
          row.diff = data.total;
        } else {
          row.diff = row.total;
        }

        if (row.diff > 0) {
          row.diff_showValue = '<span style="color:#FF5E5E;display:flex;algin-items:center;">' + row.diff + '<img src="/static/images/icons/dashboard/metric-diff-up.svg" style="margin-left: 4px;transform: translateY(-1px);"/><span/>';
          row.diff = '↑' + row.diff;
        }

        if (row.diff < 0) {
          row.diff_showValue = '<span style="color:#B0C700;display:flex;algin-items:center;">' + row.diff + '<img src="/static/images/icons/dashboard/metric-diff-down.svg" style="margin-left: 4px;transform: translateY(-1px);"/><span/>';
          row.diff = '↓' + Math.abs(row.diff);
        }
      }
    }

    return ret?.data || [];
  },

  transformer: '',
}
