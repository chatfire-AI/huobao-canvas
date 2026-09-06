<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
  upsertCustomModel, removeCustomModel, MODEL_TYPE_MAP, getLocalModelTypes,
} from '@/api/localCatalog'
import { protocolRegistry } from '@/views/playground/protocols/registry.js'
import { appFetch } from '@/utils/desktopBridge.js'
import { isServerRunMode, testProviderOnServer } from '@/api/canvasServer.js'
import { resolveModelIcon } from '@/utils/tools'
import { useTheme } from '@/composables/useTheme'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'

const { t } = useI18n()
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
    updateState.value = { ...updateState.value, status: 'error', error: error?.message || t('settings.desktop.downloadFailed') }
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
    window.$message?.warning(t('settings.chatfire.pasteKeyRequired'))
    return
  }
  cfQuickTesting.value = true
  try {
    // 相对路径走同源：浏览器经 vite proxy / nginx，Electron 内经内嵌 server 的 proxy 路由
    const resp = await appFetch('/v1/models', { headers: { Authorization: `Bearer ${key}` } })
    if (!resp.ok) {
      window.$message?.warning(t('settings.chatfire.keyCheckReturned', { status: resp.status }))
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
    window.$message?.success(t('settings.chatfire.setupSuccess'))
  } catch (error) {
    console.error('[chatfireQuickSetup]', error)
    const detail = [error?.message, error?.stack?.split('\n')[1]?.trim()].filter(Boolean).join(' @ ')
    window.$message?.error(t('settings.chatfire.connectFailed', { detail: detail || error }), { duration: 8000 })
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
    window.$message?.warning(t('settings.providers.enterApiKey'))
    return
  }
  providerKeys.value = setProviderApiKey(id, key)
  keyInputs.value[id] = ''
  window.$message?.success(t('settings.providers.keySaved'))
}

const clearProviderKey = (id) => {
  providerKeys.value = setProviderApiKey(id, '')
  testResults.value[id] = null
}

