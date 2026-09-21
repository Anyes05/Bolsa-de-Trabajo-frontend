<script setup lang="ts">
import { ArrowLeft, MapPin, Paperclip, UserRound } from 'lucide-vue-next'
import AdminShell from '../../components/admin/AdminShell.vue'

const applications = [
  { initials: 'CM', name: 'Carlos Méndez', location: 'Libertad', status: 'Contactado', profile: 'Perfil Transporte y Logística', description: 'Experiencia en reparto con camiones livianos y camionetas.', tags: ['Choferes', 'Reparto'] },
  { initials: 'RP', name: 'Roberto Pérez', location: 'San José de Mayo', status: 'Revisada', profile: 'Perfil Transporte y Logística', description: 'Reparto de mercadería en moto y camioneta familiar.', tags: ['Delivery'] },
  { initials: 'DM', name: 'Diego Martínez', location: 'Ecilda Paullier', status: 'Pendiente', profile: 'Perfil Auxiliar de Almacén', description: 'Experiencia en carga y descarga, disponibilidad horaria inmediata.', tags: ['Depósito'] },
]
</script>

<template>
  <AdminShell active="ofertas" title="Repartidor/a Zona San José — Postulaciones" subtitle="3 postulaciones recibidas para esta vacante">
    <template #header-actions><RouterLink class="admin-back-button" to="/admin/ofertas"><ArrowLeft :size="15" /> Volver</RouterLink></template>
    <section class="applications-list"><article v-for="application in applications" :key="application.name" class="application-card"><header class="application-card__header"><span class="application-avatar">{{ application.initials }}</span><div><h2>{{ application.name }}</h2><p><MapPin :size="11" /> {{ application.location }}</p></div><span class="application-status" :class="`application-status--${application.status.toLowerCase()}`">{{ application.status }}<small v-if="application.status === 'Contactado'"> ✓</small></span></header><div class="application-card__body"><strong class="application-profile-title">Perfil: {{ application.profile }}</strong><p>{{ application.description }}</p><div class="application-tags"><span v-for="tag in application.tags" :key="tag">{{ tag }}</span></div><button class="application-cv-button" type="button"><Paperclip :size="14" /> Ver CV Completo</button></div></article></section>
  </AdminShell>
</template>
