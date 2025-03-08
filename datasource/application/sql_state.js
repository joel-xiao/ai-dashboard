import appService from '@/service/app.service';
import sqlService from '@/service/sql';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['server'];

export default {
  id: 'datasource-sql-states',
  category: 'application',
  name: 'SQL统计',
  type: 'object',
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
  },
  metrics: {
    total: {
      type: Number,
      label: '查询次数',
      description: 'SQL查询次数',
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
    
    dur: {
      type: Number,
      label: '响应时间',
      description: 'SQL平均响应时间',
    },
    

    slow_rate: {
      type: Number,
      label: '缓慢率',
      description: 'SQL缓慢率',
    },

    disp_rate: {
      type: Number,
      label: '极慢率',
      description: 'SQL极慢率',
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

  parseRateVal(val, dot = 2) {
    let str = parseFloat(val)
    isNaN(str) && (str = 0);
    str = str * 100;
    str = str.toFixed(dot);
    while(true) {
      if (str.endsWith('0') || str.endsWith('.')) {
        str = str.substring(0, str.length - 1);
      } else {
        break;
      }
    }

    return str || 0;
  },

  requester: async function(args, metrics) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};

    let fields = 'total,dur,tolerated,frustrated,disp_rate,slow_rate,sqlerr';
    metrics && metrics.length > 0 && (fields = metrics.join(','));
    let options = {
      period: `${period[0]},${period[1]}`,
      fields,
    };

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    let ret = await sqlService.getSqlStats(appid, options);
    if (ret.result === 'ok') {
      if (params.group_by) {
        let group_by = [];
        ret.data.forEach( r => {
          r.dur = r.dur || 0;
          let item = {
            total: r.total,
            dur: parseInt(r.dur) === r.dur ? r.dur : r.dur.toFixed(2) + 'ms',
            tolerated: r.tolerated,
            frustrated: r.frustrated,
            sqlerr: r.sqlerr,
            slow_rate: this.parseRateVal(r.slow_rate) + '%',
            disp_rate: this.parseRateVal(r.disp_rate) + '%',
          };

          let data = [];
          let name = [];
          Object.keys(item).forEach(key => {
            if (metrics.find(r => r === key)) {
              data.push(item[key] || 0);
              name.push({ name: this.metrics[key]?.label, key });
            }
          });
          group_by.push({
            appsysid: r.appsysid,
            appid: r.appid,
            group: r.group,
            names: name,
            data,
          });
        })
        result['group_by'] = group_by;
        result['default'] = {};
      } else {
        ret = ret.data[0] || {};
        ret.dur = ret.dur || 0;
        result = {
          total: ret.total,
          dur: parseInt(ret.dur) === ret.dur ? ret.dur : ret.dur.toFixed(2),
          tolerated: ret.tolerated,
          frustrated: ret.frustrated,
          sqlerr: ret.sqlerr,
          slow_rate: this.parseRateVal(ret.slow_rate) + '%',
          disp_rate: this.parseRateVal(ret.disp_rate) + '%',
        };

        let data = [];
        let name = [];
        Object.keys(result).forEach(key => {
          if (metrics.find(r => r === key)) {
            data.push((key === 'dur' ? (result[key] || 0) + 'ms' : (result[key] || 0)));
            name.push({ name: this.metrics[key]?.label, key });
          }
        });

        result = {
          default: {
            names: name,
            data,
          },
        };
      }
    }

    return result;
  },

  transformer: '',
}
