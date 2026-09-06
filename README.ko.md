# ChatFire Canvas（火宝画布）

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

오픈소스 노드 기반 AI 창작 캔버스. 무한 캔버스에서 12개 공급자의 텍스트·이미지·영상 생성 모델을 연결해 사용합니다. API Key만 있으면 바로 시작할 수 있습니다.

[데모 보기](https://marketing.firemux.com/huobao-canvas/)

![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Docker](https://img.shields.io/badge/Docker-huobao%2Fhuobao--canvas-2496ED?logo=docker)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

> **v2.0 전면 리라이트 진행 중**: 이 브랜치는 리라이트 버전(monorepo + 12개 공급자 공식 API 대응)입니다. v1 기존 코드와 문서는 [`legacy/v1`](../../tree/legacy/v1) 브랜치에 보존되어 있습니다.

## 기능

- 🎨 **무한 캔버스**: Vue Flow 기반. 텍스트 / 이미지 / 영상 / 그룹 4종 노드 + 타입 기반 연결 규칙
- 🔗 **노드 연결**: 상위 노드의 출력을 하위 노드의 입력으로 사용(텍스트 → 이미지 → 영상)
- 🧩 **12개 공급자 공식 형식 내장**: OpenAI, Anthropic, Gemini, Qwen(火山), DeepSeek, MiniMax, Moonshot, 智谱(Zhipu), xAI, Vidu, Xiaomi MiMo. 공식 요청/응답 형식 어댑터 포함
- ⚙️ **설정 페이지**: 공급자별 API Key 설정, 연결 테스트, 모델 활성화/비활성화, 커스텀 모델
- 🖥️ **서버 측 실행 큐**: 모델 호출이 서버에서 실행됩니다. 새로고침이나 브라우저 변경에도 작업이 유지되고, 비동기 영상 작업은 자동 폴링(최대 2시간). 캔버스 데이터는 SQLite에 저장
- 🔑 **BYOK**: API Key는 기본적으로 브라우저 로컬에 저장. 자체 호스팅 시 서버로 자동 미러링(브라우저를 바꿔도 매끄럽게 이어받기)
- 🌍 **4개 언어 UI**: 简体中文 / English / 日本語 / 한국어, 앱 내에서 원클릭 전환
- 🔄 **듀얼 카탈로그 모드**: 공급자 공식 직접 연결(기본값, 단독 사용 가능) 또는 임의의 ChatFire/OpenAI 호환 게이트웨이
- 📦 **다양한 배포**: 올인원 Docker 이미지(amd64 / arm64: Linux / Windows / macOS 공용) · Electron 데스크톱 버전(Windows / macOS)

## 빠른 시작

**Docker(권장)**

```bash
docker run -d -p 8080:16812 -v canvas-data:/app/data huobao/huobao-canvas:latest
# http://localhost:8080 열기
```

이미지는 Docker Hub([huobao/huobao-canvas](https://hub.docker.com/r/huobao/huobao-canvas))에 멀티 아키텍처(`linux/amd64` + `linux/arm64`)로 공개되어 있어 Linux 서버 / Windows / macOS 어디서든 사용할 수 있습니다.

또는 docker compose 사용(Watchtower 일일 자동 업데이트 + `.env` 설정 포함):

```bash
cp .env.example .env       # 필요에 따라 WATCHTOWER_TOKEN 수정
docker compose up -d       # http://localhost:8080
```

**로컬 개발**

```bash
cd apps/web
pnpm install
pnpm dev        # http://localhost:8022
```

페이지를 열고 오른쪽 위 **설정**에서 원하는 공급자에 API Key를 입력하면 바로 창작을 시작할 수 있습니다. Key는 기본적으로 브라우저 localStorage에 저장됩니다(자체 호스팅 시 서버로 자동 미러링).

## 설정

Docker 배포(`docker-compose.yml` / `.env`):

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `UPSTREAM` | `https://api.firemux.com` | 추론 게이트웨이 기본 주소(임의의 OpenAI 호환 게이트웨이. 설정 페이지에서 사용자별 재정의 가능) |
| `API_BASE_URL` | 비어 있음 | 브라우저 측 요청 베이스 URL. 비어 있으면 = 동일 출처(이미지 내장 서버가 직접 처리/프록시) |
| `WATCHTOWER_TOKEN` | `please-change-me` | Watchtower HTTP API 토큰. 프로덕션에서는 반드시 변경하세요 |

로컬 개발(`apps/web`):

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.firemux.com` | 추론 엔드포인트(임의의 OpenAI 호환 게이트웨이) |
| `VITE_UPSTREAM` | `https://api.firemux.com` | dev 서버 프록시 대상 |

## 기여

Issue와 Pull Request를 환영합니다!

1. 이 저장소를 Fork
2. 기능 브랜치 생성(`git checkout -b feature/amazing-feature`)
3. 변경 사항 커밋(`git commit -m 'Add some feature'`)
4. 브랜치에 푸시(`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 연락처

WeChat으로 소통해 주세요:

<img src="./docs/images/wx-group.jpg" width="200" alt="WeChat 그룹 QR 코드" />

## 라이선스

이 프로젝트는 **[CC BY-NC-SA 4.0](./LICENSE)**(저작자표시-비영리-동일조건변경허락 4.0 국제) 라이선스로 배포됩니다.

- 개인 사용, 학습, 비상업 프로젝트 환영
- 동일 라이선스하의 수정 및 재배포 허용(출처 표시 필요)
- **상업적 사용 금지** — 작성자의 사전 서면 허가 없이 상업적 목적으로 사용할 수 없습니다
