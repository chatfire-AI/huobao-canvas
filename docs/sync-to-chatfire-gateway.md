# 模型核验修正同步文档（huobao-canvas → chatfire-gateway）

> 2026-08 两轮全量核验的完整修正清单。第一轮：出入参结构审计（能否跑通）；第二轮：参数级核验（枚举/范围/默认值逐项对齐官方）。
> 全部结论基于厂商官方文档联网核实，来源见各条目。
>
> **gateway 侧落点**：模型 schema/端点 → `docs/models/` 各篇 + 数据库目录；管道/适配层 → `frontend/platform/src`（与 huobao-canvas 同构的 8 个适配器 + useRequestPipeline + chatProtocol）。

---

## 一、管道层 / 适配层修复（gateway 前端同构文件，可直接移植）

| # | 文件 | 问题 | 修复 |
|---|---|---|---|
| 1 | `utils/chatProtocol.js` claude 分支 | thinking 开关是布尔，`options.thinking` 永不等于 `'adaptive'/'disabled'`，落入 budget>0 分支 → 开关关闭仍发 `thinking:{enabled}`；且默认 budget 8192 > 默认 max_tokens 4096，**默认值首跑必 400** | 仅 `thinking === true` 时发 `{type:'enabled', budget_tokens}`；budget 钳制到 `min(budget, max(max_tokens-1, 1024))`；schema 默认 budget 4096 |
| 2 | `utils/chatProtocol.js` gemini 分支 | 只读 `max_output_tokens ?? max_tokens`，camelCase 表单键 `maxOutputTokens` 被静默丢弃 | 取值链补 `options.maxOutputTokens` 最优先 |
| 3 | `protocols/adapters/openaiImage.js` | 对任何 `/images/edits` 路径强制 multipart；xAI 官方 edits 只接受 JSON | `useFormData = isEdit && !path.includes('/official/xai/')`（按各自网关路径特征豁免） |
| 4 | `protocols/adapter.js` + `useRequestPipeline.js` | Veo 结果 `video.uri` 被标 protected → 生成成功但永远无法预览（官方明确附 API key 可下载） | 对 gemini 长任务完成后的 video.uri：URI 主机重写为厂商反代前缀、携 `x-goog-api-key` 下载转 blob URL；失败回落原提示 |
| 5 | `useRequestPipeline.js` send() | multipart 编辑收到 data-URI 字符串按文本字段 append，OpenAI edits 必拒 | data-URI → Blob 再 append（文件名按 mime 派生扩展名）；顺带修复裸 Blob 被 `JSON.stringify` 成 `"{}"` 的旧 bug |

---

## 二、模型 ID 修正（必改——调用即失败）

| 厂商 | 旧 ID | 新 ID | 说明 |
|---|---|---|---|
| Gemini | `veo-3.1` | `veo-3.1-generate-preview` | 官方 API 模型 ID；另有 `-fast-` / `-lite-` 变体可收录 |
| xAI | `grok-4-1-fast` | **删除** | 官方目录已无此 ID |
| xAI | `grok-4.20-beta` | `grok-4.20-0309-reasoning` | beta 转正后改名；另有 `-non-reasoning`、`multi-agent-0309` 变体 |
| 火山 | `doubao-seed-2.0-pro` | `doubao-seed-2-0-pro-260215` | 点号是控制台展示名，API ID 为连字符+日期快照 |
| 火山 | `doubao-seed-2.0-mini` | `doubao-seed-2-0-mini-260215` | 同上；官方另有更新快照 `260428` 可评估 |
| 火山 | `doubao-seed-2.0-code` | `doubao-seed-2-0-code-preview-260215` | 注意 `code-preview` |
| 火山 | `doubao-seed-2.0-lite` | **当时删除**（无存在证据） | 后官方公告已列 `doubao-seed-2-0-lite-260428`，可增补 |
| Vidu | viduq3-pro 开了 reference2video | **删除该端点** | 官方四处证据（主体/非主体调用枚举、Model Map、Pricing）均无 pro 的 r2v；国际站矛盾文字系笔误 |

---

## 三、请求体结构修正（图生视频/编辑必败类）

| 厂商·模型 | 旧 | 新（官方结构） |
|---|---|---|
| MiniMax-H3 首帧 | `{type:'image_url', url}` | `{type:'image_url', image_url:{url}, role:'first_frame'}` |
| Vidu img2video（pro/turbo） | 扁平 `image` | `images: [url]`（Array[String]，仅 1 张）；无 aspect_ratio 参数 |
| Vidu start-end2video（pro/turbo） | `image` + `last_image` | `images: [首帧, 尾帧]` |
| xAI 图像编辑源图 | 扁平字符串 + multipart | JSON：单图 `image:{url}` / 多图 `images:[{url}...]`（≤3 张） |
| xAI 视频生成首帧 | 扁平 `image` | `image:{url}`（url 可为公网 URL 或 data URI） |
| xAI 视频编辑源 | 扁平 `video` | `video:{url}` |
| Qwen wan3.0-video | 发 `prompt_extend`（官方未定义） | 移除；官方参数仅 resolution/ratio/duration/audio/seed/watermark |

