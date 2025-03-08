import userService from '@/service/user.service';
import appService from '@/service/app.service';
import moment from 'moment';
import periodService from '@/service/period';
import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import { getAppsysOptions, getAppOptions, getModelOptions } from '../apm_options';

const APPLICAION_TYPES = ['web', 'mobile'];

export default {
  id: 'datasource-user-portrait-timeseries',
  category: 'application',
  name: '画像时间线',
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

    new_users: {
      type: Number,
      label: '新增用户数',
      description: '新增的访问的用户数',
    },

    ip_count: {
      type: Number,
      label: '访问IP数'
    },

    activeuser: {
      type: Number,
      label: '活跃用户数',
      description: '活跃的用户数',
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

    const alias_bys = {};
    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);
    let result = [];
    let times = [];
    let groupResult = {};
    let options = {
      period: `${period[0]},${period[1]}`,
      granularity: periodService.getGranularity(period[0], period[1])
    };

    let appParams = await getAppParams(params, options, this.arguments);
    options = appParams.options;

    if (metrics.find(r => r === 'total')) {
      options.fields = 'user_count';
      let ret = await userService.getSessionTimeseries(options);
      if (ret.result === 'ok') {
        times = ret.data.map(r => r.timestamp);
        if (params.group_by) {
          groupResult.total = ret.data.map(r => {
            r.total = [r.timestamp, r.user_count || 0];
            return r;
          });
        } else {
          result = ret.data.map(r => {
            return {
              total: [r.timestamp, r.user_count || 0],
            }
          });
        }
      }
    }

    if (metrics.find(r => r === 'new_users')) {
      let ret = await userService.getNewUserTimeseries(options);
      if (ret.result === 'ok') {
        if (times.length === 0 ) {
          times = ret.data.map(r => r.timestamp);
        }
        if (params.group_by) {
          groupResult.new_users = ret.data.map((r, idx) => {
            r.new_users = [times[idx], r.new_users || 0];
            return r;
          });
        } else {
          if (result.length > 0) {
            ret.data.forEach((r, idx) => {
              result[idx]['new_users'] = [times[idx], r.new_users || 0];
            });
          } else {
            result = ret.data.map((r, idx)=> {
              return {
                new_users: [times[idx], r.new_users || 0],
              }
            });
          }
        }
      }
    }

    if (metrics.find(r => r === 'ip_count')) {
      options.fields = 'ip_count';
      let ret = await userService.getUserIPTimeseries(options);
      if (ret.result === 'ok') {
        if (times.length === 0 ) {
          times = ret.data.map(r => r.timestamp);
        }
        if (params.group_by) {
          groupResult.ip_count = ret.data.map((r, idx) => {
            r.ip_count = [times[idx], (r.ip_count || 0)];
            return r;
          });
        } else {
          if (result.length > 0) {
            ret.data.forEach((r, idx) => {
              result[idx].ip_count = [times[idx], (r.ip_count || 0)];
            });
          } else {
            result = ret.data.map((r, idx) => {
              return {
                ip_count: [times[idx], (r.ip_count || 0)],
              }
            });
          }
        }
      }
    }

    if (metrics.find(r => r === 'sessions')) {
      options.fields = 'sessions';
      let ret = await userService.getUserTimeseries(options);
      if (ret.result === 'ok') {
        if (times.length === 0 ) {
          times = ret.data.map(r => r.timestamp);
        }
        if (params.group_by) {
          groupResult.sessions = ret.data.map((r, idx) => {
            r.sessions = [times[idx], r.sessions || 0];
            return r;
          });
        } else {
          if (result.length > 0) {
            ret.data.forEach((r, idx) => {
              result[idx].sessions = [times[idx], r.sessions || 0];
            });
          } else {
            result = ret.data.map((r, idx) => {
              return {
                sessions: [times[idx], r.sessions || 0],
              }
            });
          }
        }
      }
    }

    if (metrics.find(r => r === 'activeuser')) {
      options.fields = 'user_count';
      let ret = await userService.getSessionTimeseries(options);
      let activeRet = await userService.getNewUserTimeseries({
        ...options,
        fields: 'new_users'
      });
      activeRet = activeRet.data;
      if (ret.result === 'ok') {
        if (params.group_by) {
          groupResult.activeuser = ret.data.map((r, idx) => {
            // r.activeuser = [r.timestamp, ((r?.user_count || 0) - (activeRet[idx]?.new_users || 0) > 0 ? (r?.user_count  - activeRet[idx]?.new_users) : 0)];
            let number = 0;
            let find = activeRet.find(ar => ar.timestamp === r.timestamp);
            let find2 = activeRet.find(ar => ar.timestamp === r.timestamp && ar.appid && r.appid && ar.appid === r.appid);
            if (find2) {
              number = ((r?.user_count || 0) - (find2?.new_users || 0) > 0 ? (r?.user_count  - find2?.new_users) : 0);
            } else if (!find2 && find) {
              number = ((r?.user_count || 0) - (find?.new_users || 0) > 0 ? (r?.user_count  - find?.new_users) : 0);
            } else {
              number = (r?.user_count || 0);
            }
            r.activeuser = [r.timestamp, number];
            return r;
          });
        } else {
          if (result.length > 0) {
            ret.data.forEach((r, idx) => {
              // result[idx].activeuser = [r.timestamp, ((r?.user_count || 0) - (activeRet[idx]?.new_users || 0) > 0 ? (r?.user_count  - activeRet[idx]?.new_users) : 0)];
              let number = 0;
              let find = activeRet.find(ar => ar.timestamp === r.timestamp);
              let find2 = activeRet.find(ar => ar.timestamp === r.timestamp && ar.appid && r.appid && ar.appid === r.appid);
              if (find2) {
                number = ((r?.user_count || 0) - (find2?.new_users || 0) > 0 ? (r?.user_count  - find2?.new_users) : 0);
              } else if (!find2 && find) {
                number = ((r?.user_count || 0) - (find?.new_users || 0) > 0 ? (r?.user_count  - find?.new_users) : 0);
              } else {
                number = (r?.user_count || 0);
              }
              result[idx].activeuser = [r.timestamp, number];
            });
          } else {
            result = ret.data.map((r, idx) => {
              let number = 0;
              let find = activeRet.find(ar => ar.timestamp === r.timestamp);
              let find2 = activeRet.find(ar => ar.timestamp === r.timestamp && ar.appid && r.appid && ar.appid === r.appid);
              if (find2) {
                number = ((r?.user_count || 0) - (find2?.new_users || 0) > 0 ? (r?.user_count  - find2?.new_users) : 0);
              } else if (!find2 && find) {
                number = ((r?.user_count || 0) - (find?.new_users || 0) > 0 ? (r?.user_count  - find?.new_users) : 0);
              } else {
                number = (r?.user_count || 0);
              }
              return {
                // activeuser: [r.timestamp, ((r?.user_count || 0) - (activeRet[idx]?.new_users || 0) > 0 ? (r?.user_count  - activeRet[idx]?.new_users) : 0)],
                activeuser: [r.timestamp, number],
              }
            });
          }
        }
      }
    }

    if (params.group_by) {
      result = groupResult;
      let filters = params.group_by.split(',');
      filters.push('timestamp');
      let keys = Object.keys(result);
      let groups = [];
      keys.forEach( key => {
        result[key].forEach(r => {
          let items = groups;
          filters.forEach(by => {
            const alias_by = alias_bys[by] || by;
            items = items.filter( item => item[by] === r[alias_by]);
          })
          items = items[0]
          if (items) {
            items[key] = r[key];
            items['filter-' + key] = true;
          } else {
            let group = {[key]: r[key], merge: true, ['filter-' + key]: true};
            filters.forEach(by => {
              const alias_by = alias_bys[by] || by;
              group[by] = r[alias_by];
            })
            groups.push(group);
          }
        })
      });
      
      groups.forEach( r => {
        keys.forEach(key => {
          if (!r[key]) {
            r[key] = [r.timestamp, 0]
          } else {
            r[key] = [r[key][0], r[key][1] || 0];
          }
        })
      })
      groups = groups.sort( (a,b) => a.timestamp - b.timestamp);
      groups = groups.sort( (a,b) => a.timestamp - b.timestamp).map( r => { delete r.timestamp; return r});
      return groups
    } else {
      return result;
    }
  },

  transformer: '',
}
