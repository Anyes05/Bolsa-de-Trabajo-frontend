<script setup lang="ts">
import {
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  CircleUserRound,
  LogOut,
  Menu,
  Megaphone,
  Settings,
  X,
} from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '../BrandLogo.vue'

withDefaults(defineProps<{
  title: string
  subtitle: string
  active: string
}>(), {
  title: 'Panel de administración',
  subtitle: 'Gestioná la plataforma CCISJ',
  active: 'dashboard',
})

const router = useRouter()
const open = ref(false)

const links = [
  { key: 'dashboard', label: 'Control de Caja', to: '/admin', icon: CircleDollarSign },
  { key: 'socios', label: 'Gestión de Empresas', to: '/admin/socios', icon: Building2 },
  { key: 'postulantes', label: 'Postulantes', to: '/admin/postulantes', icon: CircleUserRound },
  { key: 'ofertas', label: 'Ofertas Laborales', to: '/admin/ofertas', icon: BriefcaseBusiness },
  { key: 'configuracion', label: 'Config. Cuota', to: '/admin/configuracion', icon: Settings },
  { key: 'comunicados', label: 'Comunicados', to: '/admin/comunicados', icon: Megaphone },
]

function go(to: string) {
  open.value = false
  router.push(to)
}

function logout() {
  router.push({ name: 'access' })
}
</script>

<template>
  <div class="admin-shell">
    <div v-if="open" class="admin-shell__backdrop" @click="open = false" />
    <aside class="admin-sidebar" :class="{ 'admin-sidebar--open': open }">
      <div class="admin-sidebar__brand">
        <BrandLogo variant="white" />
        <button class="admin-sidebar__close" type="button" aria-label="Cerrar menú" @click="open = false">
          <X :size="18" />
        </button>
      </div>
      <p class="admin-sidebar__label">Administración</p>
      <nav class="admin-nav" aria-label="Navegación administrativa">
        <RouterLink
          v-for="link in links"
          :key="link.key"
          class="admin-nav__item"
          :class="{ 'admin-nav__item--active': active === link.key }"
          :to="link.to"
          @click="open = false"
        >
          <component :is="link.icon" :size="17" aria-hidden="true" />
          <span>{{ link.label }}</span>
        </RouterLink>
      </nav>
      <div class="admin-sidebar__footer">
        <span>© 2026 CCISJ</span>
        <span>San José, Uruguay</span>
      </div>
    </aside>

    <div class="admin-shell__content">
      <header class="admin-topbar">
        <button class="admin-menu-button" type="button" aria-label="Abrir menú" @click="open = true">
          <Menu :size="20" />
        </button>
        <div class="admin-breadcrumb">
          <span>CCISJ</span>
          <strong>/</strong>
          <b>{{ title }}</b>
        </div>
        <div class="admin-topbar__user">
          <div class="admin-topbar__identity">
            <strong>Administrador</strong>
            <span>ADMINISTRADOR</span>
          </div>
          <span class="admin-topbar__avatar">AD</span>
          <button class="admin-topbar__exit" type="button" aria-label="Cerrar sesión" @click="logout">
            <LogOut :size="17" />
          </button>
        </div>
      </header>
      <main class="admin-page">
        <header class="admin-page__heading">
          <div>
            <p class="admin-page__eyebrow">Panel administrativo</p>
            <h1>{{ title }}</h1>
            <p>{{ subtitle }}</p>
          </div>
          <slot name="header-actions" />
        </header>
        <slot />
      </main>
    </div>
  </div>
</template>
