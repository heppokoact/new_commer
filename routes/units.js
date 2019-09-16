/*
 * 単元情報を操作するAPIを提供する
 */

var express = require('express');
var groupBy = require('group-by');
var util = require('./util.js');
var logger = require('../modules/logger').system;

var router = express.Router();

router.get('/units', util.sessionCheck, (req, res, next) => {
  let pool = req.app.get('pool');
  let promise = pool.acquire();
  promise.then((client) => {
    let params = {}
    let sql = `
      select
        ID as id,
        MAJOR_NAME as majorName,
        MINOR_NAME as minorName
      from
        UNIT
    `
    if (req.query.majorName) {
        sql += ` where MAJOR_NAME in (`
        let paramNames = []
	req.query.majorName.forEach(majorName => {
          let paramName = `majorName${paramNames.length + 1}`
          paramNames.push(`:${paramName}`)
          params[paramName] = majorName
        })
        sql += `${paramNames.join()})`
    }

    sql += `
      order by
        MAJOR_NAME_DISPLAY_ORDER asc,
        MINOR_NAME_DISPLAY_ORDER asc
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
