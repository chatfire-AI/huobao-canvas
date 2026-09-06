export default {
  // ── Auth (shared by useModelRunner / useRequestPipeline) ──
  auth: {
    apiKeyRequired: 'Create or select an API Key first',
    apiKeyMissing: 'Enter an API Key first',
  },
  // ── Request pipeline (composables/useRequestPipeline.js) ──
  pipeline: {
    referenceUrlToFileFailed: 'Reference image URL could not be converted to a file for upload (cross-origin or expired): {url}… Please upload a local file instead',
    invalidResponseFormat: 'Invalid response format',
    invalidTaskId: 'Invalid task identifier',
    taskStillProcessing: 'Task is still processing, please try again later',
    cancelled: 'Cancelled',
    taskQueryFailed: 'Task query temporarily failed',
    taskResponseFormatError: 'Task response format temporarily invalid',
    taskNoMediaResult: 'Task completed, but no usable media result was returned',
    taskFailed: 'Task processing failed',
    taskProtocolError: 'Task query protocol error',
    serverRunFailed: 'Server run failed',
    endpointNotMounted: 'This submit endpoint is not available: {path}',
    asyncMissingCallback: 'Async task is missing its persistence callback',
    asyncMissingTaskId: 'Async task response is missing a task identifier or usable result',
  },
  // ── Result extraction (composables/useModelRunner.js) ──
  runner: {
    protectedResult: 'Task completed, but the result requires vendor authentication and cannot be previewed directly',
  },
  // ── Reference images (utils/referenceImages.js) ──
  reference: {
    modeText: 'Text to Video',
    modeFirst: 'First Frame',
    modeFirstLast: 'First & Last Frames',
    modeReference: 'Omni Reference',
    limitUnsupported: 'This model does not support reference images; input ignored',
    limitExceeded: 'This model supports up to {limit} reference images; {dropped} extra image(s) ignored',
  },
  // ── Model catalog (api/index.js / api/localCatalog.js) ──
  catalog: {
    requestFailed: 'Catalog request failed ({status})',
    modelsRequestFailed: '/v1/models request failed ({status})',
    otherFactory: 'Other',
    typeLabels: {
      1: 'Chat',
      2: 'Image',
      3: 'Video',
    },
  },
  // ── Canvas server (api/canvasServer.js) ──
  server: {
    requestFailed: 'Canvas server request failed ({status})',
  },
}
