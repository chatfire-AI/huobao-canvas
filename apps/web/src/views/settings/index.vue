<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  listProviders, getProvider, buildProviderAuthHeaders, providerTestUrl,
  effectiveProviderBaseUrl,
} from '@/config/providers/index.js'
import {
  getProviderKeys, setProviderApiKey, setProviderBaseUrl,
  addApiKey, setCurrentApiKey, getCurrentApiKey,
} from '@/utils/apiKeySession.js'
import {
  getCatalogMode, setCatalogMode,
  setGatewayBaseUrl, PUBLIC_API_BASE_URL,
} from '@/config'
import {
  readCatalogOverrides, setModelDisabled, setProviderHidden,
  upsertCustomModel, removeCustomModel, MODEL_TYPE_MAP,
} from '@/api/localCatalog'
import { protocolRegistry } from '@/views/playground/protocols/registry.js'
import { appFetch } from '@/utils/desktopBridge.js'
import { isServerRunMode, testProviderOnServer } from '@/api/canvasServer.js'
import { resolveModelIcon } from '@/utils/tools'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()
// 厂商图标主题变体跟随明暗切换
const iconTheme = computed(() => (isDark.value ? 'dark' : 'light'))

const router = useRouter()

// ── 导航：chatfire / 厂商 id ──
const activeSection = ref('chatfire')
const providers = listProviders()

// ── 桌面版：应用更新（Electron preload 注入 window.canvasDesktop） ──
const desktopBridge = typeof window !== 'undefined' ? window.canvasDesktop || null : null
const updateState = ref({ status: 'idle', currentVersion: '' })
const updateProgress = ref(0)
let unsubscribeUpdateProgress = null

async function refreshUpdateState() {
  if (!desktopBridge) return
  updateState.value = await desktopBridge.getUpdateState()
  if (typeof updateState.value.downloadProgress === 'number') {
    updateProgress.value = updateState.value.downloadProgress
  }
}

async function checkForUpdate() {
  if (!desktopBridge) return
  updateState.value = await desktopBridge.checkUpdate()
}

async function startDownload() {
  if (!desktopBridge) return
  try {
    updateState.value = await desktopBridge.downloadUpdate()
  } catch (error) {
    updateState.value = { ...updateState.value, status: 'error', error: error?.message || '下载失败' }
  }
}

async function applyUpdate() {
  if (!desktopBridge) return
  await desktopBridge.applyUpdate()
}

onMounted(() => {
  if (!desktopBridge) return
  refreshUpdateState()
  unsubscribeUpdateProgress = desktopBridge.onUpdateProgress((percent) => {
    updateProgress.value = percent
  })
})

onBeforeUnmount(() => {
  unsubscribeUpdateProgress?.()
})
const activeProvider = computed(() => getProvider(activeSection.value))

// ── 通用设置 ──
// 目录模式固定在官方直连（UI 开关已移除）；catalogMode 仅用于一键接入状态点与断开逻辑
const catalogMode = ref(getCatalogMode())

// ── Huobao（火宝）一键配置 ──
const cfQuickKey = ref('')
const cfQuickTesting = ref(false)
const cfCurrentKey = ref(getCurrentApiKey())

// 一键接入时各厂商 baseUrl 覆盖的网关挂载前缀（'' = 网关根路径 /v1、/v1beta 等）。
// 以 Huobao 网关适配为主：预设路径经 applyProviderBaseUrl 前缀替换后恰好落在网关挂载点上。
const GATEWAY_PROVIDER_PREFIX = {
  openai: '', anthropic: '', gemini: '', deepseek: '', moonshot: '', xiaomi: '',
  xai: '', minimax: '', volcengine: '/volcengine', qwen: '/qwen', vidu: '/vidu',
  zhipu: '/zhipu',
}

