<template>
  <n-modal
    :show="show"
    preset="card"
    class="agent-guide-modal"
    :title="$t('canvas.agent.title')"
    @update:show="$emit('update:show', $event)"
  >
    <div class="agent-guide">
      <!-- 通道状态 -->
      <div class="agent-status" :class="{ on: connected }">
        <span class="status-dot" aria-hidden="true"></span>
        <span>{{ connected ? $t('canvas.agent.statusOn') : $t('canvas.agent.statusOff') }}</span>
      </div>
      <p class="agent-desc">{{ $t('canvas.agent.desc') }}</p>

      <!-- 接入命令 -->
      <section class="agent-section">
        <h3>{{ $t('canvas.agent.connectTitle') }}</h3>
        <div class="agent-step">
          <div class="step-label">Claude Code</div>
          <div class="step-cmd">
            <code>claude mcp add huobao-canvas -- node {{ mcpPath }}</code>
            <button type="button" class="copy-btn" :title="$t('canvas.agent.copy')" @click="copy(claudeCmd)">
              <svg-icon icon="tabler:copy" />
            </button>
          </div>
        </div>
        <div class="agent-step">
          <div class="step-label">Codex</div>
          <div class="step-cmd">
            <code>codex mcp add huobao-canvas -- node {{ mcpPath }}</code>
            <button type="button" class="copy-btn" :title="$t('canvas.agent.copy')" @click="copy(codexCmd)">
              <svg-icon icon="tabler:copy" />
            </button>
          </div>
        </div>
        <p class="step-hint">{{ $t('canvas.agent.connectHint') }}</p>
      </section>

      <!-- 可用工具 -->
      <section class="agent-section">
        <h3>{{ $t('canvas.agent.toolsTitle') }}</h3>
        <div class="tool-list">
          <div v-for="tool in tools" :key="tool.name" class="tool-item">
            <code class="tool-name">{{ tool.name }}</code>
            <span class="tool-desc">{{ tool.description }}</span>
          </div>
        </div>
      </section>

      <!-- 执行确认 -->
      <section class="agent-section agent-approve">
        <div class="approve-info">
          <h3>{{ $t('canvas.agent.approveTitle') }}</h3>
          <p>{{ $t('canvas.agent.approveDesc') }}</p>
        </div>
        <n-switch :value="manualApprove" @update:value="setApproveMode" />
      </section>
    </div>
  </n-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  show: { type: Boolean, default: false },
  connected: { type: Boolean, default: false },
})
defineEmits(['update:show'])

const { t } = useI18n()

const APPROVE_MODE_KEY = 'huobao.canvas.agentApprove'
const mcpPath = '/path/to/apps/agent-mcp/index.mjs'
const claudeCmd = `claude mcp add huobao-canvas -- node ${mcpPath}`
const codexCmd = `codex mcp add huobao-canvas -- node ${mcpPath}`

const tools = ref([])
const manualApprove = ref(false)
try {
  manualApprove.value = localStorage.getItem(APPROVE_MODE_KEY) === 'manual'
} catch {}

const setApproveMode = (value) => {
  manualApprove.value = value
  try {
    localStorage.setItem(APPROVE_MODE_KEY, value ? 'manual' : 'auto')
  } catch {}
}

watch(() => props.show, async (visible) => {
  if (!visible) return
  try {
    const resp = await fetch('/api/agent/tools')
    const data = await resp.json()
    tools.value = Array.isArray(data?.tools) ? data.tools : []
  } catch {
    tools.value = []
  }
})

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    window.$message?.success(t('canvas.agent.copied'))
  } catch {
    window.$message?.error(t('canvas.agent.copyFailed'))
  }
}
</script>

<style scoped lang="scss">
.agent-guide {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.agent-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--cf-text-tertiary);

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--cf-text-tertiary);
  }

  &.on {
    color: var(--cf-success, #34d399);

    .status-dot {
      background: var(--cf-success, #34d399);
      box-shadow: 0 0 8px color-mix(in srgb, var(--cf-success, #34d399) 60%, transparent);
    }
  }
}

.agent-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--cf-text-secondary);
}

.agent-section {
  h3 {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 700;
  }
}

.agent-step {
  margin-bottom: 8px;
}

.step-label {
  font-size: 11px;
  color: var(--cf-text-tertiary);
  margin-bottom: 4px;
}

.step-cmd {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--cf-border);
  border-radius: 8px;
  background: var(--cf-bg-subtle);

  code {
    flex: 1;
    font-size: 11px;
    word-break: break-all;
    user-select: all;
  }
}

.copy-btn {
  display: inline-flex;
  border: none;
  background: transparent;
  color: var(--cf-text-tertiary);
  cursor: pointer;
  padding: 2px;

  &:hover {
    color: var(--cf-text-primary);
  }

  svg {
    width: 14px;
    height: 14px;
  }
}

.step-hint {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--cf-text-tertiary);
  line-height: 1.6;
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.tool-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;

  .tool-name {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--cf-brand);
  }

  .tool-desc {
    color: var(--cf-text-secondary);
    line-height: 1.5;
  }
}

.agent-approve {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--cf-border);

  .approve-info {
    flex: 1;

    p {
      margin: 0;
      font-size: 11px;
      color: var(--cf-text-tertiary);
      line-height: 1.6;
    }
  }
}
</style>
