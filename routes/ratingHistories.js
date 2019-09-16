var express = require('express');
var groupBy = require('group-by');
var rx = require('rxjs')
var util = require('./util');
var logger = require('../modules/logger').system;

var router = express.Router();

router.get('/ratingHistories/general', util.sessionCheck, (req, res, next) => {
  let pool = req.app.get('pool');
  let promise = pool.acquire();
  promise.then((client) => {
  let sql = `
    select
      r.ID as id,
      r.REQUESTER_NO as requesterNo,
      r.UNIT_ID as unitId,
      r.VERSION as version,
      r.STATUS_ID as statusId,
      s.SHORT_NAME as shortName,
      m.REQUEST_COUNT as requestCount
    from
      RATING_HISTORY r
      inner join (
        select
          r2.REQUESTER_NO,
          r2.UNIT_ID,
          MAX(r2.REQUEST_DT) AS MAX_REQUEST_DT,
          COUNT(*) AS REQUEST_COUNT
        from
          RATING_HISTORY r2
        group by
          r2.REQUESTER_NO,
          r2.UNIT_ID
      ) m
        on (r.REQUESTER_NO = m.REQUESTER_NO
          and r.UNIT_ID = m.UNIT_ID
          and r.REQUEST_DT = m.MAX_REQUEST_DT)
      left outer join STATUS s
        on (r.STATUS_ID = s.ID)
    order by
      r.REQUESTER_NO asc,
      r.UNIT_ID asc
  `

    client.query(sql, (err, rows) => {
      pool.release(client);
      if (err) throw err;
      let result = groupBy(rows, 'requesterNo');
      res.json(result);
    });
  }).catch((err) => {
    logger.error(err);
  });
  
});

router.get('/ratingHistories/yp', util.sessionCheck, (req, res, next) => {
  let pool = req.app.get('pool');
  let promise = pool.acquire();
  promise.then((client) => {
  let sql = `
    select
      u.MAJOR_NAME as majorName,
      r.REQUESTER_NO as requesterNo,
      SUM(r.YP) as yp
    from
      RATING_HISTORY r
      inner join UNIT u
        on (r.UNIT_ID = u.ID)
    group by
      u.MAJOR_NAME,
      r.REQUESTER_NO
    order by
      u.MAJOR_NAME asc,
      r.REQUESTER_NO asc
  `

    client.query(sql, (err, rows) => {
      pool.release(client);
      if (err) throw err;
      let result = rows.reduce((obj, row) => {
        let major = obj[row.majorName] || {};
        major[row.requesterNo] = row.yp;
        obj[row.majorName] = major;
        return obj;
      }, {});
      res.json(result);
    });
  }).catch((err) => {
    logger.error(err);
  });
  
});

router.get('/ratingHistories', util.sessionCheck, (req, res, next) => {
  let pool = req.app.get('pool');
  let promise = pool.acquire();
  promise.then((client) => {
    getRatingHistories(req, req.query, client, (err, rows) => {
      pool.release(client);
      if (err) throw err;
      res.json(rows);
    });
  }).catch((err) => {
    logger.error(err);
  });
});

router.get('/ratingHistories/:requesterNo/:unitId', util.sessionCheck, (req, res, next) => {
  let pool = req.app.get('pool');
  let promise = pool.acquire();
  promise.then((client) => {
    getRatingHistories(req, req.params, client, (err, rows) => {
      pool.release(client);
      if (err) throw err;
      res.json(rows);
    });
  }).catch((err) => {
    logger.error(err);
  });
});

router.get('/ratingHistories/:requesterNo/:unitId/:version', util.sessionCheck, (req, res, next) => {
  let pool = req.app.get('pool');
  let promise = pool.acquire();
  promise.then((client) => {
    getRatingHistories(req, req.params, client, (err, rows) => {
      pool.release(client);
      if (err) throw err;
      util.sendSingleRow(rows, res);
    })
  }).catch((err) => {
    logger.error(err);
  });
});

