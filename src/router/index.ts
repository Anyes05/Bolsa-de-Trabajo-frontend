import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AccessView from '../views/AccessView.vue'
import RegistrationView from '../views/RegistrationView.vue'
import SessionView from '../views/SessionView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'access',
      component: AccessView,
      meta: { guestOnly: true },
    },
    {
      path: '/registro',
      name: 'register',
      component: RegistrationView,
      meta: { guestOnly: true },
    },
    {
      path: '/sesion',
      name: 'session',
      component: SessionView,
      meta: { requiresAuth: true },
    },
    {
      path: '/socio/bolsa-empleo',
      name: 'socio-bolsa-empleo',
      component: () => import('../views/socio/SocioBolsaEmpleoView.vue'),
      meta: { requiresAuth: true, roles: ['SOCIO'] },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const allowedRoles = to.meta.roles as string[] | undefined

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'access' }
  }
  if (allowedRoles && auth.role && !allowedRoles.includes(auth.role)) {
    return { name: auth.homeRoute }
  }
  if (to.name === 'session' && auth.role === 'SOCIO') {
    return { name: 'socio-bolsa-empleo' }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: auth.homeRoute }
  }
  return true
})

export default router