const saveProviderBase = (provider) => {
  const value = (baseInputs.value[provider.id] || '').trim().replace(/\/$/, '')
  providerKeys.value = setProviderBaseUrl(provider.id, value === provider.baseUrl ? '' : value)
  baseInputs.value[provider.id] = effectiveProviderBaseUrl(provider)
  window.$message?.success(t('settings.providers.baseUrlSaved'))
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
    window.$message?.warning(t('settings.providers.saveKeyFirst'))
    return
  }
  const override = (baseInputs.value[provider.id] || '').trim().replace(/\/$/, '')
  const useOverride = override && override !== provider.baseUrl
  const url = providerTestUrl(provider, useOverride ? override : '')
  if (!url) {
    window.$message?.info(t('settings.providers.noTestEndpoint'))
    return
  }
  testing.value[provider.id] = true
  try {
    // 服务端执行模式：由 apps/server 代发（用服务端存的 Key）；否则本地经同源反代
    if (await isServerRunMode()) {
      const result = await testProviderOnServer(provider.id)
      testResults.value[provider.id] = result.ok ? 'ok' : (result.status ? `HTTP ${result.status}` : 'fail')
      if (result.ok) window.$message?.success(t('settings.providers.testOkMessage', { label: provider.label }))
      else window.$message?.warning(t('settings.providers.testFailed', { label: provider.label, detail: result.message || t('settings.providers.testFailedDefault') }))
      return
    }
    const resp = await appFetch(url, { headers: buildProviderAuthHeaders(provider, key) })
    testResults.value[provider.id] = resp.ok ? 'ok' : `HTTP ${resp.status}`
    if (resp.ok) window.$message?.success(t('settings.providers.testOkMessage', { label: provider.label }))
    else window.$message?.warning(t('settings.providers.testHttpError', { label: provider.label, status: resp.status }))
  } catch (error) {
    testResults.value[provider.id] = 'fail'
    window.$message?.error(t('settings.providers.testError', { detail: error?.message || error }))
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
    window.$message?.warning(t('settings.models.nameRequired'))
    return
  }
  if (!f.path.trim()) {
    window.$message?.warning(t('settings.models.pathRequired'))
    return
  }
  let parsedSchema = null
  if (f.schemaJson.trim()) {
    try {
      parsedSchema = JSON.parse(f.schemaJson)
    } catch (error) {
      window.$message?.error(t('settings.models.schemaParseFailed', { detail: error.message }))
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
    typeName: MODEL_TYPE_MAP[f.type] || MODEL_TYPE_MAP['1'],
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
  window.$message?.success(t('settings.models.saved'))
}

const deleteModel = (name) => {
  window.$dialog?.warning({
    title: t('settings.models.deleteTitle'),
    content: t('settings.models.deleteContent', { name }),
    positiveText: t('common.delete'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      removeCustomModel(name)
      overrides.value = readCatalogOverrides()
    },
  })
}

const typeTagType = (type) => ({ '1': 'info', '2': 'success', '3': 'warning' }[String(type).split(',')[0]] || 'default')
// 类型 tag 展示标签按当前语言取（数据契约 MODEL_TYPE_MAP 保持中文，仅展示层翻译）
const modelTypeDisplay = (type) => getLocalModelTypes()[String(type).split(',')[0]] || type
</script>

<template>
  <div class="settings-page">
    <!-- 左侧导航 -->
    <aside class="settings-nav">
      <button type="button" class="back-btn" @click="router.push('/canvas')">
        <SvgIcon icon="tabler:arrow-left" />
        <span>{{ $t('settings.nav.backToCanvas') }}</span>
      </button>

      <div class="nav-group">
        <div class="nav-group-title">{{ $t('settings.nav.gatewayGroup') }}</div>
        <button
          type="button"
          class="nav-item nav-chatfire"
          :class="{ active: activeSection === 'chatfire' }"
          @click="activeSection = 'chatfire'"
        >
          <img src="/icons/huobao.png" class="nav-icon-img" alt="火宝 Huobao" />
          <span class="nav-label">火宝 Huobao</span>
          <span v-if="cfCurrentKey && catalogMode === 'gateway'" class="status-dot on" :title="$t('settings.chatfire.connected')"></span>
        </button>
      </div>

      <div class="nav-group nav-providers">
        <div class="nav-group-title">{{ $t('settings.nav.providersGroup') }}</div>
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
          <span v-if="providerKeys[p.id]?.key" class="status-dot on" :title="$t('settings.nav.keyConfigured')"></span>
        </button>
      </div>

      <!-- 桌面版（Electron preload 注入 canvasDesktop 时可见） -->
      <div v-if="desktopBridge" class="nav-group">
        <div class="nav-group-title">{{ $t('settings.nav.desktopGroup') }}</div>
        <button
          type="button"
          class="nav-item"
          :class="{ active: activeSection === 'desktop' }"
          @click="activeSection = 'desktop'"
        >
          <span class="nav-icon"><SvgIcon icon="tabler:device-desktop" /></span>
          <span class="nav-label">{{ $t('settings.nav.appUpdate') }}</span>
          <span v-if="updateState.status === 'available'" class="status-dot on" :title="$t('settings.desktop.newVersionFound')"></span>
        </button>
      </div>

      <div class="nav-footer">
        <LocaleSwitcher />
      </div>
    </aside>

    <!-- 右侧详情 -->
    <main class="settings-main">
      <!-- 火宝 Huobao -->
      <section v-if="activeSection === 'chatfire'" class="pane">
        <div class="pane-head">
          <img src="/icons/huobao.png" class="pane-icon" alt="火宝 Huobao" />
          <h1>火宝 Huobao</h1>
          <n-tag v-if="cfCurrentKey" type="success">{{ $t('settings.chatfire.connected') }}</n-tag>
        </div>
        <p class="pane-desc">
          {{ $t('settings.chatfire.desc') }}
          <a href="https://firemux.com" target="_blank" rel="noopener">{{ $t('settings.chatfire.registerLink') }}</a>
        </p>

        <div class="card">
          <div class="field-row">
            <span class="field-label">{{ $t('settings.chatfire.gatewayUrl') }}</span>
            <span class="saved-mask">{{ PUBLIC_API_BASE_URL }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">API Key</span>
            <template v-if="cfCurrentKey">
              <span class="saved-mask">{{ maskKey(cfCurrentKey) }}</span>
              <n-button text type="error" size="small" @click="chatfireDisconnect">{{ $t('settings.chatfire.disconnect') }}</n-button>
            </template>
            <template v-else>
              <n-input
                v-model:value="cfQuickKey"
                type="password"
                show-password-on="click"
                placeholder="sk-..."
                @keyup.enter="chatfireQuickSetup"
              />
              <n-button type="primary" :loading="cfQuickTesting" @click="chatfireQuickSetup">{{ $t('settings.chatfire.quickSetup') }}</n-button>
            </template>
          </div>
        </div>
      </section>

      <!-- 厂商详情 -->
      <section v-else-if="activeProvider" class="pane">
        <div class="pane-head">
          <img v-if="activeProvider.icon" :src="resolveModelIcon(activeProvider.icon, iconTheme)" class="pane-icon" :alt="activeProvider.label" />
          <h1>{{ activeProvider.label }}</h1>
          <a :href="activeProvider.docsUrl" target="_blank" rel="noopener" class="docs-link">{{ $t('settings.providers.docsLink') }}</a>
          <div class="pane-head-right">
            <span class="switch-label">{{ $t('settings.providers.enable') }}</span>
            <n-switch
              :value="!isProviderHidden(activeProvider.id)"
              @update:value="(v) => handleProviderHidden(activeProvider.id, !v)"
            />
          </div>
        </div>
        <p class="pane-desc">
          {{ $t('settings.providers.descOfficial') }} <code>{{ activeProvider.baseUrl }}</code>{{ $t('settings.providers.descProxyNote') }}
          {{ $t('settings.providers.descCustom') }}
        </p>

        <!-- 连接配置 -->
        <div class="card">
          <div class="card-title">{{ $t('settings.providers.connection') }}</div>
          <div class="field-row">
            <span class="field-label">baseUrl</span>
            <n-input v-model:value="baseInputs[activeProvider.id]" :placeholder="activeProvider.baseUrl" />
            <n-button @click="saveProviderBase(activeProvider)">{{ $t('common.save') }}</n-button>
            <n-button
              v-if="baseInputs[activeProvider.id] && baseInputs[activeProvider.id] !== activeProvider.baseUrl"
              text type="warning"
              @click="resetProviderBase(activeProvider)"
            >{{ $t('common.reset') }}</n-button>
          </div>
          <div class="field-row">
            <span class="field-label">API Key</span>
            <template v-if="providerKeys[activeProvider.id]?.key">
              <span class="saved-mask">{{ maskKey(providerKeys[activeProvider.id].key) }}</span>
              <n-button size="small" :loading="testing[activeProvider.id]" @click="testProvider(activeProvider)">{{ $t('settings.providers.testConnection') }}</n-button>
              <span v-if="testResults[activeProvider.id] === 'ok'" class="test-ok">{{ $t('settings.providers.testOkTag') }}</span>
              <span v-else-if="testResults[activeProvider.id]" class="test-fail">{{ testResults[activeProvider.id] }}</span>
              <n-button text type="error" size="small" @click="clearProviderKey(activeProvider.id)">{{ $t('settings.providers.clear') }}</n-button>
            </template>
            <template v-else>
              <n-input
                v-model:value="keyInputs[activeProvider.id]"
                type="password"
                show-password-on="click"
                :placeholder="$t('settings.providers.keyPlaceholder')"
                @keyup.enter="saveProviderKey(activeProvider.id)"
              />
              <n-button type="primary" @click="saveProviderKey(activeProvider.id)">{{ $t('common.save') }}</n-button>
            </template>
          </div>
          <p class="card-hint">{{ $t('settings.providers.keyHint') }}</p>
        </div>

        <!-- 模型管理 -->
        <div class="card">
          <div class="card-head">
            <div class="card-title">{{ $t('settings.models.sectionTitle', { count: modelsOfProvider(activeProvider.id).length }) }}</div>
            <n-button size="small" @click="openAddModel(activeProvider.id)">{{ $t('settings.models.addModel') }}</n-button>
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
              {{ modelTypeDisplay(row.model.type) }}
            </n-tag>
            <n-tag v-if="row.overridden" size="tiny" type="warning">{{ $t('settings.models.overridden') }}</n-tag>
            <n-tag v-else-if="row.custom" size="tiny" type="info">{{ $t('settings.models.custom') }}</n-tag>
            <n-switch
              size="small"
              :value="!row.disabled"
              @update:value="(v) => handleModelDisabled(row.model.name, !v)"
            />
            <n-button text size="tiny" @click="openEditModel(row, activeProvider.id)">{{ $t('common.edit') }}</n-button>
            <n-button v-if="row.custom" text type="error" size="tiny" @click="deleteModel(row.model.name)">
              {{ row.overridden ? $t('settings.models.restorePreset') : $t('common.delete') }}
            </n-button>
          </div>
        </div>
      </section>

      <!-- 桌面版：应用更新 -->
      <section v-else-if="activeSection === 'desktop' && desktopBridge" class="pane">
        <div class="pane-head">
          <h1>{{ $t('settings.nav.appUpdate') }}</h1>
          <n-tag v-if="updateState.status === 'up-to-date'" type="success">{{ $t('settings.desktop.upToDate') }}</n-tag>
          <n-tag v-else-if="updateState.status === 'available'" type="warning">{{ $t('settings.desktop.newVersionFound') }}</n-tag>
        </div>
        <p class="pane-desc">
          {{ $t('settings.desktop.descCurrent', { version: updateState.currentVersion || '—', electron: desktopBridge.versions?.electron }) }}
          {{ $t('settings.desktop.descSource') }}
        </p>

        <div class="card">
          <div class="field-row">
            <span class="field-label">{{ $t('settings.desktop.versionCheck') }}</span>
            <n-button type="primary" :loading="updateState.status === 'checking'" @click="checkForUpdate">{{ $t('settings.desktop.checkUpdate') }}</n-button>
            <span v-if="updateState.status === 'up-to-date'" class="test-ok">{{ $t('settings.desktop.upToDateDetail') }}</span>
            <span v-else-if="updateState.status === 'available'">{{ $t('settings.desktop.newVersion', { version: updateState.latestVersion }) }}</span>
            <span v-else-if="updateState.status === 'error'" class="test-fail">{{ updateState.error }}</span>
          </div>
          <div
            v-if="['available', 'downloading', 'downloaded'].includes(updateState.status)"
            class="field-row"
          >
            <span class="field-label">{{ $t('settings.desktop.updateTo', { version: updateState.latestVersion }) }}</span>
            <n-progress
              v-if="updateState.status === 'downloading'"
              type="line"
              :percentage="updateProgress"
              style="flex: 1"
            />
            <n-button v-if="updateState.status === 'available'" @click="startDownload">{{ $t('settings.desktop.downloadUpdate') }}</n-button>
            <n-button v-if="updateState.status === 'downloaded'" type="primary" @click="applyUpdate">{{ $t('settings.desktop.installAndRestart') }}</n-button>
          </div>
        </div>
      </section>
    </main>

    <!-- 模型编辑弹窗 -->
    <n-modal v-model:show="showModelEditor" preset="card" :title="editingModel ? $t('settings.models.editTitle', { name: editingModel }) : $t('settings.models.addTitle')" style="width: 640px">
      <n-form label-placement="left" label-width="90">
        <n-form-item :label="$t('settings.models.fieldName')">
          <n-input v-model:value="modelForm.name" :disabled="!!editingModel" :placeholder="$t('settings.models.namePlaceholder')" />
        </n-form-item>
        <n-form-item :label="$t('settings.models.fieldProvider')">
          <n-select v-model:value="modelForm.providerId" :disabled="!!editingModel" :options="providers.map(p => ({ label: p.label, value: p.id }))" />
        </n-form-item>
        <n-form-item :label="$t('settings.models.fieldType')">
          <n-radio-group v-model:value="modelForm.type">
            <n-radio-button value="1">{{ $t('settings.models.typeChat') }}</n-radio-button>
            <n-radio-button value="2">{{ $t('settings.models.typeImage') }}</n-radio-button>
            <n-radio-button value="3">{{ $t('settings.models.typeVideo') }}</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item :label="$t('settings.models.fieldPath')">
          <n-input v-model:value="modelForm.path" :placeholder="$t('settings.models.pathPlaceholder')" />
        </n-form-item>
        <n-form-item :label="$t('settings.models.fieldProtocol')">
          <n-select v-model:value="modelForm.protocolKey" :options="Object.keys(protocolRegistry).map(k => ({ label: k, value: k }))" />
        </n-form-item>
        <n-form-item :label="$t('settings.models.fieldResponseMode')">
          <n-radio-group v-model:value="modelForm.responseMode">
            <n-radio-button value="SYNC">{{ $t('settings.models.sync') }}</n-radio-button>
            <n-radio-button value="ASYNC">{{ $t('settings.models.async') }}</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item :label="$t('settings.models.fieldCapability')">
          <n-radio-group v-model:value="modelForm.capability">
            <n-radio-button value="CHAT">CHAT</n-radio-button>
            <n-radio-button value="IMAGE">IMAGE</n-radio-button>
            <n-radio-button value="VIDEO">VIDEO</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item :label="$t('settings.models.fieldSchema')">
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
          <n-button @click="showModelEditor = false">{{ $t('common.cancel') }}</n-button>
          <n-button type="primary" @click="saveModel">{{ $t('common.save') }}</n-button>
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

.nav-footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--cf-border);
  display: flex;
  justify-content: flex-start;
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
