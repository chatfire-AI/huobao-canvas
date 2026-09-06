import { createRouter, createWebHistory } from "vue-router"

const routes = [
  {
    path: "/",
    redirect: "/canvas",
  },
  {
    path: "/canvas",
    name: "Canvas",
    component: () => import("@/views/canvas/index.vue"),
  },
  {
    path: "/settings",
    name: "Settings",
    component: () => import("@/views/settings/index.vue"),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  // 标签页标题恒定「火宝画布」——切页不改为「设置 · 火宝画布」这类形式，
  // 避免浏览器标签截断后产品名不可见
  document.title = "火宝画布"
  next()
})

export default router
