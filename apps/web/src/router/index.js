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
    meta: { title: "创作画布" },
  },
  {
    path: "/settings",
    name: "Settings",
    component: () => import("@/views/settings/index.vue"),
    meta: { title: "设置" },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  document.title = to.meta?.title
    ? `${to.meta.title} · ChatFire Canvas`
    : "ChatFire Canvas"
  next()
})

export default router
