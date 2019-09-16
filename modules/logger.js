/*
 * ログ出力用のモジュール
 * 
 * 下記で定義したファイルのほか、/var/log/messageにもログが出る
 */
var log4js = require('log4js');

log4js.configure({
    "appenders": [{
      "category": "access",
      "type": "dateFile",
      "filename": "./log/access.log",
      "pattern": "-yyyy-MM-dd",
      "backups": 3
    },
    {
      "category": "system",
      "type": "dateFile",
      "filename": "./log/system.log",
      "pattern": "-yyyy-MM-dd",
      "backups": 3
    },
    {
      "category": "error",
      "type": "dateFile",
      "filename": "./log/error.log",
      "pattern": "-yyyy-MM-dd",
      "backups": 3
    },
    {
      "type": "console"
    }],
    "levels": {
      "access": "ALL",
      "system": "ALL",
      "error": "ERROR"
    }
});

module.exports = { 
  access: log4js.getLogger('access'),
  system: log4js.getLogger('system'),
  error: log4js.getLogger('error'),
  express: log4js.connectLogger(log4js.getLogger('access'), {level: log4js.levels.INFO}),
  isDebug: function(category) {
    return (log4js.levels.DEBUG.level >= category.level.level);
  }
};
