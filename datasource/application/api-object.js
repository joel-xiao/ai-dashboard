import service from '@/service/dashboard.service';

const isHide = function(metrics, arg, val, hide) {
  if (arg === 'method') {
    let hide = val !== 'post' && val !== 'put';
    return hide;
  }
  return hide;
};

export default {
  id: 'datasource-thirdparty-api-object',
  category: 'application',
  name: '自定义',
  type: 'object',
  multiMetric: true,
  ver: 1.1,
  order: 1,
  arguments: {
    gm_ssl: {
      type: String,
      label: '国秘',
      ctrl: 'switch',
      placeholder: '是否为国秘请求',
      hide: true
    },
 
    url: {
      type: String,
      label: 'URL',
      ctrl: 'input',
      placeholder: '请输入请求URL',
    },
    method: {
      type: String,
      label: '方法',
      ctrl: 'select',
      default: 'get',
      options: [
        { label:'GET', value:'get' },
        { label:'POST', value:'post' },
        { label:'PUT', value:'put' },
        { label:'OPTION', value:'option' },
      ],
      required: true,
    },
    
    datatype: {
      type: String,
      label: '数据类型',
      ctrl: 'select',
      default: 'array',
      link_root_key:'dataType',
      required: true,
      options: [
        { label:'数组', value:'array' },
        { label:'对象', value:'object' },
      ], 
      required: true,
    },

    headers: {
      type: String,
      label: '请求头',
      ctrl: 'metric-table',
      options: [],
    },

    body: {
      type: String,
      label: '请求体',
      ctrl: 'textarea',
      options: [],
      link_root_key:'body',
      isHide: (metrics, arg, val, hide) => {
        hide = hide === true || hide === false ? hide : true;
        return isHide(metrics, arg, val, hide);
      }
    },

    formatter: {
      type: String,
      label: '返回值数据转换',
      ctrl: 'result-format',
      link_root_key:'transformer',
      options: [],
    },

    kpi: {
      type: String,
      label: '指标',
      ctrl: 'metric-table',
      split_str: '|',
      required: true,
      options: [],
    },
  },
  metrics: {
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

  parseVal(val, dot) {
    let str = parseFloat(val).toFixed(dot);
    isNaN(str) && (str = 0);
    return str;
  },

  requester: async function(args, metrics, query) {
    if (!this.checkArguments(args)) {
      return 'arg fail';
    }

    let params = this.bindArgValue(args);
    if (typeof params.headers === 'object') {
      params.headers = JSON.stringify(params.headers);
    }

    const is_client_request = service.isSameDomainAndPort(params.url) || params.gm_ssl;
    let ret = is_client_request ? await service.getThirdpartyApiClient(params) : await service.getThirdpartyApi(params);
    if (ret && ret.result && ret.result !== 'Api Error' && ret.data) {
      return ret.data;
    } else if (ret && ret.result && ret.result === 'Api Error') {
      return ret;
    } else {
      return {};
    }
  },

  transformer: '',
}
