<template>
  <n-modal
    :show="show"
    preset="card"
    title="工作流模版库"
    class="workflow-templates-modal"
    style="width: 840px; max-width: 95vw;"
    :mask-closable="true"
    @update:show="$emit('update:show', $event)"
  >
    <div class="templates-container">
      <div class="templates-header-desc">
        选择精选官方工作流，一键加载到画布，体验多模态串联与多模型并发能力。
      </div>

      <div class="templates-grid">
        <div
          v-for="tpl in templates"
          :key="tpl.id"
          class="template-card"
          @click="selectedTemplate = tpl"
          :class="{ active: selectedTemplate?.id === tpl.id }"
        >
          <div class="card-top">
            <span class="card-tag">{{ tpl.tag }}</span>
            <span class="node-count">{{ tpl.nodes.length }} 个节点 · {{ tpl.edges.length }} 条连线</span>
          </div>
          <h4 class="card-title">{{ tpl.title }}</h4>
          <p class="card-desc">{{ tpl.description }}</p>

          <div class="node-chips">
            <span
              v-for="node in tpl.nodes"
              :key="node.id"
              class="node-chip"
              :class="node.type"
            >
              {{ node.data?.title || node.type }}
            </span>
          </div>

          <div class="card-footer">
            <button
              type="button"
              class="btn-use-tpl replace"
              @click.stop="handleApply(tpl, true)"
              title="清空当前画布并载入此模版"
            >
              全新载入
            </button>
            <button
              type="button"
              class="btn-use-tpl append"
              @click.stop="handleApply(tpl, false)"
              title="保留当前内容，将此模版追加到画布"
            >
              追加到画布
            </button>
          </div>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup>
import { ref } from 'vue'
import { WORKFLOW_TEMPLATES } from '@/config/templates/index.js'

const props = defineProps({
  show: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show', 'apply-template'])

const templates = WORKFLOW_TEMPLATES
const selectedTemplate = ref(templates[0])

function handleApply(tpl, replace = false) {
  emit('apply-template', { template: tpl, replace })
  emit('update:show', false)
}
</script>

<style scoped lang="scss">
.workflow-templates-modal {
  background: var(--cf-bg-surface, #1e1e24);
  color: var(--cf-text-primary, #ffffff);
  border-radius: 12px;
}

.templates-header-desc {
  font-size: 13px;
  color: var(--cf-text-secondary, #9ca3af);
  margin-bottom: 16px;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 4px;
}

.template-card {
  display: flex;
  flex-direction: column;
  background: var(--cf-bg-elevated, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--cf-border, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--cf-brand, #3b82f6);
    background: var(--cf-bg-hover, rgba(255, 255, 255, 0.07));
    transform: translateY(-2px);
  }

  &.active {
    border-color: var(--cf-brand, #3b82f6);
    box-shadow: 0 0 0 1px var(--cf-brand, #3b82f6);
  }
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.15);
  color: var(--cf-brand, #3b82f6);
}

.node-count {
  font-size: 11px;
  color: var(--cf-text-tertiary, #6b7280);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--cf-text-primary, #ffffff);
  margin: 0 0 6px 0;
}

.card-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--cf-text-secondary, #9ca3af);
  margin: 0 0 14px 0;
  flex: 1;
}

.node-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.node-chip {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--cf-text-secondary, #d1d5db);

  &.textNode {
    border-left: 2px solid #3b82f6;
  }
  &.imageNode {
    border-left: 2px solid #10b981;
  }
  &.videoNode {
    border-left: 2px solid #8b5cf6;
  }
}

.card-footer {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.btn-use-tpl {
  flex: 1;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;

  &.replace {
    background: var(--cf-brand, #3b82f6);
    color: #ffffff;

    &:hover {
      opacity: 0.9;
    }
  }

  &.append {
    background: transparent;
    border-color: var(--cf-border, rgba(255, 255, 255, 0.16));
    color: var(--cf-text-primary, #ffffff);

    &:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: var(--cf-border-strong, rgba(255, 255, 255, 0.3));
    }
  }
}
</style>
