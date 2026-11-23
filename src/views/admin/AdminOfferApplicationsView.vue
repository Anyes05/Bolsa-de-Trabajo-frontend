<script setup lang="ts">
import { ArrowLeft, MapPin, Paperclip, Phone } from 'lucide-vue-next'
import AdminShell from '../../components/admin/AdminShell.vue'

const applications = [
  {
    initials: 'CM',
    name: 'Carlos Méndez',
    location: 'Libertad',
    phone: '099 112 233',
    status: 'Contactado',
    profile: 'Perfil Transporte y Logística',
    description: 'Experiencia en reparto con camiones livianos y camionetas.',
    tags: ['Choferes', 'Reparto'],
  },
  {
    initials: 'RP',
    name: 'Roberto Pérez',
    location: 'San José de Mayo',
    phone: '098 445 566',
    status: 'Revisada',
    profile: 'Perfil Transporte y Logística',
    description: 'Reparto de mercadería en moto y camioneta familiar.',
    tags: ['Delivery'],
  },
  {
    initials: 'DM',
    name: 'Diego Martínez',
    location: 'Ecilda Paullier',
    phone: '091 778 899',
    status: 'Pendiente',
    profile: 'Perfil Auxiliar de Almacén',
    description: 'Experiencia en carga y descarga, disponibilidad horaria inmediata.',
    tags: ['Depósito'],
  },
]
</script>

<template>
  <AdminShell
    active="ofertas"
    title="Repartidor/a Zona San José — Postulaciones"
    subtitle="3 postulaciones recibidas para esta vacante"
  >
    <template #header-actions>
      <RouterLink class="admin-back-button" to="/admin/ofertas">
        <ArrowLeft :size="15" /> Volver
      </RouterLink>
    </template>

    <section class="applications-list">
      <article v-for="application in applications" :key="application.name" class="application-card">
        <header class="application-card__header applications-list__application-card-header">
          <span class="application-avatar">{{ application.initials }}</span>
          <div class="application-card__header-box">
            <h2 class="application-card__header-heading applications-list__application-card-header-application-card-header-heading">{{ application.name }}</h2>
            <p class="application-card__header-text applications-list__application-card-header-application-card-header-text">
              <MapPin :size="15" aria-hidden="true" /> {{ application.location }}
              <span class="application-phone applications-list__application-phone">
                <Phone :size="15" aria-hidden="true" /> {{ application.phone }}
              </span>
            </p>
          </div>
          <span class="application-status applications-list__application-status" :class="`application-status--${application.status.toLowerCase()}`">
            {{ application.status }}
            <small v-if="application.status === 'Contactado'"> ✓</small>
          </span>
        </header>
        <div class="application-card__body applications-list__application-card-body">
          <strong class="application-profile-title applications-list__application-profile-title">Perfil: {{ application.profile }}</strong>
          <p class="application-card__body-text applications-list__application-card-body-application-card-body-text">{{ application.description }}</p>
          <div class="application-tags applications-list__application-tags">
            <span v-for="tag in application.tags" :key="tag" class="application-tags__inline applications-list__application-tags-application-tags-inline">{{ tag }}</span>
          </div>
          <button class="application-cv-button applications-list__application-cv-button" type="button">
            <Paperclip :size="15" /> Ver CV Completo
          </button>
        </div>
      </article>
    </section>
  </AdminShell>
</template>
