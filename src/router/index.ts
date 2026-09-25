import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AccessView from '../views/AccessView.vue'
import RegistrationView from '../views/RegistrationView.vue'
import SessionView from '../views/SessionView.vue'

import AdminDashboardView from '../views/admin/AdminDashboardView.vue'
import AdminSociosView from '../views/admin/AdminSociosView.vue'
import AdminApplicantsView from '../views/admin/AdminApplicantsView.vue'
import AdminOffersView from '../views/admin/AdminOffersView.vue'
import AdminSettingsView from '../views/admin/AdminSettingsView.vue'
import AdminCommunicationsView from '../views/admin/AdminCommunicationsView.vue'
import AdminNewCompanyView from '../views/admin/AdminNewCompanyView.vue'
import AdminOfferApplicationsView from '../views/admin/AdminOfferApplicationsView.vue'

function normalizeRole(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase()
}

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
      path: '/socio/mis-ofertas',
      name: 'socio-mis-ofertas',
      component: () => import('../views/socio/SocioMisOfertasView.vue'),
      meta: { requiresAuth: true, roles: ['SOCIO'] },
    },
    {
      path: '/socio/mis-ofertas/:offerId/postulaciones',
      name: 'socio-oferta-postulaciones',
      component: () => import('../views/socio/SocioOfertaPostulacionesView.vue'),
      meta: { requiresAuth: true, roles: ['SOCIO'] },
    },
    {
      path: '/socio/directorio',
      name: 'socio-directorio',
      component: () => import('../views/socio/SocioDirectorioView.vue'),
      meta: { requiresAuth: true, roles: ['SOCIO'], requiresDirectivo: true },
    },
    {
      path: '/socio/notificaciones',
      name: 'socio-notificaciones',
      component: () => import('../views/socio/SocioNotificacionesView.vue'),
      meta: { requiresAuth: true, roles: ['SOCIO'] },
    },
    {
      path: '/socio/perfil',
      name: 'socio-perfil',
      component: () => import('../views/socio/SocioPerfilView.vue'),
      meta: { requiresAuth: true, roles: ['SOCIO'] },
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: AdminDashboardView,
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/admin/socios',
      name: 'admin-socios',
      component: AdminSociosView,
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/admin/socios/nueva',
      name: 'admin-new-company',
      component: AdminNewCompanyView,
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/admin/postulantes',
      name: 'admin-applicants',
      component: AdminApplicantsView,
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/admin/ofertas',
      name: 'admin-offers',
      component: AdminOffersView,
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/admin/ofertas/:offerId/postulaciones',
      name: 'admin-offer-applications',
      component: AdminOfferApplicationsView,
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/admin/configuracion',
      name: 'admin-settings',
      component: AdminSettingsView,
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/admin/comunicados',
      name: 'admin-communications',
      component: AdminCommunicationsView,
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
        {
      path: '/postulante/ofertas-empleo',
      name: 'postulante-bolsa-empleo',
      component: () => import('../views/postulante/PostulanteOfertasView.vue'),
      meta: { requiresAuth: true, roles: ['POSTULANTE'] },
    },
    {
      path: '/postulante/mis-perfiles',
      name: 'postulante-mis-perfiles',
      component: () => import('../views/postulante/PostulantePerfilesView.vue'),
      meta: { requiresAuth: true, roles: ['POSTULANTE'] },
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
  const currentRole = normalizeRole(auth.role)
  const normalizedAllowedRoles = (allowedRoles ?? []).map((role) => role.trim().toUpperCase())

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'access' }
  }
  if (allowedRoles && currentRole && !normalizedAllowedRoles.includes(currentRole)) {
    return { name: auth.homeRoute }
  }
  if (to.meta.requiresDirectivo && !auth.isDirectivo) {
    return { name: 'socio-bolsa-empleo' }
  }
  if (to.name === 'session' && auth.isAuthenticated) {
    return { name: auth.homeRoute }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: auth.homeRoute }
  }
  return true
})

export default router