---

## 四、参数枚举 / 范围 / 默认值修正

### OpenAI
- gpt-image-1.5 / gpt-image-2：`n` 上限 4 → **10**（generations 与 edits 同）
- edits 端点补：`output_format`（png/jpeg/webp）、`input_fidelity`（high/low，默认 high）、`n`
- 补 `reasoning_effort`：gpt-5/5-mini/5-nano `['minimal','low','medium','high']` 默认 minimal；gpt-5.1/5.2/5.2-pro/5.2-codex/5.4/5.4-pro `['none','low','medium','high','xhigh']` 默认 none；gpt-5.6-sol/terra/luna 多 `max` 档（来源 developers.openai.com reasoning 指南；`max` 档仅 5.6+）

### Anthropic
- claude-4.5 系（opus-4-5/sonnet-4-5/haiku-4-5）max_tokens 上限 **64000**（4.6 系与 5 系为 128000）
- 描述修正：sonnet-4-6 实为 **1M 上下文 / 128k 输出**；Fast Mode 仅 Opus 5 / 4.8 提供；sonnet-5 发布优惠已转标准价 $2/$10；fable-5 可用起始 2026-06-09
- thinking 参数矩阵（勿混用）：fable-5/opus-5/opus-4-8/4-7/sonnet-5 禁采样参数、仅 adaptive（发 enabled 会 400）；opus-4-6/sonnet-4-6 enabled 已弃用仍可用；4.5 系支持 enabled；haiku-4-5 拒绝 adaptive

### Gemini
- 3 系图像参考图上限 **14 张**（3.1-flash-image / 3-pro-image / 3.1-flash-lite-image；2.5-flash-image 为 3）
- `gemini-3.1-flash-lite-image` 宽高比仅 **10 种**（1:4/4:1/1:8/8:1 是 3.1-flash-image 专属）；imageSize 必须大写 K
- Veo：补 `resolution`（'720p' 默认 / '1080p' / **'4k' 小写 k**；1080p/4k 需配 8 秒）；`durationSeconds` 官方为**字符串** "4"/"6"/"8"
- 对话 maxOutputTokens 上限 65536 ✓

### xAI
- `grok-imagine-image-2.0` 的 `quality`（low/medium，默认 medium）是**该模型独占参数，勿删勿加他处**（huobao-canvas 曾误删后回滚）
- aspect_ratio 全量 **16 档**（含 `21:9`、`5:2`），按端点不按模型区分
- 对话模型补 `reasoning_effort`：grok-4.6 四档（low/medium/high 默认/xhigh）、grok-4.5 三档（xhigh 等效 high）、推理不可关闭
- 对话 `max_tokens` 已弃用 → `max_completion_tokens`；grok-4.6 无文本输出硬限（500k 上下文），上限可放宽 500000
- 视频：1080p 仅 grok-imagine-video-1.5 的 t2v/i2v（r2v 封顶 720p；编辑输出封顶 720p、时长封顶 8.7s）——已闭环确认

### Qwen（阿里百炼）
- wan3.0-video：参考图上限 **10 张**（另有 reference_video ≤5 段/15s、reference_audio ≤5 段）；resolution `['1080P'默认,'720P','480P']`；ratio 官方默认 **adaptive**；首帧与参考图**互斥**（UI 需约束）
- qwen-image-2.0-pro size 补 `1728*2368`（官方 5 档）；3.0/3.0-pro 官方为自由范围（总像素 512×512~2048×2048、比例 1:8~8:1），推荐同样 5 档
- qwen-image-3.0 / 3.0-pro：I2I 支持 **1~3 张** image 对象（原单张）
- 对话 `max_completion_tokens` 官方宣布将取代 max_tokens（3.5-flash 及之后 / 3.7-max 及之后支持）；qwen3.8-max 专属 `reasoning_effort`（xhigh 默认/medium/low，与 thinking_budget 互斥）