const chatfireQuickSetup = async () => {
  const key = cfQuickKey.value.trim()
  if (!key) {
    window.$message?.warning('请粘贴 Huobao API Key')
    return
  }
  cfQuickTesting.value = true
  try {
    // 相对路径走同源：浏览器经 vite proxy / nginx，Electron 内经内嵌 server 的 proxy 路由
    const resp = await appFetch('/v1/models', { headers: { Authorization: `Bearer ${key}` } })
    if (!resp.ok) {
      window.$message?.warning(`Key 校验返回 ${resp.status}，已保存，请确认 Key 有效`)
    }
    setGatewayBaseUrl(PUBLIC_API_BASE_URL)
    addApiKey(key, 'Huobao')
    setCurrentApiKey(key)
    cfCurrentKey.value = key
    // 厂商一键接入：baseUrl 指向网关挂载前缀 + Huobao Key 直接赋值，
    // 厂商卡片即刻可用（官方直连语义不变，清空覆盖即恢复厂商官方域名）
    for (const [providerId, prefix] of Object.entries(GATEWAY_PROVIDER_PREFIX)) {
      setProviderApiKey(providerId, key)
      setProviderBaseUrl(providerId, `${PUBLIC_API_BASE_URL}${prefix}`)
    }
    providerKeys.value = getProviderKeys()
    // 同步刷新厂商卡片的 baseUrl 输入框（baseInputs 是本地态，不随 localStorage 自动更新）
    baseInputs.value = Object.fromEntries(providers.map((p) => [p.id, effectiveProviderBaseUrl(p)]))
    cfQuickKey.value = ''
    window.$message?.success('已接入 Huobao：12 家厂商已自动配置好 Key 与网关地址，返回画布即可使用')
  } catch (error) {
    console.error('[chatfireQuickSetup]', error)
    const detail = [error?.message, error?.stack?.split('\n')[1]?.trim()].filter(Boolean).join(' @ ')
    window.$message?.error(`连接失败：${detail || error}（请检查网络后重试）`, { duration: 8000 })
  } finally {
    cfQuickTesting.value = false
  }
}

const chatfireDisconnect = () => {
  setCurrentApiKey('')
  cfCurrentKey.value = ''
  // 清除一键接入写入的厂商 Key 与 baseUrl 覆盖（setProviderApiKey 空串会删除整条厂商配置）
  for (const providerId of Object.keys(GATEWAY_PROVIDER_PREFIX)) {
    setProviderApiKey(providerId, '')
  }
  providerKeys.value = getProviderKeys()
  baseInputs.value = Object.fromEntries(providers.map((p) => [p.id, effectiveProviderBaseUrl(p)]))
  setCatalogMode('official')
  catalogMode.value = 'official'
}

// ── 厂商（Key + baseUrl + 连通测试 + 启停） ──
const providerKeys = ref(getProviderKeys())
const overrides = ref(readCatalogOverrides())
const keyInputs = ref({})
const baseInputs = ref(Object.fromEntries(providers.map((p) => [p.id, effectiveProviderBaseUrl(p)])))
const testing = ref({})
const testResults = ref({})

const isProviderHidden = (id) => (overrides.value.hiddenProviders || []).includes(id)

const handleProviderHidden = (id, hidden) => {
  setProviderHidden(id, hidden)
  overrides.value = readCatalogOverrides()
}

const saveProviderKey = (id) => {
  const key = (keyInputs.value[id] || '').trim()
  if (!key) {
    window.$message?.warning('请输入 API Key')
    return
  }
  providerKeys.value = setProviderApiKey(id, key)
  keyInputs.value[id] = ''
  window.$message?.success('API Key 已保存')
}

const clearProviderKey = (id) => {
  providerKeys.value = setProviderApiKey(id, '')
  testResults.value[id] = null
}

const saveProviderBase = (provider) => {
  const value = (baseInputs.value[provider.id] || '').trim().replace(/\/$/, '')
  providerKeys.value = setProviderBaseUrl(provider.id, value === provider.baseUrl ? '' : value)
  baseInputs.value[provider.id] = effectiveProviderBaseUrl(provider)
  window.$message?.success('baseUrl 已保存')
}

const resetProviderBase = (provider) => {
  providerKeys.value = setProviderBaseUrl(provider.id, '')
  baseInputs.value[provider.id] = provider.baseUrl
}

const maskKey = (key) => {
  const v = String(key || '')
  return v.length <= 12 ? `${v.slice(0, 4)}****` : `${v.slice(0, 6)}…${v.slice(-4)}`
}

