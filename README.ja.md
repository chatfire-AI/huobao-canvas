# 🎨 Huobao Canvas - AI クリエイションキャンバス

<div align="center">

**オープンソースのノードベース AI 創作キャンバス。無限キャンバス上で 11 社のプロバイダーのテキスト・画像・動画生成モデルを連携**

[![Vue Version](https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat&logo=vue.js)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-huobao%2Fhuobao--canvas-2490ED?style=flat&logo=docker)](https://hub.docker.com/r/huobao/huobao-canvas)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

[English](README.md) | [简体中文](README.zh-CN.md) | **日本語** | [한국어](README.ko.md)

[機能](#-機能) • [クイックスタート](#-クイックスタート) • [ビジュアルガイド](#-ビジュアルガイド) • [デスクトップ版](#-デスクトップアプリ推奨) • [デプロイ](#-デプロイ)

<h2>🔑 <a href="https://api.firemux.com">Huobao API Key を取得 👉 今すぐ見る</a></h2>

**テキスト・画像・動画の全 AI 機能、1 つの Key で開通**

「設定 → Huobao クイック設定」に Key を貼るだけで 11 社分の設定を一括書き込み

<h3>📥 <a href="https://github.com/chatfire-AI/huobao-canvas/releases/latest">デスクトップ版をダウンロード（macOS / Windows）</a> · <a href="https://marketing.firemux.com/huobao-canvas/">オンラインデモ</a></h3>

</div>

---

## 📖 プロジェクト概要

Huobao Canvas はオープンソースのノードベース AI 創作キャンバスです。無限キャンバスにテキスト / 画像 / 動画ノードを置き、線を引くだけで上流の出力が下流の入力に——テキストから画像、画像から動画、参照から動画まで自由に連携できます。

### 🎯 コアバリュー

- **🎨 キャンバスがワークフロー**：4 種類のノード + 型付き接続ルールで、創作パイプラインを見たまま構築
- **🧩 公式フォーマット内蔵**：11 社の公式リクエスト / レスポンスアダプター。Key を入れるだけで使える
- **🔑 BYOK**：Key はブラウザのローカル保存。セルフホスト時はサーバーへ自動ミラー、ブラウザを変えてもシームレス
- **📦 3 形態のデプロイ**：Docker 単一イメージ / Electron デスクトップ / 純 Web 開発モード、同一コードベース

### 🛠️ 技術アーキテクチャ

```
apps/web/     — Vue 3.5 + Vite 5 + Vue Flow + Naive UI + Pinia + vue-i18n + Tailwind
apps/server/  — 依存ゼロの Node サーバー（node:sqlite + 組み込み fetch）：キャンバス保存 + 実行キュー
apps/desktop/ — Electron シェル（utilityProcess にサーバー内蔵、esbuild + electron-builder で dmg/exe）
docker/       — オールインワン単一イメージ（フロントエンド成果物 + サーバー bundle、amd64/arm64）
```

---

## ✨ 機能

### 🎨 無限キャンバス

- ✅ テキスト / 画像 / 動画 / グループの 4 種ノード、ドラッグで創作パイプラインを構築
- ✅ 上流の出力を下流へ自動注入：テキスト→画像→動画→参照動画
- ✅ 型付き接続ルール + ドラッグ時のドロップメニューで無効な接続を防止
- ✅ 元に戻す / やり直し、自動レイアウト、範囲選択、ズーム——完全な編集体験

### 🧩 11 社の公式アダプター

OpenAI、Anthropic、Gemini、Qwen、火山エンジン、DeepSeek、MiniMax、Moonshot、智譜（Zhipu）、Vidu、Xiaomi MiMo

| タイプ | 代表的なモデル |
|---|---|
| **対話** | GPT、Claude、Gemini、Qwen3、DeepSeek、Kimi、GLM、MiMo |
| **画像** | GPT Image 1.5/2、Gemini 画像、豆包 Seedream、Wan |
| **動画** | Wan 2.7/3.0（文生 / 図生 / 参照生）、Seedance、Vidu、MiniMax |

- ✅ 各社の公式認証方式（Bearer / x-api-key / x-goog-api-key / Token）と入出力フォーマット
- ✅ デュアルエンドポイントモデル（GPT Image の文生 / 画像編集など）はキャンバス内で生成モードを切替、接続された参照を自動認識
- ✅ 設定ページ：プロバイダー別 Key、接続テスト、モデルの有効 / 無効、カスタムモデル

### 🖥️ サーバーサイド実行キュー

- ✅ モデル呼び出しはサーバーで実行——リロードやブラウザ変更でもタスクを失わない
- ✅ 非同期動画タスクはサーバーが自動ポーリング（2 時間の予算）、長時間レンダリングも安心
- ✅ キャンバスデータは SQLite に保存——同一デプロイならどのブラウザでも同じキャンバス

### 🌍 4 言語 UI

简体中文 / English / 日本語 / 한국어 — UI 内でワンクリック切替。

### 🔄 2 つのカタログモード

- **公式ダイレクト（デフォルト）**：各社の公式フォーマットで直接通信、単体で動作
- **ゲートウェイモード**：任意の OpenAI 互換ゲートウェイ（Huobao など）に接続、1 つの Key で全モデル

---

## 🚀 クイックスタート

### 📥 方法 1：デスクトップ版（推奨）

[Releases からダウンロード](https://github.com/chatfire-AI/huobao-canvas/releases/latest)：

| プラットフォーム | ファイル |
|---|---|
| macOS Apple Silicon | `HuobaoCanvas-<バージョン>-arm64.dmg` |
| macOS Intel | `HuobaoCanvas-<バージョン>.dmg` |
| Windows x64 | `HuobaoCanvas Setup <バージョン>.exe` |

- ダブルクリックでインストール、すぐ使える：サーバー内蔵 + SQLite、データはユーザーディレクトリに保存、アンインストールしてもデータは残る
- 未署名の macOS パッケージは初回起動時に右クリック → 開く、または `xattr -cr /Applications/HuobaoCanvas.app`
- 未署名の Windows パッケージは SmartScreen で「詳細情報 → 実行」を選択

### 🐳 方法 2：Docker

```bash
docker run -d -p 8080:16812 -v canvas-data:/app/data huobao/huobao-canvas:latest
# http://localhost:8080 を開く
```

マルチアーキテクチャイメージ（`linux/amd64` + `linux/arm64`）を [Docker Hub](https://hub.docker.com/r/huobao/huobao-canvas) で公開。compose なら Watchtower が毎日自動更新：

```bash
cp .env.example .env       # 必要に応じて WATCHTOWER_TOKEN を変更
docker compose up -d
```

### 💻 方法 3：ローカル開発

```bash
git clone https://github.com/chatfire-AI/huobao-canvas.git
cd huobao-canvas/apps/web
pnpm install && pnpm dev   # http://localhost:8022
```

> ローカル開発でキャンバス永続化とサーバー実行キューが必要な場合は、別ターミナルで `pnpm -C apps/server dev`（Node ≥ 22.13）。

### 🔑 初回利用：API Key の設定

ページ右上の「設定」を開く：

1. **Huobao クイック設定（推奨）**：Huobao API Key（[api.firemux.com で取得](https://api.firemux.com)）を貼るだけで 11 社分の Key とゲートウェイアドレスを一括設定
2. **手動設定**：プロバイダーごとに公式 API Key を入力、接続テスト対応

Key はデフォルトでブラウザの localStorage に保存。セルフホスト時はサーバーへ自動ミラー（ブラウザを変えてもシームレス）。

---

## 📖 ビジュアルガイド

空のキャンバスからテキスト→画像、画像→動画、参照ベースの編集まで、5 ステップで完結。

### ステップ 1 · 創作パイプラインを構築

左からテキスト / 画像 / 動画ノードをドラッグし、ノード端の **+** から線を引いて接続——上流の出力が自動で下流の入力に。テキスト → 画像 → 画像編集 → 動画、1 枚のキャンバスが 1 つの生産ラインです。左上に元に戻す / やり直し / 自動レイアウト、右下のミニマップで大きなグラフを移動できます。

<p align="center">
  <img src="docs/screenshots/01-canvas-pipeline.png" alt="キャンバスのワークフロー全景" width="800">
</p>

### ステップ 2 · 接続参照の自動注入

ノードを選択すると下部に **Prompt Dock** が表示：接続済みの素材が「参照コンテンツ」ストリップに自動で並び（図1、図2…）、`@` で特定の素材をプロンプト内に引用できます。線を引くだけで有効——手動アップロードは不要です。

<p align="center">
  <img src="docs/screenshots/02-prompt-dock.png" alt="Prompt Dock の参照コンテンツ注入" width="800">
</p>

### ステップ 3 · モデルサービスの設定（初回）

設定ページの「Huobao クイック設定」に API Key を貼れば 11 社分を一括設定。または左の「公式ダイレクト」から各社の公式 Key を個別に入力——すべて接続テスト対応。

<p align="center">
  <img src="docs/screenshots/03-settings.png" alt="設定ページと Huobao クイック設定" width="800">
</p>

### ステップ 4 · 画像から動画へ

画像ノードを動画ノードに接続し、Dock にプロンプト（例：「开心的大笑」）を入力して Enter。非同期の動画タスクはサーバーのキューで実行・自動ポーリング——ページを更新したりブラウザを閉じても、タスクは完走します。

<p align="center">
  <img src="docs/screenshots/04-video-node.png" alt="画像→動画ノード" width="800">
</p>

### ステップ 5 · いつでもモデル切替

Dock 下部のモデル名をクリックで切替：プロバイダー別グループ、検索対応。デュアルエンドポイントモデル（GPT Image の文生 / 画像編集など）には「生成モード」切替もあり、参照画像が接続されていると実行時に正しいモードへ自動で切り替わります。

<p align="center">
  <img src="docs/screenshots/05-mode-switch.png" alt="モデル選択" width="800">
</p>

---

## 🖥️ デスクトップアプリ（推奨）

```bash
cd apps/desktop
pnpm dist        # macOS dmg（arm64 + Intel）
pnpm dist:win    # Windows NSIS インストーラー（macOS 上でクロスビルド可能）
```

成果物は `apps/desktop/release/`。ユーザーデータ：`~/Library/Application Support/HuobaoCanvas/`（SQLite + 生成結果ファイル）。

#### 🔄 アプリ内更新（Apple 署名不要）

デスクトップ版には更新機能を内蔵（macOS はディレクトリ置換 / Windows はサイレントインストール、ローカル sha256 検証）。リリース手順：

```bash
# 1. apps/desktop/package.json の version を更新してビルド
pnpm dist && pnpm dist:win

# 2. release/latest.json を生成（全成果物の sha256 入り）
pnpm feed

# 3. latest.json + インストーラー + zip を GitHub Release にアップロード（v1.0.1 のようなタグ）
```

クライアントは起動時に自動で更新を確認（`CANVAS_UPDATE_FEED` 環境変数でフィード URL を上書き可能）。

---

## 📦 デプロイ

### Docker 環境変数

| 変数 | デフォルト | 説明 |
|---|---|---|
| `UPSTREAM` | `https://api.firemux.com` | 推論ゲートウェイのデフォルトアドレス（設定ページでユーザー上書き可能） |
| `API_BASE_URL` | 空 | ブラウザ側リクエストのベース URL。空 = 同一オリジン（推奨、CORS 回避） |
| `WATCHTOWER_TOKEN` | `please-change-me` | Watchtower HTTP API トークン。本番環境では必ず変更 |

データ永続化：名前付きボリューム `canvas-data` を `/app/data` にマウント（SQLite + 結果ファイル）、イメージ更新でもデータは保持。

### ローカル開発の環境変数（apps/web）

| 変数 | デフォルト | 説明 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.firemux.com` | 推論エンドポイント（任意の OpenAI 互換ゲートウェイ） |
| `VITE_UPSTREAM` | `https://api.firemux.com` | dev server のプロキシ先 |

詳細は [docs/configuration.md](docs/configuration.md) と [docs/architecture.md](docs/architecture.md) を参照。

---

## 🎨 技術スタック

- **フロントエンド**：Vue 3.5 + Vite 5 + Vue Flow（無限キャンバス）+ Naive UI + Pinia + vue-i18n + Tailwind
- **サーバー**：Node ≥ 22.13、npm 依存ゼロ（node:sqlite + 組み込み fetch）——フロントエンドのプロバイダーアダプターを直接再利用
- **デスクトップ**：Electron（utilityProcess でサーバー実行、BrowserWindow は同一オリジンで読み込み）+ esbuild + electron-builder
- **デプロイ**：単一のマルチステージ Dockerfile——フロントエンド成果物 + サーバー bundle を一体化

---

## 📋 更新履歴

### v1.0.0 (2026-09)

v2 全面リライト後の最初の安定版（monorepo + 11 社公式アダプター）：

- 🎨 新キャンバス：Vue Flow 無限キャンバス + 4 種ノード + 型付き接続
- 🖥️ サーバーサイド実行キュー：リロードでもタスク消失なし、非同期動画は自動ポーリング（2 時間予算）
- 🔑 BYOK：ブラウザローカル保存、セルフホスト時はサーバーへ自動ミラー
- 🌍 4 言語 UI + Electron デスクトップ（アプリ内更新）+ Docker 単一イメージ（Watchtower 自動更新）
- 🔧 wan3.0-video のキャンバス接続時「first_frame cannot be combined...」エラーを修正（first frame / 参照の相互排他を分流）
- 🔧 GPT Image などデュアルエンドポイントモデルで接続参照が静かに捨てられる問題を修正（生成モード切替を追加）

> v1 の旧コードとドキュメントは [`legacy/v1`](../../tree/legacy/v1) ブランチに残しています。

---

## 📄 ライセンス

**[CC BY-NC-SA 4.0](LICENSE)**（表示-非営利-継承 4.0 国際）ライセンスを採用。

- ✅ 個人利用、学習研究、非営利プロジェクトは自由に利用可能
- ✅ 改変と再配布は、クレジット表示と同一ライセンスでの共有を条件に許可
- ❌ **商用利用禁止**——書面による許可なく、本プロジェクトの全部または一部を商用目的（有料サービス、商用デプロイ、再販など）に使用することは禁止

全文は [LICENSE](LICENSE) を参照。

---

## 🤝 コントリビューション

Issue と Pull Request を歓迎します！

1. このリポジトリを Fork
2. 機能ブランチを作成（`git checkout -b feature/AmazingFeature`）
3. 変更をコミット（`git commit -m 'Add some AmazingFeature'`）
4. ブランチをプッシュ（`git push origin feature/AmazingFeature`）
5. Pull Request を作成

便利なチェックコマンド：

```bash
cd apps/web && pnpm test    # プロバイダープリセット検証 + 4 言語メッセージコンパイル
```

---

## ☕ 支援する

このプロジェクトが役に立ったら、作者にコーヒー 1 杯を ☕ あなたの支援が継続的な更新の原動力です！

<div align="center">
  <img src="donate.png" alt="Alipay 寄付 QR コード" width="240" />
</div>

---

## 💬 連絡先

QR コードをスキャンして WeChat グループに参加：

<div align="center">
  <img src="docs/images/wx-group.jpg" width="200" alt="WeChat グループ QR コード" />
</div>

---

> _"AI と一緒に、もっと創造的なことを"_
