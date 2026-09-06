import { createApp } from 'vue'
import { createPinia } from 'pinia'
import "@/styles/variables.scss"
import "@/styles/base.css"
import "@/styles/tailwind.css"
import "@/styles/index.scss"

import App from './App.vue'
import router from './router'
import i18n from './locales'
import SvgIcon from "@/components/common/SvgIcon/index.vue"

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.component("SvgIcon", SvgIcon)
app.mount('#app')