const testProvider = async (provider) => {
  const key = providerKeys.value[provider.id]?.key || ''
  if (!key) {
    window.$message?.warning('请先保存该厂商的 API Key')
    return
  }
  const override = (baseInputs.value[provider.id] || '').trim().replace(/\/$/, '')
  const useOverride = override && override !== provider.baseUrl
  const url = providerTestUrl(provider, useOverride ? override : '')
  if (!url) {
    window.$message?.info('该厂商暂无连通测试端点，保存即可')
    return
  }
  testing.value[provider.id] = true
  try {
    // 服务端执行模式：由 apps/server 代发（用服务端存的 Key）；否则本地经同源反代
    if (await isServerRunMode()) {
      const result = await testProviderOnServer(provider.id)
      testResults.value[provider.id] = result.ok ? 'ok' : (result.status ? `HTTP ${result.status}` : 'fail')
      if (result.ok) window.$message?.success(`${provider.label} 连通正常`)
      else window.$message?.warning(`${provider.label} ${result.message || '连通失败'}，请检查 Key`)
      return
    }
    const resp = await appFetch(url, { headers: buildProviderAuthHeaders(provider, key) })
    testResults.value[provider.id] = resp.ok ? 'ok' : `HTTP ${resp.status}`
    if (resp.ok) window.$message?.success(`${provider.label} 连通正常`)
    else window.$message?.warning(`${provider.label} 返回 ${resp.status}，请检查 Key`)
  } catch (error) {
    testResults.value[provider.id] = 'fail'
    window.$message?.error(`连通测试失败：${error?.message || error}`)
  } finally {
    testing.value[provider.id] = false
  }
}

// ── 模型管理（按厂商归属，预设可编辑为同名覆盖，自定义可删除） ──
const isModelDisabled = (name) => (overrides.value.disabledModels || []).includes(name)

const handleModelDisabled = (name, disabled) => {
  setModelDisabled(name, disabled)
  overrides.value = readCatalogOverrides()
}

const modelsOfProvider = (providerId) => {
  const disabledSet = new Set(overrides.value.disabledModels || [])
  const customs = overrides.value.customModels || []
  const customByName = new Map(customs.map((m) => [m.name, m]))
  const rows = []
  const provider = getProvider(providerId)
  for (const m of provider?.models || []) {
    const overrideModel = customByName.get(m.name)
    rows.push({
      model: overrideModel || m,
      disabled: disabledSet.has(m.name),
      custom: !!overrideModel,
      overridden: !!overrideModel,
    })
    customByName.delete(m.name)
  }
  for (const m of customByName.values()) {
    if ((m.providerId || m.factory) === providerId) {
      rows.push({ model: m, disabled: disabledSet.has(m.name), custom: true, overridden: false })
    }
  }
  return rows
}

// 模型编辑弹窗
const showModelEditor = ref(false)
const editingModel = ref(null)
const modelForm = ref(emptyModelForm('openai'))

function emptyModelForm(providerId) {
  return {
    name: '', providerId, type: '1',
    path: '', protocolKey: 'openai-chat', responseMode: 'SYNC', capability: 'CHAT',
    schemaJson: '',
  }
}

const openAddModel = (providerId) => {
  editingModel.value = null
  modelForm.value = emptyModelForm(providerId)
  showModelEditor.value = true
}

const openEditModel = (row, providerId) => {
  const m = row.model
  editingModel.value = m.name
  const endpoint = (Array.isArray(m.endpoints) ? m.endpoints[0] : null) || {}
  modelForm.value = {
    name: m.name,
    providerId: m.providerId || m.factory || providerId,
    type: String(m.type || '1').split(',')[0],
    path: endpoint.path || '',
    protocolKey: endpoint.protocolKey || 'openai-chat',
    responseMode: endpoint.responseMode || 'SYNC',
    capability: endpoint.capability || 'CHAT',
    schemaJson: m.modelSchema
      ? JSON.stringify(typeof m.modelSchema === 'string' ? JSON.parse(m.modelSchema) : m.modelSchema, null, 2)
      : '',
  }
  showModelEditor.value = true
}

