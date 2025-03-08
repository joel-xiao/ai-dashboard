// data.js
const jsonData = [
  {
    "x": 0,
    "y": 0,
    "h": 400,
    "w": 1200,
    "type": "datatable",
    "style": "normal",
    "data": {
      "datasource-application-exceptions": [
        "time",
        "appsysid",
        "appid",
        "name",
        "message",
        "url"
      ]
    }
  },
  {
    "x": 1200,
    "y": 0,
    "h": 400,
    "w": 1200,
    "type": "linechart",
    "style": "normal",
    "data": {
      "datasource-exception-timeseries": [
        "total"
      ]
    }
  },
  {
    "x": 0,
    "y": 400,
    "h": 400,
    "w": 1200,
    "type": "barchart",
    "style": "group",
    "data": {
      "datasource-application-status": [
        "slow",
        "frustrated",
        "err",
        "fail",
        "neterr",
        "httperr"
      ]
    }
  },
  {
    "x": 1200,
    "y": 400,
    "h": 400,
    "w": 1200,
    "type": "linechart",
    "style": "curve",
    "data": {
      "datasource-application-status-tps": [
        "avg_tps",
        "max_tps",
        "min_tps"
      ]
    }
  },
  {
    "x": 0,
    "y": 800,
    "h": 400,
    "w": 1200,
    "type": "piechart",
    "style": "ring",
    "data": {
      "datasource-application-status": [
        "slow_rate",
        "frustrated_rate",
        "err_rate",
        "fail_rate",
        "err_4xx_rate",
        "err_5xx_rate"
      ]
    }
  },
  {
    "x": 1200,
    "y": 800,
    "h": 400,
    "w": 1200,
    "type": "datatable",
    "style": "scrolltable",
    "data": {
      "datasource-exception-states": [
        "appsysid",
        "appid",
        "name",
        "total",
        "per",
        "last_time"
      ]
    }
  },
  {
    "x": 0,
    "y": 1200,
    "h": 400,
    "w": 2400,
    "type": "linechart",
    "style": "area",
    "data": {
      "datasource-application-status-tps": [
        "avg_tps",
        "max_tps",
        "min_tps"
      ]
    }
  }
] 
