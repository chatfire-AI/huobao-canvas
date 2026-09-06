export default {
  // ── 鉴权（useModelRunner / useRequestPipeline 共用）──
  auth: {
    apiKeyRequired: '请先创建或选择 API Key',
    apiKeyMissing: '请先填入 API Key',
  },
  // ── 请求管线（composables/useRequestPipeline.js）──
  pipeline: {
    referenceUrlToFileFailed: '参考图 URL 无法转为文件上传（跨域或已过期）：{url}…请改用本地上传',
    invalidResponseFormat: '响应格式异常',
    invalidTaskId: '任务标识无效',
    taskStillProcessing: '任务仍在处理中，请稍后重试',
    cancelled: '已取消',
    taskQueryFailed: '任务查询暂时失败',
    taskResponseFormatError: '任务响应格式暂时异常',
    taskNoMediaResult: '任务已完成，但未返回可用媒体结果',
    taskFailed: '任务处理失败',
    taskProtocolError: '任务查询协议异常',
    serverRunFailed: '服务端运行失败',
    endpointNotMounted: '当前未开放该提交入口：{path}',
    asyncMissingCallback: '异步任务缺少持久化回调',
    asyncMissingTaskId: '异步任务响应缺少任务标识或可用结果',
  },
  // ── 结果提取（composables/useModelRunner.js）──
  runner: {
    protectedResult: '任务已完成，但结果需要供应商鉴权，当前无法直接预览',
  },
  // ── 参考图（utils/referenceImages.js）──
  reference: {
    modeText: '文生视频',
    modeFirst: '首帧',
    modeFirstLast: '首尾帧',
    modeReference: '全能参考',
    limitUnsupported: '当前模型不支持参考图，已忽略',
    limitExceeded: '当前模型最多支持 {limit} 张参考图，已忽略超出的 {dropped} 张',
  },
  // ── 模型目录（api/index.js / api/localCatalog.js）──
  catalog: {
    requestFailed: '目录请求失败({status})',
    modelsRequestFailed: '/v1/models 请求失败({status})',
    otherFactory: '其他',
    typeLabels: {
      1: '对话',
      2: '图片',
      3: '视频',
    },
  },
  // ── 画布服务端（api/canvasServer.js）──
  server: {
    requestFailed: '画布服务请求失败({status})',
  },
}