const saveModel = () => {
  const f = modelForm.value
  if (!f.name.trim()) {
    window.$message?.warning('请填写模型名称')
    return
  }
  if (!f.path.trim()) {
    window.$message?.warning('请填写端点路径')
    return
  }
  let parsedSchema = null
  if (f.schemaJson.trim()) {
    try {
      parsedSchema = JSON.parse(f.schemaJson)
    } catch (error) {
      window.$message?.error(`Schema JSON 解析失败：${error.message}`)
      return
    }
  }
  upsertCustomModel({
    name: f.name.trim(),
    fullName: f.name.trim(),
    factory: f.providerId,
    providerId: f.providerId,
    providerCode: f.providerId,
    type: f.type,
    typeName: MODEL_TYPE_MAP[f.type] || '对话',
    enable: true,
    launchTime: new Date().toISOString().slice(0, 10),
    endpoints: [{
      path: f.path.trim(),
      capability: f.capability,
      responseMode: f.responseMode,
      protocolKey: f.protocolKey,
      contentType: 'JSON',
      method: 'POST',
    }],
    modelSchema: parsedSchema ? JSON.stringify(parsedSchema) : undefined,
  })
  overrides.value = readCatalogOverrides()
  showModelEditor.value = false
  window.$message?.success('模型已保存')
}

const deleteModel = (name) => {
  window.$dialog?.warning({
    title: '删除模型配置',
    content: `确认删除 ${name} 的自定义配置？（预设模型删除后恢复为内置定义）`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      removeCustomModel(name)
      overrides.value = readCatalogOverrides()
    },
  })
}

const typeTagType = (type) => ({ '1': 'info', '2': 'success', '3': 'warning' }[String(type).split(',')[0]] || 'default')
</script>

