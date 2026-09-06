export default {
  // ── 인증（useModelRunner / useRequestPipeline 공용）──
  auth: {
    apiKeyRequired: '먼저 API Key를 생성하거나 선택해 주세요',
    apiKeyMissing: '먼저 API Key를 입력해 주세요',
  },
  // ── 요청 파이프라인（composables/useRequestPipeline.js）──
  pipeline: {
    referenceUrlToFileFailed: '참조 이미지 URL을 파일로 변환해 업로드할 수 없습니다(크로스 오리진 또는 만료됨): {url}… 로컬 파일로 업로드해 주세요',
    invalidResponseFormat: '응답 형식이 올바르지 않습니다',
    invalidTaskId: '작업 식별자가 유효하지 않습니다',
    taskStillProcessing: '작업이 아직 처리 중입니다. 잠시 후 다시 시도해 주세요',
    cancelled: '취소됨',
    taskQueryFailed: '작업 조회가 일시적으로 실패했습니다',
    taskResponseFormatError: '작업 응답 형식이 일시적으로 올바르지 않습니다',
    taskNoMediaResult: '작업이 완료되었지만 사용 가능한 미디어 결과가 반환되지 않았습니다',
    taskFailed: '작업 처리에 실패했습니다',
    taskProtocolError: '작업 조회 프로토콜 오류',
    serverRunFailed: '서버 실행에 실패했습니다',
    endpointNotMounted: '현재 이 제출 엔드포인트는 사용할 수 없습니다: {path}',
    asyncMissingCallback: '비동기 작업에 영속화 콜백이 없습니다',
    asyncMissingTaskId: '비동기 작업 응답에 작업 식별자 또는 사용 가능한 결과가 없습니다',
  },
  // ── 결과 추출（composables/useModelRunner.js）──
  runner: {
    protectedResult: '작업이 완료되었지만 결과를 보려면 공급업체 인증이 필요하여 직접 미리 볼 수 없습니다',
  },
  // ── 참조 이미지（utils/referenceImages.js）──
  reference: {
    modeText: '텍스트 투 비디오',
    modeFirst: '첫 프레임',
    modeFirstLast: '첫·마지막 프레임',
    modeReference: '다중 참조',
    limitUnsupported: '현재 모델은 참조 이미지를 지원하지 않아 무시했습니다',
    limitExceeded: '현재 모델은 참조 이미지를 최대 {limit}장까지 지원합니다. 초과된 {dropped}장은 무시했습니다',
  },
  // ── 모델 카탈로그（api/index.js / api/localCatalog.js）──
  catalog: {
    requestFailed: '카탈로그 요청 실패({status})',
    modelsRequestFailed: '/v1/models 요청 실패({status})',
    otherFactory: '기타',
    typeLabels: {
      1: '대화',
      2: '이미지',
      3: '비디오',
    },
  },
  // ── 캔버스 서버（api/canvasServer.js）──
  server: {
    requestFailed: '캔버스 서버 요청 실패({status})',
  },
}
