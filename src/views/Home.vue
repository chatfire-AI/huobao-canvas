<template>
  <!-- Home page | 首页 -->
  <div class="min-h-screen h-screen overflow-y-auto bg-[var(--bg-primary)]">
    <!-- Header | 顶部导航 -->
    <AppHeader>
      <template #right>
        <button 
          @click="showApiSettings = true"
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          :class="{ 'text-[var(--accent-color)]': isApiConfigured }"
          title="API 设置"
        >
          <n-icon :size="20"><SettingsOutline /></n-icon>
        </button>
      </template>
    </AppHeader>

    <!-- Main content | 主要内容 -->
    <main class="max-w-5xl mx-auto px-4 py-8 md:py-16">
      <!-- Welcome section | 欢迎区域 -->
      <section class="text-center mb-12">
        <div class="flex items-center justify-center gap-4 mb-8">
          <img src="../assets/logo.png" alt="Logo" class="w-12 h-12 md:w-16 md:h-16" />
          <h1 class="text-2xl md:text-4xl font-bold text-[var(--text-primary)]">欢迎来到火宝无限画布</h1>
        </div>
        
        <!-- Input area | 输入区域 -->
        <div class="max-w-2xl mx-auto">
          <div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-4 shadow-sm">
            <textarea
              v-model="inputText"
              placeholder="输入你的创意，开始新项目"
              class="w-full bg-transparent resize-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] min-h-[80px]"
              @keydown.enter.ctrl="handleCreateWithInput"
            />
            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center gap-2">
                <!-- <button class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                  <n-icon :size="18"><AddOutline /></n-icon>
                </button>
                <button class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                  <n-icon :size="18"><ImageOutline /></n-icon>
                </button> -->
              </div>
              <div class="flex items-center gap-3">
                <button 
                  @click="handleCreateWithInput"
                  class="w-8 h-8 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] flex items-center justify-center transition-colors"
                >
                  <n-icon :size="20" color="white"><SendOutline /></n-icon>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Quick suggestions | 快捷建议 -->
          <div class="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span class="text-sm text-[var(--text-secondary)]">推荐：</span>
            <button 
              v-for="tag in suggestions" 
              :key="tag"
              @click="inputText = tag"
              class="px-3 py-1.5 text-sm rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors"
            >
              {{ tag }}
            </button>
            <button class="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
              <n-icon :size="16"><RefreshOutline /></n-icon>
            </button>
          </div>
        </div>
      </section>

      <!-- My projects section | 我的项目区域 -->
      <section ref="projectsSection">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-[var(--text-primary)]">我的项目</h2>
          <button 
            @click="createNewProject"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white transition-colors"
          >
            <n-icon :size="16"><AddOutline /></n-icon>
            新建项目
          </button>
        </div>
        
        <!-- Empty state | 空状态 -->
        <div v-if="projects.length === 0" class="text-center py-12 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-color)]">
          <n-icon :size="48" class="text-[var(--text-secondary)] mb-4"><FolderOutline /></n-icon>
          <p class="text-[var(--text-secondary)] mb-4">还没有项目，创建一个开始吧</p>
          <button 
            @click="createNewProject"
            class="px-4 py-2 text-sm rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white transition-colors"
          >
            创建第一个项目
          </button>
        </div>
        
        <!-- Projects grid | 项目网格 -->
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            v-for="project in projects" 
            :key="project.id"
            class="group relative"
          >
            <!-- Project card | 项目卡片 -->
            <div 
              @click="openProject(project)"
              class="cursor-pointer"
            >
              <div 
                class="aspect-video rounded-xl overflow-hidden bg-[var(--bg-tertiary)] mb-2 border border-[var(--border-color)] relative"
                @mouseenter="handleThumbnailHover(project, true)"
                @mouseleave="handleThumbnailHover(project, false)"
              >
                <!-- Thumbnail or placeholder | 缩略图或占位 -->
                <template v-if="project.thumbnail">
                  <!-- Video thumbnail | 视频缩略图 -->
                  <video 
                    v-if="isVideoUrl(project.thumbnail)"
                    :ref="el => setVideoRef(project.id, el)"
                    :src="project.thumbnail"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    muted
                    loop
                    playsinline
                  />
                  <!-- Image thumbnail | 图片缩略图 -->
                  <img 
                    v-else
                    :src="project.thumbnail" 
                    :alt="project.name"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </template>
                <div v-else class="w-full h-full flex items-center justify-center">
                  <n-icon :size="32" class="text-[var(--text-secondary)]"><DocumentOutline /></n-icon>
                </div>
                
                <!-- Hover overlay | 悬浮遮罩 -->
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span class="text-white text-sm">打开项目</span>
                </div>
              </div>
              <p class="text-sm text-[var(--text-primary)] truncate">{{ project.name }}</p>
              <p class="text-xs text-[var(--text-secondary)]">{{ formatDate(project.updatedAt) }}</p>
            </div>
            
            <!-- Project actions | 项目操作 -->
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <n-dropdown :options="getProjectActions(project)" @select="(key) => handleProjectAction(key, project)" placement="bottom-end">
                <button 
                  @click.stop
                  class="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow hover:bg-white dark:hover:bg-gray-800 transition-colors"
                >
                  <n-icon :size="16"><EllipsisHorizontalOutline /></n-icon>
                </button>
              </n-dropdown>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Left sidebar | 左侧边栏 -->
    <aside class="fixed left-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-sm">
      <button 
        @click="createNewProject"
        class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        title="新建项目"
      >
        <n-icon :size="20"><DocumentOutline /></n-icon>
      </button>
      <button 
        @click="scrollToProjects"
        class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        title="我的项目"
      >
        <n-icon :size="20"><FolderOutline /></n-icon>
      </button>
    </aside>

    <!-- API Settings Modal | API 设置弹窗 -->
    <ApiSettings v-model:show="showApiSettings" @saved="refreshApiConfig" />

    <!-- Rename modal | 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名项目">
      <n-input v-model:value="renameValue" placeholder="请输入项目名称" />
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
/**
 * Home view component | 首页视图组件
 * Entry point with project list and creation input
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NDropdown, NModal, NInput, NButton, useDialog } from 'naive-ui'
import { 
  AddOutline, 
  ImageOutline, 
  SendOutline,
  RefreshOutline,
  DocumentOutline,
  FolderOutline,
  EllipsisHorizontalOutline,
  CreateOutline,
  CopyOutline,
  SettingsOutline,
  TrashOutline
} from '@vicons/ionicons5'
import { 
  projects, 
  initProjectsStore, 
  createProject, 
  deleteProject, 
  duplicateProject, 
  renameProject 
} from '../stores/projects'
import { useApiConfig } from '../hooks/useApiConfig'
import ApiSettings from '../components/ApiSettings.vue'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const dialog = useDialog()
const apiConfig = useApiConfig()

// API Settings state | API 设置状态
const showApiSettings = ref(false)
const isApiConfigured = ref(apiConfig.isConfigured.value)

// Refresh API config state | 刷新 API 配置状态
const refreshApiConfig = () => {
  isApiConfigured.value = !!localStorage.getItem('apiKey')
}

// Video refs for hover play | 视频引用用于悬停播放
const videoRefs = new Map()

// Set video ref | 设置视频引用
const setVideoRef = (projectId, el) => {
  if (el) {
    videoRefs.set(projectId, el)
  } else {
    videoRefs.delete(projectId)
  }
}

// Handle thumbnail hover | 处理缩略图悬停
const handleThumbnailHover = (project, isHovering) => {
  if (!isVideoUrl(project.thumbnail)) return
  
  const video = videoRefs.get(project.id)
  if (!video) return
  
  if (isHovering) {
    video.play().catch(() => {
      // Ignore play errors (e.g., autoplay policy)
    })
  } else {
    video.pause()
    video.currentTime = 0 // Reset to start
  }
}

// Input state | 输入状态
const inputText = ref('')

// Rename modal state | 重命名弹窗状态
const showRenameModal = ref(false)
const renameValue = ref('')
const renameTargetId = ref(null)

// Suggestions tags | 建议标签
const suggestions = [
  '雨中魔法森林',
  '日式街面美食摄影',
  '瀑布水流飞溅',
  '雨天富声旁边花语'
]

// Format date | 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  
  // Less than 1 minute | 小于1分钟
  if (diff < 60000) return '刚刚'
  // Less than 1 hour | 小于1小时
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  // Less than 1 day | 小于1天
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  // Less than 7 days | 小于7天
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  // Format as date | 格式化为日期
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// Get project actions | 获取项目操作选项
const getProjectActions = (project) => [
  { label: '重命名', key: 'rename', icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  { label: '复制', key: 'duplicate', icon: () => h(NIcon, null, { default: () => h(CopyOutline) }) },
  { type: 'divider' },
  { label: '删除', key: 'delete', icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }
]

// Handle project action | 处理项目操作
const handleProjectAction = (key, project) => {
  switch (key) {
    case 'rename':
      renameTargetId.value = project.id
      renameValue.value = project.name
      showRenameModal.value = true
      break
    case 'duplicate':
      const newId = duplicateProject(project.id)
      if (newId) {
        window.$message?.success('项目已复制')
      }
      break
    case 'delete':
      dialog.warning({
        title: '删除项目',
        content: `确定要删除项目「${project.name}」吗？此操作不可恢复。`,
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: () => {
          deleteProject(project.id)
          window.$message?.success('项目已删除')
        }
      })
      break
  }
}

// Confirm rename | 确认重命名
const confirmRename = () => {
  if (renameTargetId.value && renameValue.value.trim()) {
    renameProject(renameTargetId.value, renameValue.value.trim())
    window.$message?.success('已重命名')
  }
  showRenameModal.value = false
  renameTargetId.value = null
  renameValue.value = ''
}

// Check API key before navigation | 跳转前检查 API Key
const checkApiKeyAndNavigate = (callback) => {
  
  if (!isApiConfigured.value) {
    dialog.warning({
      title: '未配置 API Key',
      content: '请先在设置中配置 API Key 才能使用画布功能。',
      positiveText: '知道了'
    })
    return false
  }
  callback()
  return true
}

// Create new project | 创建新项目
const createNewProject = () => {
  checkApiKeyAndNavigate(() => {
    const id = createProject('未命名项目')
    router.push(`/canvas/${id}`)
  })
}

// Create project with input text | 使用输入文本创建项目
const handleCreateWithInput = () => {
  checkApiKeyAndNavigate(() => {
    const name = inputText.value.trim() || '未命名项目'
    const id = createProject(name)
    // Store the input text to be used as initial prompt
    sessionStorage.setItem('ai-canvas-initial-prompt', inputText.value.trim())
    inputText.value = ''
    router.push(`/canvas/${id}`)
  })
}

// Open existing project | 打开已有项目
const openProject = (project) => {
  checkApiKeyAndNavigate(() => {
    router.push(`/canvas/${project.id}`)
  })
}

// Check if URL is a video | 检查 URL 是否为视频
const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
  return videoExtensions.some(ext => url.toLowerCase().includes(ext))
}

// Import h for render functions | 导入 h 用于渲染函数
import { h } from 'vue'

// Projects section ref | 项目区域引用
const projectsSection = ref(null)

// Scroll to projects section | 滚动到项目区域
const scrollToProjects = () => {
  if (projectsSection.value) {
    projectsSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Initialize projects store on mount | 挂载时初始化项目存储
onMounted(() => {
  initProjectsStore()
})
</script>