<template>
  <div class="settings-page">
    <!-- 左侧导航 -->
    <aside class="settings-nav">
      <button type="button" class="back-btn" @click="router.push('/canvas')">
        <SvgIcon icon="tabler:arrow-left" />
        <span>返回画布</span>
      </button>

      <div class="nav-group">
        <div class="nav-group-title">聚合网关</div>
        <button
          type="button"
          class="nav-item nav-chatfire"
          :class="{ active: activeSection === 'chatfire' }"
          @click="activeSection = 'chatfire'"
        >
          <img src="/icons/huobao.png" class="nav-icon-img" alt="火宝 Huobao" />
          <span class="nav-label">火宝 Huobao</span>
          <span v-if="cfCurrentKey && catalogMode === 'gateway'" class="status-dot on" title="已接入"></span>
        </button>
      </div>

      <div class="nav-group nav-providers">
        <div class="nav-group-title">厂商官方直连</div>
        <button
          v-for="p in providers" :key="p.id"
          type="button"
          class="nav-item"
          :class="{ active: activeSection === p.id, muted: isProviderHidden(p.id) }"
          @click="activeSection = p.id"
        >
          <img v-if="p.icon" :src="resolveModelIcon(p.icon, iconTheme)" class="nav-icon-img" :alt="p.label" />
          <span v-else class="nav-icon">{{ p.label.slice(0, 1) }}</span>
          <span class="nav-label">{{ p.label }}</span>
          <span v-if="providerKeys[p.id]?.key" class="status-dot on" title="已配置 Key"></span>
        </button>
      </div>

      <!-- 桌面版（Electron preload 注入 canvasDesktop 时可见） -->
      <div v-if="desktopBridge" class="nav-group">
        <div class="nav-group-title">桌面版</div>
        <button
          type="button"
          class="nav-item"
          :class="{ active: activeSection === 'desktop' }"
          @click="activeSection = 'desktop'"
        >
          <span class="nav-icon"><SvgIcon icon="tabler:device-desktop" /></span>
          <span class="nav-label">应用更新</span>
          <span v-if="updateState.status === 'available'" class="status-dot on" title="发现新版本"></span>
        </button>
      </div>
    </aside>

    <!-- 右侧详情 -->
    <main class="settings-main">
      <!-- 火宝 Huobao -->
      <section v-if="activeSection === 'chatfire'" class="pane">
        <div class="pane-head">
          <img src="/icons/huobao.png" class="pane-icon" alt="火宝 Huobao" />
          <h1>火宝 Huobao</h1>
          <n-tag v-if="cfCurrentKey" type="success">已接入</n-tag>
        </div>
        <p class="pane-desc">
          一个 Key 使用全部 10+ 厂商的聚合模型，按量计费，无需逐厂商注册。
          粘贴 Key 一键接入，自动为 11 家厂商配置好网关地址与 Key。
          <a href="https://firemux.com" target="_blank" rel="noopener">前往 firemux.com 注册获取 Key →</a>
        </p>

        <div class="card">
          <div class="field-row">
            <span class="field-label">网关地址</span>
            <span class="saved-mask">{{ PUBLIC_API_BASE_URL }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">API Key</span>
            <template v-if="cfCurrentKey">
              <span class="saved-mask">{{ maskKey(cfCurrentKey) }}</span>
              <n-button text type="error" size="small" @click="chatfireDisconnect">断开接入</n-button>
            </template>
            <template v-else>
              <n-input
                v-model:value="cfQuickKey"
                type="password"
                show-password-on="click"
                placeholder="sk-..."
                @keyup.enter="chatfireQuickSetup"
              />
              <n-button type="primary" :loading="cfQuickTesting" @click="chatfireQuickSetup">一键接入</n-button>
            </template>
          </div>
        </div>
      </section>

      <!-- 厂商详情 -->
      <section v-else-if="activeProvider" class="pane">
        <div class="pane-head">
          <img v-if="activeProvider.icon" :src="resolveModelIcon(activeProvider.icon, iconTheme)" class="pane-icon" :alt="activeProvider.label" />
          <h1>{{ activeProvider.label }}</h1>
          <a :href="activeProvider.docsUrl" target="_blank" rel="noopener" class="docs-link">官方文档 →</a>
          <div class="pane-head-right">
            <span class="switch-label">启用</span>
            <n-switch
              :value="!isProviderHidden(activeProvider.id)"
              @update:value="(v) => handleProviderHidden(activeProvider.id, !v)"
            />
          </div>
        </div>
        <p class="pane-desc">
          官方地址 <code>{{ activeProvider.baseUrl }}</code>（默认经内置反代访问）。
          baseUrl 可改为自己的中转地址：绝对地址浏览器直连（CORS 自负），相对路径走同源。
        </p>

        <!-- 连接配置 -->
        <div class="card">
          <div class="card-title">连接</div>
          <div class="field-row">
            <span class="field-label">baseUrl</span>
            <n-input v-model:value="baseInputs[activeProvider.id]" :placeholder="activeProvider.baseUrl" />
            <n-button @click="saveProviderBase(activeProvider)">保存</n-button>
            <n-button
              v-if="baseInputs[activeProvider.id] && baseInputs[activeProvider.id] !== activeProvider.baseUrl"
              text type="warning"
              @click="resetProviderBase(activeProvider)"
            >重置</n-button>
          </div>
          <div class="field-row">
            <span class="field-label">API Key</span>
            <template v-if="providerKeys[activeProvider.id]?.key">
              <span class="saved-mask">{{ maskKey(providerKeys[activeProvider.id].key) }}</span>
              <n-button size="small" :loading="testing[activeProvider.id]" @click="testProvider(activeProvider)">测试连通</n-button>
              <span v-if="testResults[activeProvider.id] === 'ok'" class="test-ok">✓ 正常</span>
              <span v-else-if="testResults[activeProvider.id]" class="test-fail">{{ testResults[activeProvider.id] }}</span>
              <n-button text type="error" size="small" @click="clearProviderKey(activeProvider.id)">清除</n-button>
            </template>
            <template v-else>
              <n-input
                v-model:value="keyInputs[activeProvider.id]"
                type="password"
                show-password-on="click"
                placeholder="粘贴 API Key"
                @keyup.enter="saveProviderKey(activeProvider.id)"
              />
              <n-button type="primary" @click="saveProviderKey(activeProvider.id)">保存</n-button>
            </template>
          </div>
          <p class="card-hint">Key 仅保存在当前浏览器 localStorage，不会上传到任何服务器。</p>
        </div>

        <!-- 模型管理 -->
        <div class="card">
          <div class="card-head">
            <div class="card-title">模型（{{ modelsOfProvider(activeProvider.id).length }}）</div>
            <n-button size="small" @click="openAddModel(activeProvider.id)">+ 添加模型</n-button>
          </div>
          <div
            v-for="row in modelsOfProvider(activeProvider.id)" :key="row.model.name"
            class="model-row" :class="{ disabled: row.disabled }"
          >
            <div class="model-info">
              <span class="model-name">{{ row.model.fullName || row.model.name }}</span>
              <span class="model-id">{{ row.model.name }}</span>
            </div>
            <n-tag size="tiny" :type="typeTagType(row.model.type)">
              {{ MODEL_TYPE_MAP[String(row.model.type).split(',')[0]] || row.model.type }}
            </n-tag>
            <n-tag v-if="row.overridden" size="tiny" type="warning">已改</n-tag>
            <n-tag v-else-if="row.custom" size="tiny" type="info">自定义</n-tag>
            <n-switch
              size="small"
              :value="!row.disabled"
              @update:value="(v) => handleModelDisabled(row.model.name, !v)"
            />
            <n-button text size="tiny" @click="openEditModel(row, activeProvider.id)">编辑</n-button>
            <n-button v-if="row.custom" text type="error" size="tiny" @click="deleteModel(row.model.name)">
              {{ row.overridden ? '恢复预设' : '删除' }}
            </n-button>
          </div>
        </div>
      </section>

      <!-- 桌面版：应用更新 -->
      <section v-else-if="activeSection === 'desktop' && desktopBridge" class="pane">
        <div class="pane-head">
          <h1>应用更新</h1>
          <n-tag v-if="updateState.status === 'up-to-date'" type="success">已是最新</n-tag>
          <n-tag v-else-if="updateState.status === 'available'" type="warning">发现新版本</n-tag>
        </div>
        <p class="pane-desc">
          当前版本 v{{ updateState.currentVersion || '—' }}（Electron {{ desktopBridge.versions?.electron }}）。
          更新包来自 GitHub Releases，下载后自动校验完整性（sha256）。
        </p>

        <div class="card">
          <div class="field-row">
            <span class="field-label">版本检查</span>
            <n-button type="primary" :loading="updateState.status === 'checking'" @click="checkForUpdate">检查更新</n-button>
            <span v-if="updateState.status === 'up-to-date'" class="test-ok">✓ 当前已是最新版本</span>
            <span v-else-if="updateState.status === 'available'">新版本 v{{ updateState.latestVersion }}</span>
            <span v-else-if="updateState.status === 'error'" class="test-fail">{{ updateState.error }}</span>
          </div>
          <div
            v-if="['available', 'downloading', 'downloaded'].includes(updateState.status)"
            class="field-row"
          >
            <span class="field-label">更新 v{{ updateState.latestVersion }}</span>
            <n-progress
              v-if="updateState.status === 'downloading'"
              type="line"
              :percentage="updateProgress"
              style="flex: 1"
            />
            <n-button v-if="updateState.status === 'available'" @click="startDownload">下载更新</n-button>
            <n-button v-if="updateState.status === 'downloaded'" type="primary" @click="applyUpdate">安装并重启</n-button>
          </div>
        </div>
      </section>
    </main>

    <!-- 模型编辑弹窗 -->
    <n-modal v-model:show="showModelEditor" preset="card" :title="editingModel ? `编辑模型 ${editingModel}` : '添加模型'" style="width: 640px">
      <n-form label-placement="left" label-width="90">
        <n-form-item label="模型名称">
          <n-input v-model:value="modelForm.name" :disabled="!!editingModel" placeholder="厂商 API 实际模型名，如 gpt-5.1" />
        </n-form-item>
        <n-form-item label="厂商">
          <n-select v-model:value="modelForm.providerId" :disabled="!!editingModel" :options="providers.map(p => ({ label: p.label, value: p.id }))" />
        </n-form-item>
        <n-form-item label="能力类型">
          <n-radio-group v-model:value="modelForm.type">
            <n-radio-button value="1">对话</n-radio-button>
            <n-radio-button value="2">图片</n-radio-button>
            <n-radio-button value="3">视频</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="端点路径">
          <n-input v-model:value="modelForm.path" placeholder="/official/{厂商}/... 或 /v1/..." />
        </n-form-item>
        <n-form-item label="协议格式">
          <n-select v-model:value="modelForm.protocolKey" :options="Object.keys(protocolRegistry).map(k => ({ label: k, value: k }))" />
        </n-form-item>
        <n-form-item label="响应模式">
          <n-radio-group v-model:value="modelForm.responseMode">
            <n-radio-button value="SYNC">同步</n-radio-button>
            <n-radio-button value="ASYNC">异步任务</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="能力">
          <n-radio-group v-model:value="modelForm.capability">
            <n-radio-button value="CHAT">CHAT</n-radio-button>
            <n-radio-button value="IMAGE">IMAGE</n-radio-button>
            <n-radio-button value="VIDEO">VIDEO</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="参数 Schema">
          <n-input
            v-model:value="modelForm.schemaJson"
            type="textarea"
            :rows="8"
            placeholder='{"input":[{"key":"prompt","label":"Prompt","type":"textarea","required":true}]}'
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="editor-footer">
          <n-button @click="showModelEditor = false">取消</n-button>
          <n-button type="primary" @click="saveModel">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style lang="scss" scoped>
.settings-page {
  display: flex;
  height: 100vh;
  background: var(--cf-bg-page);
  color: var(--cf-text-primary);
  overflow: hidden;
}

// ── 左侧导航 ──
.settings-nav {
  width: 232px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 12px;
  border-right: 1px solid var(--cf-border);
  background: var(--cf-bg-container, transparent);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: var(--cf-text-secondary);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  text-align: left;

  &:hover { background: var(--cf-bg-subtle); color: var(--cf-text-primary); }
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-providers {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.nav-group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--cf-text-tertiary);
  padding: 4px 10px 6px;
  letter-spacing: 0.4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  color: var(--cf-text-secondary);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: background 0.15s ease;

  &:hover { background: var(--cf-bg-subtle); color: var(--cf-text-primary); }

  &.active {
    background: var(--cf-brand-soft, rgba(249, 115, 22, 0.1));
    color: var(--cf-brand);
    font-weight: 600;
  }

  &.muted { opacity: 0.45; }
}

.nav-icon {
  width: 20px;
  text-align: center;
  font-size: 14px;
  flex-shrink: 0;
  display: inline-flex;
  justify-content: center;
}

.nav-icon-img {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cf-border-strong);
  flex-shrink: 0;

  &.on { background: var(--cf-success, #16a34a); }
}

// ── 右侧详情 ──
.settings-main {
  flex: 1;
  overflow-y: auto;
  padding: 28px clamp(20px, 4vw, 56px) 80px;
  min-width: 0;
}

.pane {
  max-width: 760px;
}

.pane-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;

  h1 { font-size: 20px; margin: 0; }
}

.pane-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.pane-head-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;

  .switch-label { font-size: 12px; color: var(--cf-text-tertiary); }
}

