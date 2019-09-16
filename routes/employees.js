/*
 * 社員情報を操作するためのAPIを提供する
 */

var express = require('express');
var groupBy = require('group-by');
var util = require('./util.js');
var logger = require('../modules/logger').system;

var router = express.Router();

/**
 * 条件に合致する全ての社員情報を取得する
 */
router.get('/employees', util.sessionCheck, (req, res, next) => {
  let pool = req.app.get('pool');
  let promise = pool.acquire();
  promise.then((client) => {
    let sql = `
      select
        NO as no,
        NAME as name,
        TYPE as type
      from
        EMPLOYEE
    `
    if (req.query.type) {
      sql += ` where TYPE = :type `
    }

    client.query(sql, req.query, (err, rows) => {
      pool.release(client);
      if (err) throw err;
      res.json(rows);
    });
  }).catch((err) => {
    logger.error(err);
  });
});

/**
 * 指定した社員番号の社員情報を取得する
 */
router.get('/employees/:no', util.sessionCheck, (req, res, next) => {
  let pool = req.app.get('pool');
  let promise = pool.acquire();
  promise.then((client) => {
    let sql = `
      select
        NO as no,
        NAME as name,
        TYPE as type
      from
        EMPLOYEE
      where
        NO = :no
    `
    client.query(sql, req.params, (err, rows) => {
      pool.release(client);
      if (err) throw err;
      util.sendSingleRow(rows, res);
    });
  }).catch((err) => {
    logger.error(err);
  });
});

module.exports = router;
