<script setup>
import { computed, ref } from 'vue'
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
  getCatalogMode, setCatalogMode, getStorageProvider, setStorageProvider,
  getGatewayBaseUrl, setGatewayBaseUrl, PUBLIC_API_BASE_URL,
} from '@/config'
import {
  readCatalogOverrides, setModelDisabled, setProviderHidden,
  upsertCustomModel, removeCustomModel, MODEL_TYPE_MAP,
} from '@/api/localCatalog'
import { protocolRegistry } from '@/views/playground/protocols/registry.js'
import { resolveModelIcon } from '@/utils/tools'

const router = useRouter()

// ── 导航：chatfire / 厂商 id / general ──
const activeSection = ref('chatfire')
const providers = listProviders()
const activeProvider = computed(() => getProvider(activeSection.value))

// ── 通用设置 ──
const catalogMode = ref(getCatalogMode())
const storageProvider = ref(getStorageProvider())

const handleCatalogModeChange = (mode) => {
  setCatalogMode(mode)
  catalogMode.value = mode
  window.$message?.success('已切换，返回画布后生效')
}

const handleStorageChange = (value) => {
  setStorageProvider(value)
  storageProvider.value = value
}

// ── ChatFire（火宝）一键配置 ──
const cfQuickKey = ref('')
const cfQuickTesting = ref(false)
const cfCurrentKey = ref(getCurrentApiKey())
// 空串 = 同源反代（推荐）；输入框留空时由 placeholder 展示公共地址
const gatewayBaseInput = ref(getGatewayBaseUrl())

const chatfireQuickSetup = async () => {
  const key = cfQuickKey.value.trim()
  if (!key) {
    window.$message?.warning('请粘贴 ChatFire API Key')
    return
  }
  const base = gatewayBaseInput.value.trim().replace(/\/$/, '')
  cfQuickTesting.value = true
  try {
    // 空串 → 同源探测（dev vite proxy / 生产 nginx 反代，规避 CORS）；
    // 用户显式填了绝对地址才跨域直连；跨域失败自动回退同源并清除失效覆盖
    const probe = (b) => fetch(`${b}/v1/models`, { headers: { Authorization: `Bearer ${key}` } })
    let resp
    let effectiveBase = base
    try {
      resp = await probe(base)
    } catch (error) {
      if (!base) throw error
      resp = await probe('')
      effectiveBase = ''
      gatewayBaseInput.value = ''
      window.$message?.info('自定义网关地址跨域不可达，已回退为内置同源反代')
    }
    if (!resp.ok) {
      window.$message?.warning(`Key 校验返回 ${resp.status}，已保存，请确认 Key 有效`)
    }
    setGatewayBaseUrl(effectiveBase)
    addApiKey(key, 'ChatFire')
    setCurrentApiKey(key)
    cfCurrentKey.value = key
    setCatalogMode('gateway')
    catalogMode.value = 'gateway'
    cfQuickKey.value = ''
    window.$message?.success('已接入 ChatFire 网关，返回画布即可使用全部模型')
  } catch (error) {
    window.$message?.error(`连接失败：${error?.message || error}（请确认网关地址可达；绝对地址需目标允许跨域）`)
  } finally {
    cfQuickTesting.value = false
  }
}

const saveGatewayBase = () => {
  const value = gatewayBaseInput.value.trim().replace(/\/$/, '')
  setGatewayBaseUrl(value)
  gatewayBaseInput.value = getGatewayBaseUrl()
  window.$message?.success('网关地址已保存')
}

const chatfireDisconnect = () => {
  setCurrentApiKey('')
  cfCurrentKey.value = ''
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
  window.$message?.success('API Key 已保存（仅存浏览器本地）')
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
    const resp = await fetch(url, { headers: buildProviderAuthHeaders(provider, key) })
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
          <span class="nav-icon">⚡</span>
          <span class="nav-label">火宝 ChatFire</span>
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
          <img v-if="p.icon" :src="resolveModelIcon(p.icon)" class="nav-icon-img" :alt="p.label" />
          <span v-else class="nav-icon">{{ p.label.slice(0, 1) }}</span>
          <span class="nav-label">{{ p.label }}</span>
          <span v-if="providerKeys[p.id]?.key" class="status-dot on" title="已配置 Key"></span>
        </button>
      </div>

      <div class="nav-group nav-bottom">
        <button
          type="button"
          class="nav-item"
          :class="{ active: activeSection === 'general' }"
          @click="activeSection = 'general'"
        >
          <span class="nav-icon"><SvgIcon icon="tabler:adjustments" /></span>
          <span class="nav-label">通用</span>
        </button>
      </div>
    </aside>

    <!-- 右侧详情 -->
    <main class="settings-main">
      <!-- 火宝 ChatFire -->
      <section v-if="activeSection === 'chatfire'" class="pane">
        <div class="pane-head">
          <h1>⚡ 火宝 ChatFire</h1>
          <n-tag v-if="cfCurrentKey && catalogMode === 'gateway'" type="success">已接入</n-tag>
        </div>
        <p class="pane-desc">
          一个 Key 使用全部 10+ 厂商的聚合模型，按量计费，无需逐厂商注册。
          粘贴 Key 即自动切换到网关模式。
          <a href="https://chatfire.site" target="_blank" rel="noopener">前往 chatfire.site 注册获取 Key →</a>
        </p>

        <div class="card">
          <div class="field-row">
            <span class="field-label">网关地址</span>
            <n-input v-model:value="gatewayBaseInput" :placeholder="`留空走同源反代（默认代理到 ${PUBLIC_API_BASE_URL}）`" />
            <n-button @click="saveGatewayBase">保存</n-button>
          </div>
          <div class="field-row">
            <span class="field-label">API Key</span>
            <template v-if="cfCurrentKey && catalogMode === 'gateway'">
              <span class="saved-mask">{{ maskKey(cfCurrentKey) }}</span>
              <n-button text type="error" size="small" @click="chatfireDisconnect">断开并切回官方直连</n-button>
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
          <img v-if="activeProvider.icon" :src="resolveModelIcon(activeProvider.icon)" class="pane-icon" :alt="activeProvider.label" />
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

      <!-- 通用 -->
      <section v-else-if="activeSection === 'general'" class="pane">
        <div class="pane-head"><h1>通用</h1></div>
        <div class="card">
          <div class="field-row">
            <div class="field-block">
              <strong>模型目录模式</strong>
              <p class="card-hint">官方直连：模型来自各厂商配置；网关模式：从 ChatFire 网关拉取聚合模型目录。</p>
            </div>
            <n-radio-group :value="catalogMode" @update:value="handleCatalogModeChange">
              <n-radio-button value="official">厂商官方直连</n-radio-button>
              <n-radio-button value="gateway">ChatFire 网关</n-radio-button>
            </n-radio-group>
          </div>
          <div class="field-row">
            <div class="field-block">
              <strong>媒体转存</strong>
              <p class="card-hint">开启后生成结果转存到自建存储服务（docker compose --profile storage）；关闭则保留厂商原始链接（可能过期）。</p>
            </div>
            <n-radio-group :value="storageProvider" @update:value="handleStorageChange">
              <n-radio-button value="none">关闭</n-radio-button>
              <n-radio-button value="http">启用</n-radio-button>
            </n-radio-group>
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
