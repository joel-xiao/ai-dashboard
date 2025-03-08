import appService from '@/service/app.service';
import sqlService from '@/service/sql';
import periodService from '@/service/period';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics, sqlErrCode } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-sql-tmpl-states',
  category: 'application',
  name: 'SQL语句统计',
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
    },

    sort: {
      type: String,
      label: '排序',
      ctrl: 'select',
      default: 'total',
      options() {
        let opts = [];
        Object.keys(this.metrics).forEach( r => {
          if (!this.metrics[r].isDim) {
            opts.push({
              value: r,
              label: this.metrics[r].label
            })
          }
        })
        return opts.filter(r => r);
      }
    },
  },
  metrics: {
    sql: {
      type: String,
      label: 'SQL语句',
      isDim: true
    },
    // model: {
    //   type: String,
    //   label: 'SQL名称',
    //   isDim: true
    // },

    dbhost: {
      type: String,
      label: 'DB主机',
      isDim: true
    },

    db: {
      type: String,
      label: '数据库',
      isDim: true
    },

    dbtype: {
      type: String,
      label: '数据库类型',
      isDim: true
    },

    err_type: {
      type: String,
      label: '错误类型',
      isDim: true,
    },
    err: {
      type: Number,
      label: '错误码',
      isDim: true,
    },
    // type: {
    //   type: String,
    //   label: '类型',
    //   isDim: true,
    // },

    total: {
      type: Number,
      label: '查询次数',
    },

    dur: {
      type: Number,
      label: '响应时间',
    },

    fast: {
      type: Number,
      label: '快速数',
      description: 'SQL快速数',
    },

    tolerated: {
      type: Number,
      label: '缓慢数',
      description: 'SQL缓慢数',
    },

    frustrated: {
      type: Number,
      label: '极慢数',
      description: 'SQL极慢数',
    },

    sqlerr: {
      type: Number,
      label: '错误数',
      description: 'SQL错误数',
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

  getServiceName(code) {
    return code;
  },

  getErrMessage(code) {
    return code;
  },

  requester: async function(args, metrics) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }
    let metric_params = getMetrics(metrics, this.metrics);
    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};
    let options = {
      period: `${period[0]},${period[1]}`
    };

    // options.fields = metric_params.metrics.join(',');
    options.fields = Object.keys(this.metrics).filter(metric => !this.metrics[metric].isDim).join(',');

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    if (params.sort) {
      options.sort = params.sort;
    }
    const errGroupDim = ['err_type', 'err'];
    if (metric_params.dimensions.find(r => errGroupDim.includes(r))) {
      metric_params.dimensions.push('err_group');
      options.sort = options.sort || 'sqlerr';
    }
    options.group_by = metric_params.dimensions.filter(r => !errGroupDim.includes(r)).filter(r => r !== 'sql').join(',');
    if (metric_params.dimensions.includes('sql')) {
      options.group_by += ',group';
    }
    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;
    
    let ret = await sqlService.getSqlStats(appid, options);
    if (ret.result === 'ok') {
      ret.data.forEach(r => {
        r.dur = periodService.timeFormat(r.dur);
        r.sql = r?.src?.template || '--';
        r['fast'] = r.fast;
        if (r?.err_group) {
          let tmp = r.err_group?.split(':');
          r.err = !tmp ? '未知错误': this.getErrMessage(tmp[1]);
          r.dbtype = !tmp ? 'unknown' : this.getServiceName(tmp[0]);
          r.err_type = r.err_type;
          r.err_desc = r.err_desc;
        }
        // r['model'] = r?.model || '--'
      });
      
      result = ret.data
    }

    return result;
  },

  transformer: '',
}
