const dataSources = [
  {
    id: "request",
    name: "请求",
    category: "请求",
    ds: {
      time: "datasource-application-timeseries",
      total: "datasource-application-status",
      top: "datasource-application-states-count--v2",
      stats: "datasource-application-states",
      raw: "datasource-application-request",
    },
    apptypes: ['server', 'web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats', 'chartTable', 'chartCard',
      'chartText_raw', 'chartText', 'node', 'metric', 'link'
    ],
    data_plane_iconTypes: [
      'chartBar_total', 'chartPie_total'
    ],
  },
  /*{
    id: "requesttps",
    name: "请求TPS",
    category: "业务请求",
    ds: {
      total: "datasource-application-status-tps",
    },
    apptypes: ['server', 'web', 'mobile']
  },*/
  {
    id: "sql",
    name: "SQL",
    category: "SQL",
    ds: {
      time: "datasource-sql-timeseries",
      total: "datasource-sql-states",
      top: "datasource-sql-tmpl-top--v2",
      stats: "datasource-sql-tmpl-states",
      raw: "datasource-sqls-states",
    },
    apptypes: ['server'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats', 'chartTable',
      'chartCard', 'chartText_raw', 'chartText', 'node', 'metric', 'link'
    ],
  },
  {
    id: "frezzen",
    name: "卡顿",
    category: "问题",
    ds: {
      time: 'datasource-freeze-timeseries',
      total: 'datasource-freeze-states-cnt',
      top: 'datasource-freeze-error-states--v2',
      stats: 'datasource-freeze-states',
      raw: 'datasource-freeze'
    },
    apptypes: ['mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats', 'chartTable',
      'chartCard', 'chartText_raw', 'chartText', 'node', 'metric', 'link'
    ],
  },
  {
    id: "crash",
    name: "崩溃",
    category: "问题",
    ds: {
      time: 'datasource-crash-timeseries',
      total: 'datasource-crash-states-cnt',
      top: 'datasource-crash-error-states--v2',
      stats: 'datasource-crash-states',
      raw: 'datasource-crashs'
    },
    apptypes: ['mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats', 'chartTable',
      'chartCard', 'chartText_raw', 'chartText', 'node', 'metric', 'link'
    ],
  },
  {
    id: "exception",
    name: "程序异常",
    category: "问题",
    ds: {
      time: "datasource-exception-timeseries",
      total: "datasource-exception-states-cnt",
      top: "datasource-exception-states--v2",
      stats: "datasource-exception-states",
      raw: "datasource-application-exceptions",
    },
    apptypes: ['server'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats', 'chartTable',
      'chartCard', 'chartText_raw', 'chartText', 'node', 'metric', 'link'
    ],
  },
  {
    id: "jserr",
    name: "脚本错误",
    category: "问题",
    ds: {
      time: 'datasource-jserr-timeseries',
      total: 'datasource-jserr-error-states',
      top: 'datasource-jserr-states--v2',
      stats: 'datasource-jserr-states',
      raw: 'datasource-jserrs'
    },
    apptypes: ['web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats', 'chartTable',
      'chartCard', 'chartText_raw', 'chartText', 'node', 'metric', 'link'
    ],
  },

  {
    id: "uevent",
    name: "业务操作",
    category: "用户体验",
    ds: {
      time: 'datasource-webapp-uevent-timeseries',
      total: 'datasource-webapp-uevent-cnt',
      top: 'datasource-webapp-uevent-stats-top--v2',
      stats: 'datasource-webapp-uevent-stats',
      raw: 'datasource-webapp-uevents'
    },
    apptypes: ['web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats', 'chartTable',
      'chartCard', 'chartText_raw', 'chartText', 'node', 'metric', 'link'
    ],
  },
  {
    id: "page",
    name: "页面",
    category: "用户体验",
    ds: {
      time: 'datasource-webpage-timeseries',
      total: 'datasource-webpage-states-cnt',
      top: 'datasource-webpage-top--v2',
      stats: 'datasource-webpage-states',
      raw: 'datasource-webpages'
    },
    apptypes: ['web'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats', 'chartTable',
      'chartCard', 'chartText_raw', 'chartText', 'node', 'metric', 'link'
    ],
  },
  {
    id: "webview",
    name: "webview",
    category: "用户体验",
    ds: {
      time: 'datasource-webview-timeseries',
      total: 'datasource-webview-states-cnt',
      top: 'datasource-webview-top--v2',
      stats: 'datasource-webview-states',
      raw: 'datasource-webviews'
    },
    apptypes: ['mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats', 'chartTable',
      'chartCard', 'chartText_raw', 'chartText', 'node', 'metric', 'link'
    ],
  },
  {
    id: "agent",
    name: "探针",
    category: "应用实例",
    ds: {
      time: 'datasource-agent-jvm-timeseries',
      raw: 'datasource-agents',
      total: 'datasource-agent-jvm-stats',
    },
    apptypes: ['server'],
    iconTypes: [
      'chartLine', 'chartBar_time',
      'chartTable', 'chartCard',
      'chartText_raw', 'node', 'metric', 'link'
    ],
  },
  {
    id: "protrait",
    name: "用户",
    category: "用户画像",
    ds: {
      time: 'datasource-user-portrait-timeseries',
      total: 'datasource-user-stats-count',
      top: 'datasource-user-portrait-states-top',
      stats: 'datasource-user-portrait-states',
      raw: 'datasource-users'
    },
    apptypes: ['web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats', 'chartCard', 'chartText_raw', 'chartText',
      'chartTable', 'node', 'metric', 'link'
    ],
  },
  {
    id: "session",
    name: "会话",
    category: "用户画像",
    ds: {
      time: 'datasource-user-session-timeseries',
      total: 'datasource-user-session-stats-count',
      top: 'datasource-user-session-states-top',
      stats: 'datasource-user-session-states',
      raw: 'datasource-sessions'
    },
    apptypes: ['web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats', 'chartCard', 'chartText_raw', 'chartText',
      'chartTable', 'node', 'metric', 'link'
    ],
  },
  {
    id: "ip",
    name: "访问IP",
    category: "用户画像",
    ds: {
      time: 'datasource-user-ip-timeseries',
      total: 'datasource-user-ip-states-count',
      top: 'datasource-user-ip-states--v2',
      stats: 'datasource-user-ip-states',
      raw: 'datasource-ips'
    },
    apptypes: ['web', 'mobile', 'server'],
    iconTypes: [
      'chartLine', 'chartBar_time', 'chartBar', 'chartTop', 'chartPie',
      'chartTable_top', 'chartTable_stats',
      'chartCard', 'chartText_raw', 'chartText',
      'chartTable', 'node', 'metric', 'link'
    ],
  },
  {
    id: "event_all",
    name: "全部告警",
    category: "告警",
    ds: {
      time: 'datasource-event-timeseries',
      total: 'datasource-event-count',
      top: 'datasource-event-states--v2',
      stats: 'datasource-event-states',
      raw: 'datasource-events'
    },
    apptypes: ['server', 'web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time',
      'chartBar', 'chartTop', 'chartPie',
      'chartTable_top',
      'chartTable_stats',
      'chartTable',
      'chartCard', 'chartText_raw', 'chartText',
      'node', 'metric', 'link'
    ],
  },
  {
    id: "event",
    name: "应用指标", 
    category: "告警",
    ds: {
      time: 'datasource-event-timeseries',
      total: 'datasource-event-count',
      top: 'datasource-event-states--v2',
      stats: 'datasource-event-states',
      raw: 'datasource-events'
    },
    apptypes: ['server', 'web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time',
      'chartBar', 'chartTop', 'chartPie',
      'chartTable_top',
      'chartTable_stats',
      'chartTable',
      'chartCard', 'chartText_raw', 'chartText',
      'node', 'metric', 'link'
    ],
  },
  {
    id: "event_request",
    name: "业务请求",
    category: "告警",
    ds: {
      time: 'datasource-event-timeseries',
      total: 'datasource-event-count',
      top: 'datasource-event-states--v2',
      stats: 'datasource-event-states',
      raw: 'datasource-events'
    },
    apptypes: ['server', 'web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time',
      'chartBar', 'chartTop', 'chartPie',
      'chartTable_top',
      'chartTable_stats',
      'chartTable',
      'chartCard', 'chartText_raw', 'chartText',
      'node', 'metric', 'link'
    ],
  },
  {
    id: "event_agent",
    name: "应用心跳",
    category: "告警",
    ds: {
      time: 'datasource-event-timeseries',
      total: 'datasource-event-count',
      top: 'datasource-event-states--v2',
      stats: 'datasource-event-states',
      raw: 'datasource-events'
    },
    apptypes: ['server', 'web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time',
      'chartBar', 'chartTop', 'chartPie',
      'chartTable_top',
      'chartTable_stats',
      'chartTable',
      'chartCard', 'chartText_raw', 'chartText',
      'node', 'metric', 'link'
    ],
  },
  {
    id: "event_system",
    name: "应用状态",
    category: "告警",
    ds: {
      time: 'datasource-event-timeseries',
      total: 'datasource-event-count',
      top: 'datasource-event-states--v2',
      stats: 'datasource-event-states',
      raw: 'datasource-events'
    },
    apptypes: ['server', 'web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time',
      'chartBar', 'chartTop', 'chartPie',
      'chartTable_top',
      'chartTable_stats',
      'chartTable',
      'chartCard', 'chartText_raw', 'chartText',
      'node', 'metric', 'link'
    ],
  },
  {
    id: "event_exception",
    name: "程序异常",
    category: "告警",
    ds: {
      time: 'datasource-event-timeseries',
      total: 'datasource-event-count',
      top: 'datasource-event-states--v2',
      stats: 'datasource-event-states',
      raw: 'datasource-events'
    },
    apptypes: ['server', 'web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time',
      'chartBar', 'chartTop', 'chartPie',
      'chartTable_top',
      'chartTable_stats',
      'chartTable',
      'chartCard', 'chartText_raw', 'chartText',
      'node', 'metric', 'link'
    ],
  },
  {
    id: "event_vip",
    name: "VIP用户",
    category: "告警",
    ds: {
      time: 'datasource-event-timeseries',
      total: 'datasource-event-count',
      top: 'datasource-event-states--v2',
      stats: 'datasource-event-states',
      raw: 'datasource-events'
    },
    apptypes: ['server', 'web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time',
      'chartBar', 'chartTop', 'chartPie',
      'chartTable_top',
      'chartTable_stats',
      'chartTable',
      'chartCard', 'chartText_raw', 'chartText',
      'node', 'metric', 'link'
    ],
  },

  {
    id: "health",
    name: "健康评分",
    category: "健康评分",
    ds: {
      time: "datasource-health-timeseries",
      total: "datasource-health-stats",
    },
    apptypes: ['server', 'web', 'mobile'],
    iconTypes: [
      'chartLine', 'chartBar_time',
      'chartCard', 'chartText', 'chartHealth',
      'node', 'metric', 'link'
    ],
  }
];

