import { period_list, parsePeriod, getAppParams, getStatesResultGroupBy } from '../util';
import userService from '@/service/user.service';

export default {
  id: 'datasource-user-map',
  category: 'application',
  name: '访问地图数据',
  type: 'array',
  ver: 1.1,
  order: 5,
  multiMetric: true,
  arguments: {
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
      label: '访问量',
      description: '用户的访问量',
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

    let params = this.bindArgValue(args);

    let period = parsePeriod(params.period, params.sysPeriod);

    let opt = {
      period: `${period[0]},${period[1]}`,
      group_by: 'province',
      fields: 'ip_count',
    };

    let appParams = await getAppParams(params, options, this.arguments, false);
    options = appParams.options;

    let ret = await userService.getUserIPStats(opt);
    let result = ((ret && ret.data)  || []).map(item => {
      item.total = item.ip_count;
      return item;
    });

    return result;
  },
  
  transformer: '',
}
