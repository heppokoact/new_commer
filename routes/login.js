/*
 * 認証とセッションの作成を行う。
 */

var express = require('express');
var groupBy = require('group-by');
var util = require('./util.js');
var logger = require('../modules/logger').system;

var router = express.Router();

/**
 * 認証を行い、成功すればセッションを作成してユーザー情報を格納する
 */
router.post('/login', (req, res, next) => {
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
        NO = :employeeNo and
        PASSWORD = :password
    `

    client.query(sql, req.body, (err, rows) => {
      pool.release(client);
      if (err) throw err;
      // 送信されてきた社員番号とパスワードに合致する社員情報があれば、
      // 認証成功とし、それをセッションに格納する
      if (rows.length > 0) {
        req.session.employee = rows[0];
      }
      res.json(rows);
    });
  }).catch((err) => {
    logger.error(err);
  });
});

module.exports = router;