### 火山（Ark）
- Seedream 参考图上限 **14 张**（4.0/4.5/5.0/5.0-pro 全系）
- doubao 对话 max_tokens 官方 `[1, 65536]` 默认 4096（超填 400）
- Seedance **1.0 lite 不支持尾帧**（首尾帧仅 2.0 系/1.5 pro/1.0 pro），lite 的 t2v/i2v 勿暴露 last_frame
- Seedance 2.5 无 4K（最高 1080p，10bit/H.265；4K 仅 2.0 标准版——见下"矛盾项"）
- Seedance 2.5 durationMax **30 秒** ✓；generate_audio 支持矩阵：仅 1.5 pro 与 2.x 系（默认 true，1.5 pro 有声/无声价差一倍，建议暴露开关）
- Seedream 5.0 Pro **有**独立 `aspect_ratio`（auto 默认/1:1/16:9/9:16/4:3/3:4）；5.0 lite 会忽略该参数

### MiniMax
- M3 `/v1/responses`：max tokens 键是 `max_output_tokens`（非 max_completion_tokens，后者会原样透传失效）；temperature 范围 (0,1]（chat completions 才是 [0,2]）；补 `reasoning_effort`（none 默认/minimal/low/medium/high，省略即关推理；M2.x 推理不可关）
- H3 查询终态枚举：queued/running/succeeded/failed/cancelled（**无 expired**）
- H3 content 还支持 `last_frame`（首尾帧）与 `reference_image/video/audio`（多模态参考，互斥），可作增强

### Kimi（Moonshot）
- 全系 `max_tokens` 已弃用 → `max_completion_tokens`；K3 官方默认 **131072**、上限 **1048576**（UI 上限 128000 连默认值都填不进）
- **不要暴露 temperature/top_p**：K3/K2.7-code 固定 1.0、K2.6 思考 1.0/非思考 0.6，传入其他值**报错**；top_p 全系固定 0.95
- 文档域名 platform.moonshot.cn → **platform.kimi.com**（API 域名 api.moonshot.cn 不变）

### 智谱
- max_tokens 官方默认 65536 / 上限 **131072**；temperature [0,1] 限两位小数（4.7 同样 ≤1）
- thinking 形式 `{type:'enabled'/'disabled'}`（glm-4.7 强制思考、5.3 强制开启）；`reasoning_effort` 仅 glm-5.2/5.3 支持（5.3: low/high/max；5.2 多档含 none/minimal）——**勿加到 5.1 及以下**
- 视觉输入字段名是 `image_url:{url}`（不存在 vision_url），≤5M/张、6000×6000、50 张

### DeepSeek
- 官方**默认开启思考模式**；支持 `thinking:{type:'enabled'/'disabled'}` + `reasoning_effort`（low/high/max 默认 high；Anthropic 格式为 reasoning:{effort}）
- 思考模式下 temperature/top_p 传了不生效（不报错）
- 官方规格：上下文 1M / 输出最大 384K（网上流传的 S.chat/M.chat 表官网已不存在）

### 小米 MiMo
- 只定义 `max_completion_tokens`：v2.5-pro 默认/上限 **131072**，v2.5 默认 32768
- temperature [0,1.5] 默认 1.0；思考模式（默认开）下强制 1.0
- 多轮工具调用**必须回传 reasoning_content** 否则 400（适配器注意）

---

## 五、官方文档矛盾 / 待实测项

| 项 | 矛盾内容 | 处置 |
|---|---|---|
| Seedance 2.0 的 4K | REST 枚举（2026-08-21 更新）仅 480p/720p/1080p；快速入门与第三方均显示 2.0 标准版支持 4K（默认 720p） | 保留 4K + 注释；实测 400 则移除 |
| DeepSeek Anthropic 兼容端点 | 官方鉴权表只列 `x-api-key`（Bearer 未声明）；未知字段（reasoning_effort）是否严格校验未明 | 联调确认；必要时端点级鉴权覆盖 |
| wan3.0-video 互斥 | 首帧与参考图互斥，表单模板语言不支持反向条件 | UI description 标注；后续做模式切换 |
| qwen3-coder-plus | 官方公告 2026-09 下线（替代 qwen3.7-plus） | 界面标注 |

---

## 六、gateway `docs/models/` 目录勘误建议

- `xai/grok-4-1-fast.md` → 删除（模型已下线）
- `xai/grok-4.20-beta.md` → 改名 `grok-4.20-0309-reasoning.md` 并更新端点参数
- `vidu/vidu-q3-pro.md` → 移除 reference2video 端点；补 text2video/img2video/start-end 的 resolution 三档与 aspect_ratio 5 项
- 各厂商篇目按上面第四节的枚举/默认值逐篇核对（重点：上限类数字与 reasoning_effort 缺失）

---

*生成于 2026-08-23，基于 huobao-canvas v2.0 分支两轮核验（5 组并行审计 + 5 组参数复核，全部对照官方文档）。*
