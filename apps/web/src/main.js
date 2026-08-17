import { createApp } from 'vue'
import { createPinia } from 'pinia'
import "@/styles/variables.scss"
import "@/styles/base.css"
import "@/styles/tailwind.css"
import "@/styles/index.scss"

import App from './App.vue'
import router from './router'
import SvgIcon from "@/components/common/SvgIcon/index.vue"

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.component("SvgIcon", SvgIcon)
app.mount('#app')
