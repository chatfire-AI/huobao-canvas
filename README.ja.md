# ChatFire Canvas（火宝画布）

[English](./README.md) | [简体中文](./README.zh-CN.md) | [한국어](./README.ko.md)

オープンソースのノードベース AI 創作キャンバス。無限キャンバス上で 12 社のプロバイダーのテキスト・画像・動画生成モデルを連携できます。API Key を持ってくるだけで利用可能。

[デモを見る](https://marketing.firemux.com/huobao-canvas/)

![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Docker](https://img.shields.io/badge/Docker-huobao%2Fhuobao--canvas-2496ED?logo=docker)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

> **v2.0 全面リライト進行中**：このブランチはリライト版（monorepo + 12 社プロバイダー公式 API 対応）です。v1 の旧コードとドキュメントは [`legacy/v1`](../../tree/legacy/v1) ブランチに残しています。

## 機能

- 🎨 **無限キャンバス**：Vue Flow ベース。テキスト / 画像 / 動画 / グループの 4 種ノード + 型付き接続ルール
- 🔗 **ノード連携**：上流ノードの出力を下流の入力に利用（テキスト → 画像 → 動画）
- 🧩 **12 社のプロバイダー公式形式を内蔵**：OpenAI、Anthropic、Gemini、Qwen（火山）、DeepSeek、MiniMax、Moonshot、智譜（Zhipu）、xAI、Vidu、Xiaomi MiMo。公式リクエスト / レスポンス形式のアダプター同梱
- ⚙️ **設定ページ**：プロバイダーごとの API Key 設定、接続テスト、モデルの有効化 / 無効化、カスタムモデル
- 🖥️ **サーバーサイド実行キュー**：モデル呼び出しはサーバー側で実行。リロードやブラウザを変えてもタスクは失われず、非同期の動画タスクは自動ポーリング（最大 2 時間）。キャンバスデータは SQLite に保存
- 🔑 **BYOK**：API Key はデフォルトでブラウザのローカルに保存。セルフホスト時はサーバーへ自動ミラー（ブラウザを変えてもシームレスに引き継ぎ）
- 🌍 **4 言語 UI**：简体中文 / English / 日本語 / 한국어。アプリ内でワンクリック切替
- 🔄 **デュアルカタログモード**：プロバイダー公式ダイレクト接続（デフォルト、単体で利用可）または任意の ChatFire / OpenAI 互換ゲートウェイ
- 📦 **多彩なデプロイ**：オールインワン Docker イメージ（amd64 / arm64：Linux / Windows / macOS 共通）· Electron デスクトップ版（Windows / macOS）

## クイックスタート

**Docker（推奨）**

```bash
docker run -d -p 8080:16812 -v canvas-data:/app/data huobao/huobao-canvas:latest
# http://localhost:8080 を開く
```

イメージは Docker Hub（[huobao/huobao-canvas](https://hub.docker.com/r/huobao/huobao-canvas)）にマルチアーキテクチャ（`linux/amd64` + `linux/arm64`）で公開されており、Linux サーバー / Windows / macOS で利用できます。

または docker compose を利用（Watchtower による毎日の自動更新 + `.env` 設定付き）：

```bash
cp .env.example .env       # WATCHTOWER_TOKEN を必要に応じて変更
docker compose up -d       # http://localhost:8080
```

**ローカル開発**

```bash
cd apps/web
pnpm install
pnpm dev        # http://localhost:8022
```

ページを開き、右上の**設定**で任意のプロバイダーに API Key を入力すれば創作開始です。Key はデフォルトでブラウザの localStorage に保存されます（セルフホスト時はサーバーへ自動ミラー）。

## 設定

Docker デプロイ（`docker-compose.yml` / `.env`）：

| 環境変数 | デフォルト値 | 説明 |
|---|---|---|
| `UPSTREAM` | `https://api.firemux.com` | 推論ゲートウェイのデフォルトアドレス（任意の OpenAI 互換ゲートウェイ。設定ページでユーザーごとの上書きも可能） |
| `API_BASE_URL` | 空 | ブラウザ側のリクエストベース URL。空 = 同一オリジン（イメージ内サーバーが直接処理 / プロキシ） |
| `WATCHTOWER_TOKEN` | `please-change-me` | Watchtower HTTP API トークン。本番環境では必ず変更してください |

ローカル開発（`apps/web`）：

| 環境変数 | デフォルト値 | 説明 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.firemux.com` | 推論エンドポイント（任意の OpenAI 互換ゲートウェイ） |
| `VITE_UPSTREAM` | `https://api.firemux.com` | dev サーバーのプロキシターゲット |

## コントリビュート

Issue と Pull Request を歓迎します！

1. このリポジトリを Fork
2. 機能ブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'Add some feature'`）
4. ブランチにプッシュ（`git push origin feature/amazing-feature`）
5. Pull Request を作成

## お問い合わせ

WeChat でご交流ください：

<img src="./docs/images/wx-group.jpg" width="200" alt="WeChat グループ QR コード" />

## ライセンス

本プロジェクトは **[CC BY-NC-SA 4.0](./LICENSE)**（表示-非営利-継承 4.0 国際）ライセンスで公開しています。

- 個人利用・学習・非商用プロジェクトを歓迎
- 同一ライセンスでの改変・再配布を許可（クレジット表記必須）
- **商用利用は禁止**です（作者の事前の書面許可が必要）
