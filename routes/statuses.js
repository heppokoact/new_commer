/*
 * ステータス情報を操作するAPIを提供する
 */

var express = require('express');
var groupBy = require('group-by');
var util = require('./util.js');
var logger = require('../modules/logger').system;

var router = express.Router();

/**
 * 全てのステータスを取得する。
 */
router.get('/statuses', util.sessionCheck, (req, res, next) => {
  let pool = req.app.get('pool');
  let promise = pool.acquire();
  promise.then((client) => {
    let params = {}
    let sql = `
      select
        ID as id,
        NAME as name,
        SHORT_NAME as shortName
      from
        STATUS
      order by
        DISPLAY_ORDER asc
    `
    client.query(sql, params, (err, rows) => {
      pool.release(client);
      if (err) throw err;
      res.json(rows);
    });
  }).catch((err) => {
    logger.error(err);
  });
});

module.exports = router;
