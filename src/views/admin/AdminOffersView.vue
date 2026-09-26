<script setup lang="ts">
import { Pencil, Play, Square, UsersRound, X } from 'lucide-vue-next'
import { ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'

const offers = [
  { title: 'Repartidor/a Zona San José', status: 'Activa', company: 'Distribuidora Fernández', category: 'Distribución', location: 'San José de Mayo', schedule: 'Full-time', salary: '$28.000–$32.000', description: 'Buscamos personal dinámico para reparto en la zona de San José de Mayo. Se valorará contar con libreta de conducir categoría A vigente.', applications: 3 },
  { title: 'Administrativo/a Contable', status: 'Activa', company: 'Supermercado Don Carlos', category: 'Comercio', location: 'Libertad', schedule: 'Full-time', salary: '$35.000–$40.000', description: 'Para integrarse a equipo contable. Se requiere experiencia previa en conciliación de cuentas y manejo de Excel.', applications: 1 },
  { title: 'Vendedor/a Mostrador', status: 'Pausada', company: 'Distribuidora Fernández', category: 'Ventas', location: 'San José de Mayo', schedule: 'Part-time', salary: '$18.000–$22.000', description: 'Atención directa a clientes en mostrador y gestión de pedidos telefónicos.', applications: 0 },
  { title: 'Repositor/a de Góndola', status: 'Cerrada', company: 'Supermercado Don Carlos', category: 'Comercio', location: 'Libertad', schedule: 'Full-time', salary: '$25.000', description: 'Reposición de mercadería, control de vencimiento y mantenimiento del orden en góndola. Vacante completada.', applications: 0 },
]

const showPublishModal = ref(false)
</script>

<template>
  <AdminShell active="ofertas" title="Gestión de Ofertas Laborales" subtitle="Publicación y control de vacantes">
    <div class="offers-heading"><h2>Lista de Ofertas</h2><button class="offers-publish" type="button" @click="showPublishModal = true">+ Publicar Oferta</button></div>
    <section class="offers-list"><article v-for="(offer, index) in offers" :key="offer.title" class="offer-card"><div class="offer-card__content"><header class="offer-card__title"><h3>{{ offer.title }}</h3><span class="offer-status" :class="`offer-status--${offer.status.toLowerCase()}`">{{ offer.status }}</span><small>Publicado por: {{ offer.company }}</small></header><div class="offer-card__meta"><span>⚑ {{ offer.category }}</span><span>📍 {{ offer.location }}</span><span>⏰ {{ offer.schedule }}</span><span>💰 {{ offer.salary }}</span></div><p>{{ offer.description }}</p><RouterLink class="offer-applications" :to="`/admin/ofertas/${index + 1}/postulaciones`"><UsersRound :size="14" /> {{ offer.applications }} {{ offer.applications === 1 ? 'postulación' : 'postulaciones' }} →</RouterLink><small v-if="offer.status === 'Cerrada'" class="offer-closed">Cerrada el 01/02/2026</small></div><aside class="offer-card__actions"><button v-if="offer.status !== 'Cerrada'" class="offer-edit" type="button"><Pencil :size="13" /> Editar</button><button v-if="offer.status === 'Activa'" class="offer-action" type="button"><Square :size="12" /> Pausar</button><button v-else-if="offer.status === 'Pausada'" class="offer-action offer-action--green" type="button"><Play :size="12" /> Reanudar</button><button v-if="offer.status !== 'Cerrada'" class="offer-close" type="button"><X :size="13" /> Cerrar</button><button v-else class="offer-history" type="button">Ver Historial</button></aside></article></section>
    <div v-if="showPublishModal" class="publish-modal-layer" @click.self="showPublishModal = false">
      <section class="publish-modal" role="dialog" aria-modal="true" aria-labelledby="publish-modal-title">
        <header class="publish-modal__header"><h2 id="publish-modal-title">Publicar Oferta Laboral</h2><button type="button" aria-label="Cerrar" @click="showPublishModal = false"><X :size="19" /></button></header>
        <form class="publish-form" @submit.prevent="showPublishModal = false">
          <label class="publish-form__wide">Título del Puesto<input placeholder="Ej: Administrativo de Ventas"></label>
          <label>Rubro<span class="publish-select">Seleccionar rubro <span>⌄</span></span></label>
          <label>Zona<span class="publish-select">San José de Mayo <span>⌄</span></span></label>
          <label>Modalidad<span class="publish-select">Full-time <span>⌄</span></span></label>
          <label>Rango salarial (Opcional)<input placeholder="Ej: $25.000 - $30.000"></label>
          <label class="publish-form__wide">Descripción<textarea rows="4" placeholder="Describe las tareas del puesto y lo que ofrece el socio..."></textarea></label>
          <label class="publish-form__wide">Requisitos<textarea rows="3" placeholder="Formación académica, experiencia previa, libreta de conducir, etc..."></textarea></label>
          <footer class="publish-form__footer"><button class="publish-cancel" type="button" @click="showPublishModal = false">Cancelar</button><button class="publish-confirm" type="submit">Publicar Oferta</button></footer>
        </form>
      </section>
    </div>
  </AdminShell>
</template>
