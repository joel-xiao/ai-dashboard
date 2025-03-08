import userService from '@/service/user.service';
import appService from '@/service/app.service';
import vipuserService from '@/service/vipuser.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['web', 'mobile'];

export default {
  id: 'datasource-user-userapp-states',
  category: 'application',
  name: '应用指标次数',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 7,
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
            APPLICAION_TYPES,
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
    }
  },
  metrics: {
    freeze: {
      type: Number,
      label: '卡顿数',
    },
    crash: {
      type: Number,
      label: '崩溃数',
    },
    jserr: {
      type: Number,
      label: '脚本错误',
    },
    normal: {
      type: Number,
      label: '快速数',
    },
    slow: {
      type: Number,
      label: '缓慢数',
    },
    frustrated: {
      type: Number,
      label: '极慢数',
    },
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

  getUserNameByID(id) {
    let vip = this.vipusers.find(r => r.user_id === id);
    if (vip) {
      return vip.name;
    }

    return id;
  },

  async loadVipUser() {
    let ret = await vipuserService.getVipUserConfigs();
    this.vipusers = ret.data.map(r => {
      return {
        name: r.name,
        user_id: r.type === 'user_id' ? r.code : undefined,
        user_ip: r.type === 'ip' ? r.code : undefined,
        id: r.id,
      };
    });
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
      group_by: 'user_id',
    };

    if (params.limit) {
      options.skip = 0;
      options.limit = params.limit;
    }

    let appParams = await getAppParams(params, options, this.arguments, false);
    options = appParams.options;

    await this.loadVipUser();

    if (metrics.find(r => r ==='freeze')) {
      let ret = await appService.getAppFreezeStats('_all', options);
      if (ret.result === 'ok') {
        result['freeze'] = {
          names: ret.data.map(r => this.getUserNameByID(r.user_id)),
          data: ret.data.map(r => r.total),
        }
      }
    }

    if (metrics.find(r => r ==='crash')) {
      let ret = await appService.getAppCrashStats('_all', options);
      if (ret.result === 'ok') {
        result['crash'] = {
          names: ret.data.map(r => this.getUserNameByID(r.user_id)),
          data: ret.data.map(r => r.total),
        }
      }
    }

    if (metrics.find(r => r ==='jserr')) {
      let ret = await appService.getWebAppErrorStats('_all', options);
      if (ret.result === 'ok') {
        result['jserr'] = {
          names: ret.data.map(r => this.getUserNameByID(r.user_id)),
          data: ret.data.map(r => r.total),
        }
      }
    }

    if (metrics.find(r => r ==='normal')) {
      options.fields = 'total';
      let ret = await appService.getAppRequestStats('_all', options);
      if (ret.result === 'ok') {
        result['normal'] = {
          names: ret.data.map(r => this.getUserNameByID(r.user_id)),
          data: ret.data.map(r => r.total),
        }
      }
    }

    if (metrics.find(r => r ==='slow')) {
      options.fields = 'slow';
      options.sort = 'slow';
      let ret = await appService.getAppRequestStats('_all', options);
      if (ret.result === 'ok') {
        result['slow'] = {
          names: ret.data.map(r => this.getUserNameByID(r.user_id)),
          data: ret.data.map(r => r.slow),
        }
      }
    }

    if (metrics.find(r => r ==='frustrated')) {
      options.fields = 'frustrated';
      options.sort = 'frustrated';
      let ret = await appService.getAppRequestStats('_all', options);
      if (ret.result === 'ok') {
        result['frustrated'] = {
          names: ret.data.map(r => this.getUserNameByID(r.user_id)),
          data: ret.data.map(r => r.frustrated),
        }
      }
    }

    return result;
  },

  transformer: '',
}