.pane-desc {
  font-size: 12.5px;
  color: var(--cf-text-tertiary);
  line-height: 1.7;
  margin: 0 0 20px;

  a { color: var(--cf-brand); text-decoration: none; }
  code {
    font-size: 11.5px;
    background: var(--cf-bg-subtle);
    padding: 1px 6px;
    border-radius: 4px;
  }
}

.card {
  border: 1px solid var(--cf-border);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 16px;
  background: var(--cf-bg-container, transparent);
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  .card-title { margin-bottom: 0; }
}

.card-hint {
  font-size: 11.5px;
  color: var(--cf-text-tertiary);
  margin: 10px 0 0;
  line-height: 1.6;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 10px;

  & + .field-row {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--cf-border);
  }
}

.field-label {
  flex-shrink: 0;
  width: 68px;
  font-size: 12px;
  color: var(--cf-text-tertiary);
}

.field-block {
  flex: 1;

  strong { font-size: 13px; }
}

.saved-mask { font-family: monospace; font-size: 12.5px; color: var(--cf-text-secondary); }
.test-ok { font-size: 12px; color: var(--cf-success, #16a34a); }
.test-fail { font-size: 12px; color: var(--cf-error, #dc2626); }
.docs-link { font-size: 12px; color: var(--cf-brand); text-decoration: none; }

// ── 模型行 ──
.model-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;

  &:hover { background: var(--cf-bg-subtle); }
  &.disabled { opacity: 0.45; }

  .model-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .model-name { font-size: 13px; }
  .model-id { font-size: 11px; font-family: monospace; color: var(--cf-text-tertiary); }
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

// 窄屏：导航收窄为图标栏
@media (max-width: 768px) {
  .settings-nav { width: 64px; padding: 12px 8px; }
  .nav-label, .nav-group-title, .back-btn span { display: none; }
  .nav-item { justify-content: center; }
}
</style>
