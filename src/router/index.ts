import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AccessView from '../views/AccessView.vue'
import RegistrationView from '../views/RegistrationView.vue'
import SessionView from '../views/SessionView.vue'

//temporal
import AdminDashboardView from '../views/admin/AdminDashboardView.vue'
import AdminSociosView from '../views/admin/AdminSociosView.vue'
import AdminApplicantsView from '../views/admin/AdminApplicantsView.vue'
import AdminOffersView from '../views/admin/AdminOffersView.vue'
import AdminSettingsView from '../views/admin/AdminSettingsView.vue'
import AdminCommunicationsView from '../views/admin/AdminCommunicationsView.vue'
import AdminNewCompanyView from '../views/admin/AdminNewCompanyView.vue'
import AdminOfferApplicationsView from '../views/admin/AdminOfferApplicationsView.vue'

//end

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
      path: '/admin',
      name: 'admin-dashboard',
      component: AdminDashboardView,
    },
    {
      path: '/admin/socios',
      name: 'admin-socios',
      component: AdminSociosView,
    },
    {
      path: '/admin/socios/nueva',
      name: 'admin-new-company',
      component: AdminNewCompanyView,
    },
    {
      path: '/admin/postulantes',
      name: 'admin-applicants',
      component: AdminApplicantsView,
    },
    {
      path: '/admin/ofertas',
      name: 'admin-offers',
      component: AdminOffersView,
    },
    {
      path: '/admin/ofertas/:offerId/postulaciones',
      name: 'admin-offer-applications',
      component: AdminOfferApplicationsView,
    },
    {
      path: '/admin/configuracion',
      name: 'admin-settings',
      component: AdminSettingsView,
    },
    {
      path: '/admin/comunicados',
      name: 'admin-communications',
      component: AdminCommunicationsView,
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

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'access' }
  }
  if (allowedRoles && auth.role && !allowedRoles.includes(auth.role)) {
    return { name: auth.homeRoute }
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
