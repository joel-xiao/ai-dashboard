// data.js
const jsonData = [
  {
    "x": 0,
    "y": 0,
    "w": 512,
    "h": 400,
    "type": "linechart",
    "style": "curve",
    "data": {
      "datasource-exception-timeseries": {
        "metrics": ["total"],
        "dimensions": []
      }
    }
  },
  {
    "x": 512,
    "y": 0,
    "w": 512,
    "h": 400,
    "type": "linechart",
    "style": "double",
    "data": {
      "datasource-application-status-tps": {
        "metrics": ["avg_tps", "max_tps", "min_tps"],
        "dimensions": []
      }
    }
  },
  {
    "x": 1024,
    "y": 0,
    "w": 512,
    "h": 400,
    "type": "barchart",
    "style": "group",
    "data": {
      "datasource-exception-states--v2": {
        "metrics": ["total"],
        "dimensions": ["appsysid", "appid", "name", "url"]
      }
    }
  },
  {
    "x": 1536,
    "y": 0,
    "w": 512,
    "h": 400,
    "type": "barchart",
    "style": "stack",
    "data": {
      "datasource-application-status": {
        "metrics": ["slow", "frustrated", "err", "fail"],
        "dimensions": []
      }
    }
  },
  {
    "x": 0,
    "y": 400,
    "w": 512,
    "h": 440,
    "type": "piechart",
    "style": "rose",
    "data": {
      "datasource-application-status": {
        "metrics": ["slow_rate", "frustrated_rate", "err_rate", "fail_rate"],
        "dimensions": []
      }
    }
  },
  {
    "x": 512,
    "y": 400,
    "w": 512,
    "h": 440,
    "type": "piechart",
    "style": "ring",
    "data": {
      "datasource-crash-error-states--v2": {
        "metrics": ["total", "user_count"],
        "dimensions": ["appsysid", "appid", "name", "type"]
      }
    }
  },
  {
    "x": 1024,
    "y": 400,
    "w": 1024,
    "h": 440,
    "type": "datatable",
    "style": "alarmtable",
    "data": {
      "datasource-application-exceptions": {
        "metrics": ["time", "appsysid", "appid", "name", "message", "method", "class", "interface", "url", "agentid"],
        "dimensions": []
      }
    }
  },
  {
    "x": 0,
    "y": 840,
    "w": 1024,
    "h": 440,
    "type": "list",
    "style": "top",
    "data": {
      "datasource-crash-error-states--v2": {
        "metrics": ["total", "user_count"],
        "dimensions": ["appsysid", "appid", "name", "type"]
      }
    }
  },
  {
    "x": 1024,
    "y": 840,
    "w": 1024,
    "h": 440,
    "type": "datatable",
    "style": "scrolltable",
    "data": {
      "datasource-crashs": {
        "metrics": ["ts", "appsysid", "appid", "desc", "app_version", "os", "device", "user_id", "session_id", "error", "city", "province", "ip"],
        "dimensions": []
      }
    }
  },
  {
    "x": 0,
    "y": 1280,
    "w": 1024,
    "h": 400,
    "type": "linechart",
    "style": "area",
    "data": {
      "datasource-health-timeseries": {
        "metrics": ["score"],
        "dimensions": []
      }
    }
  },
  {
    "x": 1024,
    "y": 1280,
    "w": 1024,
    "h": 400,
    "type": "barchart",
    "style": "linebar",
    "data": {
      "datasource-application-status": {
        "metrics": ["total", "fast", "slow", "frustrated", "err", "fail"],
        "dimensions": []
      }
    }
  }
]
