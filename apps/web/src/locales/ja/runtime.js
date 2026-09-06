export default {
  // ── 認証（useModelRunner / useRequestPipeline 共通）──
  auth: {
    apiKeyRequired: '先に API Key を作成または選択してください',
    apiKeyMissing: '先に API Key を入力してください',
  },
  // ── リクエストパイプライン（composables/useRequestPipeline.js）──
  pipeline: {
    referenceUrlToFileFailed: '参考画像の URL をファイルに変換してアップロードできません（クロスオリジンまたは期限切れ）：{url}…ローカルファイルからアップロードしてください',
    invalidResponseFormat: 'レスポンス形式が異常です',
    invalidTaskId: 'タスク識別子が無効です',
    taskStillProcessing: 'タスクはまだ処理中です。しばらくしてから再試行してください',
    cancelled: 'キャンセルしました',
    taskQueryFailed: 'タスク照会が一時的に失敗しました',
    taskResponseFormatError: 'タスクレスポンスの形式が一時的に異常です',
    taskNoMediaResult: 'タスクは完了しましたが、利用可能なメディア結果が返されませんでした',
    taskFailed: 'タスクの処理に失敗しました',
    taskProtocolError: 'タスク照会プロトコルエラー',
    serverRunFailed: 'サーバー実行に失敗しました',
    endpointNotMounted: 'この送信エンドポイントは現在利用できません：{path}',
    asyncMissingCallback: '非同期タスクに永続化コールバックがありません',
    asyncMissingTaskId: '非同期タスクのレスポンスにタスク識別子または利用可能な結果がありません',
  },
  // ── 結果抽出（composables/useModelRunner.js）──
  runner: {
    protectedResult: 'タスクは完了しましたが、結果の表示にはプロバイダー認証が必要なため直接プレビューできません',
  },
  // ── 参考画像（utils/referenceImages.js）──
  reference: {
    modeText: 'テキストから動画',
    modeFirst: '先頭フレーム',
    modeFirstLast: '先頭・末尾フレーム',
    modeReference: 'マルチ参照',
    limitUnsupported: 'このモデルは参考画像に対応していないため、無視しました',
    limitExceeded: 'このモデルは最大 {limit} 枚の参考画像に対応しています。超過した {dropped} 枚を無視しました',
  },
  // ── モデルカタログ（api/index.js / api/localCatalog.js）──
  catalog: {
    requestFailed: 'カタログリクエストに失敗しました（{status}）',
    modelsRequestFailed: '/v1/models リクエストに失敗しました（{status}）',
    otherFactory: 'その他',
    typeLabels: {
      1: 'チャット',
      2: '画像',
      3: '動画',
    },
  },
  // ── キャンバスサーバー（api/canvasServer.js）──
  server: {
    requestFailed: 'キャンバスサーバーリクエストに失敗しました（{status}）',
  },
}
