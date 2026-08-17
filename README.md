# ChatFire Canvas

[中文文档](./README.zh-CN.md)

An open-source, node-based AI creation canvas. Chain text, image, and video generation models from 10+ providers on an infinite canvas — bring your own API key.

## Features

- 🎨 **Infinite canvas** powered by Vue Flow — text / image / video / group nodes with typed connection rules
- 🔗 **Node chaining** — use one node's output as the next node's input (e.g. text → image → video)
- 🧩 **12 providers built-in, official API formats** — OpenAI, Anthropic, Gemini, Qwen, Volcengine, DeepSeek, MiniMax, Moonshot, Zhipu, xAI, Vidu, Xiaomi MiMo; official request/response adaptation included
- ⚙️ **Settings page** — per-provider API keys, connectivity tests, model enable/disable, custom models
- 🔑 **BYOK** — your API keys stay in your browser, never touch our servers
- 💾 **Local-first** — projects persist in IndexedDB (Dexie), no account required
- ☁️ **Optional media persistence** — pluggable storage provider for generated assets
- 🔄 **Dual catalog mode** — official-direct (default, standalone) or any ChatFire/OpenAI-compatible gateway

## Quickstart

**Docker (recommended)**

```bash
docker compose up -d        # http://localhost:8080
# with optional media persistence:
docker compose --profile storage up -d
```

**Local development**

```bash
cd apps/web
pnpm install
pnpm dev        # http://localhost:8021
```

Open the app, go to **Settings** (top-right), paste an API key for any provider, and start creating. Keys are stored only in your browser's localStorage.

## Configuration

| Env var | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.chatfire.site` | Inference endpoint (any OpenAI-compatible gateway) |
| `VITE_UPSTREAM` | `https://api.chatfire.site` | Dev-server proxy target |
| `VITE_STORAGE_PROVIDER` | `none` | Media persistence: `none` or `http` |
| `VITE_STORAGE_UPLOAD_URL` | `/storage/upload` | Upload endpoint when provider is `http` |

## License

[MIT](./LICENSE)
