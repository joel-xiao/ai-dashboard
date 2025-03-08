import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['mobile','web'];

export default {
  id: 'datasource-jserr-error-states',
  category: 'application',
  name: '脚本错误统计',
  type: 'object',
  ver: 1.1,
  order: 15,
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

    // limit: {
    //   type: Number,
    //   label: '数量',
    //   ctrl: 'input',
    //   default: 10,
      // min: 1,
    // },
  },
  metrics: {
    total: {
      type: String,
      label: '错误次数',
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
    let options = {
      period: `${period[0]},${period[1]}`,
    };

    /*if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }*/

    let fields = '';
    metrics && metrics.length > 0 && (fields = metrics.join(','));
    //fields && (options.fields = fields);

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    let ret = await appService.getWebAppErrorStats(appid, options);
    let unit = this.metrics['total']?.unit || '';
    if (ret.result === 'ok') {
      if (params.group_by) {
        let group_by = [];
        ret.data.forEach(r => {
          group_by.push({
            appsysid: r.appsysid,
            appid: r.appid,
            group_by: r.group,
            names: ['total'],
            data: [r.total ? (r.total + unit) : 0],
          })
        })
        result['group_by'] = group_by;
        result['default'] = {};
      } else {
        result['default'] = {
          names: ['total'],
          data: [ret.data.map(r => r.total)[0] ? ret.data.map(r => r.total)[0] + unit : 0],
        };
      }
    }
    
    return result;
  },

  transformer: '',
}
