import npmService from '@/service/npm.service';
import util from "@/views/npm/util";
import { period_list, getPrecisions } from '../util';
import moment from 'moment';

export default {
  id: 'datasource-network-device-status',
  category: 'device',
  name: '设备状态',
  type: 'object',
  ver: 1.1,
  order: 17,
  arguments: {
    ip: {
      type: String,
      label: 'IP地址',
      ctrl: 'input',
      default: '',
    }
  },

  metrics: {
    status: { 
      type: String, 
      label: '告警信息'
    },
  },

  desc: '0 = 未知状态<br/> 1 = 正常<br/> 2 = 手动关闭<br/> 3 = 异常关闭',

  async getInterfaceInfo(id) {
    let info = {};
    if (!this.probData) {
      let ret = await npmService.getInterfaceTree();
      this.probData = ret.data || [];
    }

    this.probData.forEach(r => {
      let find = r.instances.find(r => r.id === id);
      if (find) {
        info = find;
      }
    });
    
    return info;
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
    let options = {}
    if (params.ip) {
      options.filter && (options.filter += `,ip=${params.ip}`);
      !options.filter && (options.filter = `ip=${params.ip}`);
    }

    let ret = await npmService.getNetworkDeviceStatus(options);
    if (ret.result === 'ok') {
      let status = 0;
      if (!ret.data || ret.data.length === 0) {
        status = 0;
      } else {
        if (ret.data.some(r => r.state === 'down')) {
          status = 3;
        } else if (ret.data.some(r => r.state === 'administratively down')) {
          status = 2;
        } else {
          status = 1;
        }
      }
      let showValues = [];
      if (Array.isArray(ret.data)) {
        ret.data.forEach(r => {
          let info = r.interface + ': ' + r.state;
          const time = moment(r.last_ts).format('YYYY-MM-DD HH:mm:ss');
          info = `${time}<br>${info}`;
          showValues.push(info);
        });
        showValues = showValues.join('<br>');
      }
      return {
        default: {
          names: ['status'],
          data: [status],
          showValues: [showValues]
        }
      };
    }

    return {
      default: {
        names: ['status'],
        data: [0],
        showValues: [''],
      }
    };
  },
  
  transformer: '',
}
