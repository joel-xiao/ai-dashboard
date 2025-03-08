import userService from '@/service/user.service';
import appService from '@/service/app.service';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy, getMetrics } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['web', 'mobile'];

export default {
  id: 'datasource-user-stats-count',
  category: 'application',
  name: '用户数量统计',
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
  },
  metrics: {
    total: {
      type: Number,
      label: '用户数',
      description: '访问的用户数',
    },

    newuser: {
      type: Number,
      label: '新增用户数',
      description: '新增加的访问的用户数',
    },

    activeuser: {
      type: Number,
      label: '活跃用户数',
      description: '活跃的用户数',
    },

    ip_count: {
      type: Number,
      label: '访问IP数'
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

  requester: async function(args, metrics) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }
    let metric_params = getMetrics(metrics, this.metrics);
    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    let result = {};

    const custom_fields = ['newuser', 'activeuser', 'ip_count'];
    let options = {
      period: `${period[0]},${period[1]}`,
      fields:['user_count', ... metric_params.metrics].filter(r => !custom_fields.some(custom_field => custom_field === r)).join(','),
    };

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;
    let appid = appParams.appid;

    let userResult = await userService.getSessionStats(options);

    delete options.fields;
    let newUserResult = await userService.getNewUserStats(options);
    let ipCountResult = await userService.getUserIPStats({
      ...options,
      fields: 'ip_count'
    });
    if (params.group_by) {
      let group_by = [];
      userResult.data && Array.isArray(userResult.data) && userResult.data.forEach( item => {
        let newUser = newUserResult.data && Array.isArray(newUserResult.data) && newUserResult.data || [];
        let ipCount = ipCountResult.data && Array.isArray(ipCountResult.data) && ipCountResult.data || [];
        params.group_by.split(',').forEach( by => {
          newUser = newUser.filter( r => r[by] === item[by])
          ipCount = ipCount.filter( r => r[by] === item[by])
        })

        group_by.push({
          appsysid: item.appsysid,
          appid: item.appid,
          group: item.group,
          ...this.formatterRequesterResult(item, newUser[0], ipCount[0]),
        })
      });
      result.group_by = group_by;
      result['default'] = {};
    } else {
      result.default = this.formatterRequesterResult(userResult.data && Array.isArray(userResult.data) && userResult.data[0], newUserResult.data && Array.isArray(newUserResult.data) && newUserResult.data[0], ipCountResult.data && Array.isArray(ipCountResult.data) && ipCountResult.data[0]);
    }

    return result;
  },

  formatterRequesterResult: function(userItem, newUserItem, ipCountItem) {
    let user = 0, newUser = 0, ipCount = 0;
    if (userItem) {
      user = userItem.user_count || 0;
    }
    if (newUserItem) {
      newUser = newUserItem.new_users || 0;
    }

    if (ipCountItem) {
      ipCount = ipCountItem.ip_count || 0;
    }
    return {
      names: ['total', 'newuser', 'activeuser', 'ip_count'],
      data: [
        user,
        newUser,
        (user - newUser) > 0 ? (user - newUser) : 0,
        ipCount
      ]
    };
  },

  transformer: '',
}