function getRatingHistories(req, params, client, callback) {
  let wheres = []
  let orders = []
  let sql = `
    select
      r.ID as id,
      r.REQUESTER_NO as requesterNo,
      e1.NAME as requesterName,
      r.UNIT_ID as unitId,
      u.MAJOR_NAME as majorName,
      u.MINOR_NAME as minorName,
      r.VERSION as version,
      r.VERSION as requestCount,
      r.REQUEST_DT requestDt,
      r.COMPLETE_DT as completeDt,
      r.STATUS_ID as statusId,
      s.NAME as statusName,
      s.SHORT_NAME as shortName,
      r.RATER_NO as raterNo,
      e2.NAME as raterName,
      IF(:employeeType = '2', r.MEMO, '') as memo,
      r.YP as yp,
      IF(:employeeType = '2', r.YP_MEMO, '') as ypMemo,
      IF(m.MAX_VERSION IS NULL, '0', '1') as newest
    from
      RATING_HISTORY r
      left outer join STATUS s
        on (r.STATUS_ID = s.ID)
      left outer join UNIT u
        on (r.UNIT_ID = u.ID)
      left outer join EMPLOYEE e1
        on (r.REQUESTER_NO = e1.NO)
      left outer join EMPLOYEE e2
        on (r.RATER_NO = e2.NO)
      left outer join (
        select
          r2.REQUESTER_NO,
          r2.UNIT_ID,
          MAX(r2.VERSION) AS MAX_VERSION
        from
          RATING_HISTORY r2
        group by
          r2.REQUESTER_NO,
          r2.UNIT_ID
      ) m
        on (r.REQUESTER_NO = m.REQUESTER_NO
          and r.UNIT_ID = m.UNIT_ID
          and r.VERSION = m.MAX_VERSION)
  `
  params.employeeType = req.session.employee.type;

  if (params.requesterNo) {
    wheres.push(' r.REQUESTER_NO = :requesterNo')
  }
  if (params.raterNo) {
    wheres.push(' r.RATER_NO = :raterNo')
  }
  if (params.unitId) {
    wheres.push(' r.UNIT_ID = :unitId')
  }
  if (params.version) {
    wheres.push(' r.VERSION = :version')
  }
  if (params.statusId) {
    util.appendMultiCondition(params.statusId, params, wheres, 'r.STATUS_ID', 'statusId')
  }
  if (params.majorName) {
    wheres.push(' u.MAJOR_NAME LIKE :majorName')
  }
  if (params.minorName) {
    wheres.push(' u.MINOR_NAME LIKE :minorName')
  }
  util.appendFromToCondition(params.requestDtFrom, params.requestDtTo, wheres, 'r.REQUEST_DT', 'requestDt');
  util.appendFromToCondition(params.completeDtFrom, params.completeDtTo, wheres, 'r.COMPLETE_DT', 'completeDt');
  if (params.newest == 'true') {
    wheres.push(' m.MAX_VERSION IS NOT NULL ');
  }
  
  if (wheres.length > 0) {
    sql += ' where ' + wheres.join(' and ')
  }

  if (params.order) {
    params.order.split(',').forEach(order => {
      let pair = order.split(':');
      let column = "";
      switch (pair[0]) {
        case 'requestDt':
          column = 'r.REQUEST_DT'
          break;
        case 'completeDt':
          column = 'r.COMPLETE_DT'
          break;
        case 'requesterNo':
          column = 'r.REQUESTER_NO'
          break;
        default:
          throw new Error(`不正な並び替え条件です（${JSON.stringify(params.order)}）`);
      }
      let ascDesc = (pair[1] == 'desc') ? 'desc' : 'asc';
      orders.push(`${column} ${ascDesc}`);
    });
  }
  if (orders.length == 0) {
    orders.push('r.REQUEST_DT asc');
  }
  sql += ' order by ' + orders.join();
  sql += ' limit 1000 ';

  client.query(sql, params, callback);
}

router.put('/ratingHistories/:requesterNo/:unitId/:version', util.sessionCheck, (req, res, next) => {
  let pool = req.app.get('pool');
  let promise = pool.acquire();
  promise.then(client => {
    new rx.Observable(obs => {
      let params = Object.assign(Object.assign({}, req.body), req.params);
      let updates = []
      let sql = `
        insert into RATING_HISTORY (
          REQUESTER_NO,
          UNIT_ID,
          VERSION,
          REQUEST_DT,
          COMPLETE_DT,
          STATUS_ID,
          RATER_NO,
          MEMO,
          YP,
          YP_MEMO
        ) VALUES (
          :requesterNo,
          :unitId,
          :version,
          NOW(),
          null,
          '1',
          null,
          null,
          0,
          null
        )  ON DUPLICATE KEY UPDATE
      `
      if (params.statusId == '3' || params.statusId == '4') {
          updates.push(` COMPLETE_DT = IF(STATUS_ID = :statusId, COMPLETE_DT, NOW())`)
      } else {
          updates.push(` COMPLETE_DT = NULL`)
      }
      if (params.statusId !== undefined) {
          updates.push(` STATUS_ID = :statusId`)
      }
      if (params.raterNo !== undefined) {
          updates.push(` RATER_NO = :raterNo`)
      }
      if (params.memo !== undefined) {
          updates.push(` MEMO = :memo`)
      }
      if (params.yp !== undefined) {
          updates.push(` YP = :yp`)
      }
      if (params.ypMemo !== undefined) {
          updates.push(` YP_MEMO = :ypMemo`)
      }
      // INSERT時のためのダミー
      if (updates.length == 0) {
          updates.push(` REQUESTER_NO = :requesterNo`)
      }

      sql += updates.join()

      logger.debug(sql)
      logger.debug(params)

      client.query(sql, params, (err, rows) => {
        if (err) throw err;
        pool.release(client);
        res.json(rows);
        obs.next();
      });

    }).flatMap(() => {
      getRatingHistories(req, req.params, client, (err, rows) => {
        let io = req.app.get('io');
        let container = {
          rating: rows[0],
        }
        io.sockets.emit('updateRating', container)
      })
      return rx.Observable.empty();
    }).subscribe();

  }).catch(err => {
    logger.error(err);
  });
});

router.delete('/ratingHistories/:requesterNo/:unitId/:version', util.sessionCheck, (req, res, next) => {
  let pool = req.app.get('pool');
  let promise = pool.acquire();
  promise.then((client) => {
    let container = {}
    new rx.Observable(obs => {
      let params = Object.assign(Object.assign({}, req.body), req.params);
      let sql = `
        delete from RATING_HISTORY
        where
          REQUESTER_NO = :requesterNo and
          UNIT_ID = :unitId and
          VERSION = :version
      `
      client.query(sql, req.params, (err, rows) => {
        pool.release(client);
        if (err) throw err;
        container.rating = Object.assign({statusId: '9'}, req.params);
        res.json(rows);
        obs.next();
      });
    }).flatMap(() => {
      let params = {
        requesterNo: req.params.requesterNo,
        unitId: req.params.unitId,
        newest: 'true',
      }
      getRatingHistories(req, params, client, (err, rows) => {
        container.newestRating = rows[0]
        let io = req.app.get('io');
        io.sockets.emit('updateRating', container)
      })
      return rx.Observable.empty();
    }).subscribe();
  }).catch((err) => {
    logger.error(err);
  });
});

function sync(requesterNo, unitId, version, app, client) {
  getRatingHistories(req, {requesterNo, unitId, version}, client, (err, res) => {

  });
}

module.exports = router;
