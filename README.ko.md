# 🎨 Huobao Canvas - AI 창작 캔버스

<div align="center">

**오픈소스 노드 기반 AI 창작 캔버스. 무한 캔버스에서 11개 공급자의 텍스트·이미지·영상 생성 모델을 연결**

[![Vue Version](https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat&logo=vue.js)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-huobao%2Fhuobao--canvas-2490ED?style=flat&logo=docker)](https://hub.docker.com/r/huobao/huobao-canvas)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | **한국어**

[기능](#-기능) • [빠른 시작](#-빠른-시작) • [데스크톱 앱](#-데스크톱-앱-권장) • [배포](#-배포)

<h2>🔑 <a href="https://api.firemux.com">Huobao API Key 받기 👉 바로 확인</a></h2>

**텍스트·이미지·영상 전체 AI 기능, 하나의 Key로 개통**

「설정 → Huobao 빠른 설정」에 Key를 붙여넣으면 11개 공급자 설정이 한 번에 완료

<h3>📥 <a href="https://github.com/chatfire-AI/huobao-canvas/releases/latest">데스크톱 앱 다운로드 (macOS / Windows)</a> · <a href="https://marketing.firemux.com/huobao-canvas/">온라인 체험</a></h3>

</div>

---

## 📖 프로젝트 소개

Huobao Canvas는 오픈소스 노드 기반 AI 창작 캔버스입니다. 무한 캔버스에 텍스트 / 이미지 / 영상 노드를 놓고 선으로 연결하면 상류 결과가 하류 입력으로 흘러갑니다 — 텍스트→이미지, 이미지→영상, 참조→영상을 자유롭게 조합하세요.

### 🎯 핵심 가치

- **🎨 캔버스가 곧 워크플로우**: 4종 노드 + 타입 지정 연결 규칙으로 창작 파이프라인을 시각적으로 구축
- **🧩 공식 포맷 내장**: 11개 공급자의 공식 요청/응답 어댑터. Key만 넣으면 바로 사용
- **🔑 BYOK**: Key는 브라우저 로컬에 저장. 셀프 호스팅 시 서버로 자동 미러링되어 브라우저를 바꿔도 끊김 없음
- **📦 3가지 배포 형태**: Docker 단일 이미지 / Electron 데스크톱 / 순수 Web 개발 모드, 동일한 코드베이스

### 🛠️ 기술 아키텍처

```
apps/web/     — Vue 3.5 + Vite 5 + Vue Flow + Naive UI + Pinia + vue-i18n + Tailwind
apps/server/  — 의존성 제로 Node 서버(node:sqlite + 내장 fetch): 캔버스 저장 + 실행 큐
apps/desktop/ — Electron 셸(utilityProcess에 서버 내장, esbuild + electron-builder로 dmg/exe)
docker/       — 올인원 단일 이미지(프런트엔드 빌드 + 서버 번들, amd64/arm64)
```

---

## ✨ 기능

### 🎨 무한 캔버스

- ✅ 텍스트 / 이미지 / 영상 / 그룹 4종 노드, 드래그로 창작 파이프라인 구축
- ✅ 상류 출력을 하류로 자동 주입: 텍스트→이미지→영상→참조 영상
- ✅ 타입 지정 연결 규칙 + 드래그 시 드롭 메뉴로 잘못된 연결 방지
- ✅ 실행 취소 / 다시 실행, 자동 레이아웃, 영역 선택, 줌 — 완전한 편집 경험

### 🧩 11개 공급자 공식 어댑터

OpenAI, Anthropic, Gemini, Qwen, 화산엔진(Volcengine), DeepSeek, MiniMax, Moonshot, 智谱(Zhipu), Vidu, Xiaomi MiMo

| 유형 | 대표 모델 |
|---|---|
| **대화** | GPT, Claude, Gemini, Qwen3, DeepSeek, Kimi, GLM, MiMo |
| **이미지** | GPT Image 1.5/2, Gemini 이미지, 더우바오 Seedream, Wan |
| **영상** | Wan 2.7/3.0(문생/도생/참조생), Seedance, Vidu, MiniMax |

- ✅ 각 사의 공식 인증 방식(Bearer / x-api-key / x-goog-api-key / Token)과 입출력 포맷
- ✅ 듀얼 엔드포인트 모델(GPT Image 문생/이미지 편집 등)은 캔버스에서 생성 모드 전환, 연결된 참조 자동 인식
- ✅ 설정 페이지: 공급자별 Key, 연결 테스트, 모델 활성화/비활성화, 커스텀 모델

### 🖥️ 서버 사이드 실행 큐

- ✅ 모델 호출은 서버에서 실행 — 새로고침이나 브라우저 변경에도 작업 유지
- ✅ 비동기 영상 작업은 서버가 자동 폴폴(2시간 예산), 긴 렌더링도 안심
- ✅ 캔버스 데이터는 SQLite에 저장 — 같은 배포라면 어떤 브라우저에서도 동일한 캔버스

### 🌍 4개국어 UI

简体中文 / English / 日本語 / 한국어 — UI에서 원클릭 전환.

### 🔄 2가지 카탈로그 모드

- **공식 직접 연결(기본)**: 각 사의 공식 포맷으로 직접 통신, 독립 실행 가능
- **게이트웨이 모드**: 임의의 OpenAI 호환 게이트웨이(Huobao 등)에 접속, 하나의 Key로 전체 모델 사용

---

## 🚀 빠른 시작

### 📥 방법 1: 데스크톱 앱(권장)

[Releases에서 다운로드](https://github.com/chatfire-AI/huobao-canvas/releases/latest):

| 플랫폼 | 파일 |
|---|---|
| macOS Apple Silicon | `HuobaoCanvas-<버전>-arm64.dmg` |
| macOS Intel | `HuobaoCanvas-<버전>.dmg` |
| Windows x64 | `HuobaoCanvas Setup <버전>.exe` |

- 더블클릭 설치, 바로 사용 가능: 서버 내장 + SQLite, 데이터는 사용자 디렉터리에 저장, 삭제핟 데이터는 유지
- 미서명 macOS 패키지는 첫 실행 시 우클릭 → 열기, 또는 `xattr -cr /Applications/HuobaoCanvas.app`
- 미서명 Windows 패키지는 SmartScreen에서「추가 정보 → 실행」선택

### 🐳 방법 2: Docker

```bash
docker run -d -p 8080:16812 -v canvas-data:/app/data huobao/huobao-canvas:latest
# http://localhost:8080 접속
```

멀티 아키텍처 이미지(`linux/amd64` + `linux/arm64`)를 [Docker Hub](https://hub.docker.com/r/huobao/huobao-canvas)에서 제공. compose를 사용하면 Watchtower가 매일 자동 업데이트:

```bash
cp .env.example .env       # 필요에 따라 WATCHTOWER_TOKEN 수정
docker compose up -d
```

### 💻 방법 3: 로컬 개발

```bash
git clone https://github.com/chatfire-AI/huobao-canvas.git
cd huobao-canvas/apps/web
pnpm install && pnpm dev   # http://localhost:8022
```

> 로컬 개발에서 캔버스 영속화와 서버 실행 큐가 필요하면 다른 터미널에서 `pnpm -C apps/server dev`(Node ≥ 22.13).

### 🔑 첫 사용: API Key 설정

페이지 우상단「설정」열기:

1. **Huobao 빠른 설정(권장)**: Huobao API Key([api.firemux.com에서 발급](https://api.firemux.com))를 붙여넣으면 11개 공급자의 Key와 게이트웨이 주소가 자동 설정
2. **수동 설정**: 공급자별로 공식 API Key를 입력, 연결 테스트 지원

Key는 기본적으로 브라우저 localStorage에 저장. 셀프 호스팅 시 서버로 자동 미러링(브라우저 변경 시에도 끊김 없음).

---

## 🖥️ 데스크톱 앱(권장)

```bash
cd apps/desktop
pnpm dist        # macOS dmg(arm64 + Intel)
pnpm dist:win    # Windows NSIS 설치 프로그램(macOS에서 크로스 빌드 가능)
```

산출물은 `apps/desktop/release/`. 사용자 데이터: `~/Library/Application Support/HuobaoCanvas/`(SQLite + 생성 결과 파일).

#### 🔄 앱 내 업데이트(Apple 서명 불필요)

데스크톱 앱에는 업데이트 기능 내장(macOS 디렉터리 교체 / Windows 자동 설치, 로컬 sha256 검증). 릴리스 절차:

```bash
# 1. apps/desktop/package.json의 version을 올리고 빌드
pnpm dist && pnpm dist:win

# 2. release/latest.json 생성(전체 산출물 sha256 포함)
pnpm feed

# 3. latest.json + 설치 프로그램 + zip을 GitHub Release에 업로드(v1.0.1 형식의 태그)
```

클이언트는 시작 시 자동으로 업데이트를 확인(`CANVAS_UPDATE_FEED` 환경 변수로 피드 URL 재정의 가능).

---

## 📦 배포

### Docker 환경 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `UPSTREAM` | `https://api.firemux.com` | 추론 게이트웨이 기본 주소(설정 페이지에서 사용자 재정의 가능) |
| `API_BASE_URL` | 비어 있음 | 브라우저 측 요청 기본 URL. 비어 있음 = 동일 출처(권장, CORS 회피) |
| `WATCHTOWER_TOKEN` | `please-change-me` | Watchtower HTTP API 토큰. 프로덕션에서는 반드시 변경 |

데이터 영속화: 이름 있는 볼륨 `canvas-data`를 `/app/data`에 마운트(SQLite + 결과 파일), 이미지 업데이트에도 데이터 유지.

### 로컬 개발 환경 변수(apps/web)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.firemux.com` | 추론 엔드포인트(임의의 OpenAI 호환 게이트웨이) |
| `VITE_UPSTREAM` | `https://api.firemux.com` | dev server 프록시 대상 |

자세한 내용은 [docs/configuration.md](docs/configuration.md)와 [docs/architecture.md](docs/architecture.md) 참조.

---

## 🎨 기술 스택

- **프런트엔드**: Vue 3.5 + Vite 5 + Vue Flow(무한 캔버스) + Naive UI + Pinia + vue-i18n + Tailwind
- **서버**: Node ≥ 22.13, npm 의존성 제로(node:sqlite + 내장 fetch) — 프런트엔드의 공급자 어댑터를 그대로 재사용
- **데스크톱**: Electron(utilityProcess에서 서버 실행, BrowserWindow는 동일 출처로 로드) + esbuild + electron-builder
- **배포**: 단일 멀티 스테이지 Dockerfile — 프런트엔드 빌드 + 서버 번들 일체화

---

## 📋 업데이트 로그

### v1.0.0 (2026-09)

v2 전면 리라이트 후 첫 안정 버전(monorepo + 11개 공급자 공식 어댑터):

- 🎨 새 캔버스: Vue Flow 무한 캔버스 + 4종 노드 + 타입 지정 연결
- 🖥️ 서버 사이드 실행 큐: 새로고침에도 작업 유지, 비동기 영상 자동 폴폴(2시간 예산)
- 🔑 BYOK: 브라우저 로컬 저장, 셀프 호스팅 시 서버 자동 미러링
- 🌍 4개국어 UI + Electron 데스크톱(앱 내 업데이트) + Docker 단일 이미지(Watchtower 자동 업데이트)
- 🔧 wan3.0-video 캔버스 연결 시「first_frame cannot be combined...」오류 수정(first frame / 참조 상호 배타 분리)
- 🔧 GPT Image 등 듀얼 엔드포인트 모델에서 연결 참조가 조용히 삭제되던 문제 수정(생성 모드 전환 추가)

> v1 기존 코드와 문서는 [`legacy/v1`](../../tree/legacy/v1) 브랜치에 보존.

---

## 📄 라이선스

**[CC BY-NC-SA 4.0](LICENSE)**(저작자표시-비영리-동일조걱경우허락 4.0 국제) 라이선스 적용.

- ✅ 개인 사용, 학습 연구, 비상업 프로젝트는 자유롭게 사용 가능
- ✅ 수정과 재배포는 저작자 표시와 동일 라이선스 공유를 조건으로 허용
- ❌ **상업적 사용 금지** — 서면 허가 없이 본 프로젝트 전체 또는 일부를 상업적 목적(유료 서비스, 상업 배포, 재판매 등)으로 사용 금지

전문은 [LICENSE](LICENSE) 참조.

---

## 🤝 기여

Issue와 Pull Request를 환영합니다!

1. 이 리포지토리를 Fork
2. 기능 브랜치 생성(`git checkout -b feature/AmazingFeature`)
3. 변경 사항 커밋(`git commit -m 'Add some AmazingFeature'`)
4. 브랜치 푸시(`git push origin feature/AmazingFeature`)
5. Pull Request 생성

유용한 검사 명령:

```bash
cd apps/web && pnpm test    # 공급자 프리셋 검증 + 4개국어 메시지 컴파일
```

---

## 💬 연락처

QR 코드를 스캔하여 WeChat 그룹 참여:

<div align="center">
  <img src="docs/images/wx-group.jpg" width="200" alt="WeChat 그룹 QR 코드" />
</div>

---

> _"AI와 함께 더 창의적인 일을"_
