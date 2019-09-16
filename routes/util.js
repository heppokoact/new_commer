/*
 * 雑多な便利機能たち
 */

/**
 * sendSingleRow()のデフォルトのコールバック。
 * 検索結果の1行目をレスポンスにJSONとして書き込む。
 */
function defaultSendSingleRowCallback(rows, res) {
  res.json(rows[0]);
}

/** デフォルトの日付形式 */
const DATE_FORMAT = '%Y-%m-%dT%H:%i:%S'

module.exports = {

  /**
   * 検索結果を受け取り、それが単一行であるかどうかをチェックする。
   * 単一行でなかった場合はレスポンスにエラーのステータスを書き込む。
   * 単一行であればそれをレスポンスにJSON形式で書き込む。
   * callbackを指定すればチェック後の挙動をカスタマイズできる。
   *
   * @param rows 検索結果
   * @param res レスポンス
   * @param callback チェック後の挙動をカスタマイズするコールバック。任意。
   */
  sendSingleRow(rows, res, callback) {
    if (rows.length <= 0) {
      res.status(404);
      res.end("Rows length is 0.");
    } else if (rows.length >= 2) {
      res.status(503);
      res.end(`Rows length is ${rows.length}.`);
    } else {
      (callback || defaultSendSingleRowCallback)(rows, res);
    }
  },

  /**
   * ORを使い、同一列に対する複数の条件を追加する。
   *
   * @param conditions 複数の条件値
   * @param params 条件値を追加するオブジェクト
   * @param wheres 条件を追加するwhere句の配列
   * @param columnName 条件を追加するカラム名
   * @param baseName 条件値をバインドするのに使用する名前
   */
  appendMultiCondition(conditions, params, wheres, columnName, baseName) {
    let sqls = []
    for (var i = 0; i < conditions.length; i++) {
      let paramName = `${baseName}${i}`
      params[paramName] = conditions[i]
      sqls.push(`${columnName} = :${paramName}`)
    }
    wheres.push(` (${sqls.join(' OR ')}) `)
  },

  /**
   * FROM～TO条件を追加する。
   * FROMのみが指定されている場合はFROM以降、
   * TOのみが指定されている場合はTO以前と解釈する。
   *
   * @param from FROM条件値
   * @param to TO条件値
   * @param wheres 条件を追加するwhere句の配列
   * @param columnName 条件を追加するカラム名
   * @param baseName 条件値をバインドするのに使用する名前
   */
  appendFromToCondition(from, to, wheres, columnName, baseName) {
    if (from && to) {
      wheres.push(` ${columnName} >= str_to_date(:${baseName}From, '${DATE_FORMAT}') `)
      wheres.push(` ${columnName} <= str_to_date(:${baseName}To, '${DATE_FORMAT}') `)
    } else if (from) {
      wheres.push(` ${columnName} >= str_to_date(:${baseName}From, '${DATE_FORMAT}') `)
    } else if (to) {
      wheres.push(` ${columnName} <= str_to_date(:${baseName}To, '${DATE_FORMAT}') `)
    }
  },

  /**
   * 認証済みであるかどうかをチェックする。
   * セッションに社員情報が格納されていれば認証済みとする。
   */
  sessionCheck(req, res, next) {
    if (req.session.employee) {
      next();
    } else {
      res.status(401);
      res.send("401 Unauthorized")
    }
  }

}
