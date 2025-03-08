import appService from '@/service/app.service';
import userService from '@/service/user.service';
import periodService from '@/service/period';
import { period_list, parsePeriod } from '../util';
import { RequestStatsFilter } from '@/service/filters';
import regionsJson from '@/components/business/map-editor/data/list.json';

export default {
  id: 'datasource-regions-states-count',
  category: 'application',
  name: '分布统计',
  type: 'array',
  ver: 1.1,
  order: 2,
  arguments: {
    country: {
      type: String,
      label: '国家',
      ctrl: 'select',
      default: 'china',
      required: true,
      options: function() {
        return [{
          label: '中国',
          value: 'china'
        }];
      }
    },
    province: {
      type: String,
      label: '省份',
      ctrl: 'select',
      default: '',
      options: function() {
        const result = regionsJson[0].children.map(r => {
          return {
            label: r.label,
            value: r.label
          }
        });
        result.unshift({ label: '全部', value: '' });
        return result;
      }
    },
    city: {
      type: String,
      label: '城市',
      ctrl: 'select',
      default: '',
      dependencies: ['province'],
      options: function(province) {
        if (!province) {
          return [];
        }

        const result = regionsJson[0]
          .children.find(r => r.label === province)
          .children.map(r => {
          return {
            label: r.label,
            value: r.label
          }
        });
        result.unshift({ label: '全部', value: '' });
        return result;
      }
    },

    appid: {
      type: String,
      label: '应用ID',
      ctrl: 'multiple-select-cascader',
      options: async function() {
        if (this.app_options) {
          return this.app_options;
        }

        let apps = await appService.getApps();
        let result = apps.data.map(app => {
          return {
            label: app.name || app.id,
            value: app.id,
          }
        });
        
        this.app_options = result;
        return result;
      },
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
      label: 'TOP数量',
      ctrl: 'input',
      default: 10,
    },
  },
  metrics: {
    region: {
      type: String,
      label: '地区',
      description: '统计分布地区名称',
    },

    total: {
      type: Number,
      label: '请求数',
      description: '请求总数',
    },

    jsErr: {
      type: Number,
      label: '脚本错误数',
      description: '脚本错误总数',
    },

    crash: {
      type: Number,
      label: '崩溃数',
      description: '崩溃数',
    },

    freeze: {
      type: Number,
      label: '卡顿数',
      description: '卡顿数',
    },

    page_total: {
      type: Number,
      label: '页面访问数',
      description: '页面访问数',
    },

    user_count: {
      type: Number,
      label: '用户访问数',
      description: '用户访问数',
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

  requester: async function(args, metrics, query) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);
    let period = parsePeriod(params.period, params.sysPeriod);
    
    const group_by = params.province ? 'city' : 'province';
    const filter = [];

    let options = {
      period: `${period[0]},${period[1]}`,
      group_by,
    };

    if (params.province && !params.city) {
      filter.push(`province=${params.province}`);
    }
    if (params.city) {
      filter.push(`city=${params.city}`);
    }

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
      }
    }

    if (params.biz) {
      let bizFilter = '';
      if (Array.isArray(params.biz)) {
        bizFilter = params.biz.map(r => `group=${r}`).join(',');
      } else {
        bizFilter = `group=${params.biz}`;
      }
      filter.push(bizFilter);
    }

    if (params.bizOnly) {
      filter.push('exists=model');
    }

    if (Array.isArray(appid) && appid.length > 0) {
      filter.push(appid.map(r => `appid=${r}`).join(','));
    } 

    if (filter.length > 0) {
      options.filter = filter.join(',');
    }
    
    const result = [];
    if (metrics.find(r => r === 'total')) {
      options.fields = 'total';
      const ret = await appService.getAppRequestStats('_all', options);
      const data = Array.isArray(ret.data) ? ret.data : [];
      data.forEach(r => {
        r.region = r[group_by];
        
        result.push({
          region: r.region,
          total: r.total,
        });
      });
    }

    if (metrics.find(r => r === 'jsErr')) {
      options.fields = 'total';
      const ret = await appService.getWebAppErrorStats('_all', options);
      const data = Array.isArray(ret.data) ? ret.data : [];
      data.forEach(r => {
        r.region = r[group_by];
        
        const exist = result.find(item => item.region === r.region)
        if (exist) {
          exist.jsErr = r.total;
        } else {
          result.push({
            region: r.region,
            jsErr: r.total,
          });
        }
      });
    }

    if (metrics.find(r => r === 'crash')) {
      options.fields = 'total';
      const ret = await appService.getAppCrashStats('_all', options);
      const data = Array.isArray(ret.data) ? ret.data : [];
      data.forEach(r => {
        r.region = r[group_by];
        
        const exist = result.find(item => item.region === r.region)
        if (exist) {
          exist.crash = r.total;
        } else {
          result.push({
            region: r.region,
            crash: r.total,
          });
        }
      });
    }

    if (metrics.find(r => r === 'freeze')) {
      options.fields = 'total';
      const ret = await appService.getAppFreezeStats('_all', options);
      const data = Array.isArray(ret.data) ? ret.data : [];
      data.forEach(r => {
        r.region = r[group_by];
        
        const exist = result.find(item => item.region === r.region)
        if (exist) {
          exist.freeze = r.total;
        } else {
          result.push({
            region: r.region,
            freeze: r.total,
          });
        }
      });
    }

    if (metrics.find(r => r === 'page_total')) {
      options.fields = 'total';
      const ret = await appService.getWebAppStats('_all', options);
      const data = Array.isArray(ret.data) ? ret.data : [];
      data.forEach(r => {
        r.region = r[group_by];
        
        const exist = result.find(item => item.region === r.region)
        if (exist) {
          exist.page_total = r.total;
        } else {
          result.push({
            region: r.region,
            page_total: r.total,
          });
        }
      });
    }

    if (metrics.find(r => r === 'user_count')) {
      options.fields = 'user_count';
      const ret = await userService.getSessionStats(options);
      const data = Array.isArray(ret.data) ? ret.data : [];
      data.forEach(r => {
        r.region = r[group_by];
        
        const exist = result.find(item => item.region === r.region)
        if (exist) {
          exist.user_count = r.total;
        } else {
          result.push({
            region: r.region,
            user_count: r.user_count,
          });
        }
      });
    }

    //合并指标
    const allkeys = {};
    const allRegions = {};
    result.forEach(item => {
      allRegions[item.region] = 1;
      Object.keys(item).forEach(r => {
        allkeys[r] = 1;
      })
    });
    Object.keys(allRegions).forEach(reg => {
      const exist = result.find(r => r.region === reg);
      if (!exist) {
        result.push({ region: reg });
      }
    });
    result.forEach(item => {
      Object.keys(allkeys).forEach(key => {
        !item[key] && (item[key] = 0);
      })
    });

    return result;
  
  },

  transformer: '',
}