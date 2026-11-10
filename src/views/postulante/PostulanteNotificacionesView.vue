<script setup lang="ts">
import { Megaphone } from 'lucide-vue-next'
import { onMounted } from 'vue'
import AppButton from '../../components/AppButton.vue'
import PostulanteShell from '../../components/postulante/PostulanteShell.vue'
import { usePostulanteNotificationsStore } from '../../stores/postulanteNotifications'
import type { SocioNotificationRecord } from '../../services/socioNotificationService'
const notifications = usePostulanteNotificationsStore()

async function openOne(item: SocioNotificationRecord) {
  if (!item.leida) {
    await notifications.markOneRead(item.id)
  }
}

onMounted(() => {
  void notifications.load()
})
</script>

<template>
  <PostulanteShell
    title="Notificaciones"
    subtitle="Avisos de la Bolsa de Empleo"
    active-section="notificaciones"
  >
    <div class="postulante-notifications__actions">
      <AppButton variant="secondary" type="button" :disabled="notifications.loading || !notifications.unreadCount" @click="notifications.markAllRead()">
        Marcar todo como leído
      </AppButton>
    </div>
    <p v-if="notifications.loading" class="postulante-notifications__empty">Cargando notificaciones...</p>
    <p v-else-if="!notifications.items.length" class="postulante-notifications__empty">No tenés notificaciones por ahora.</p>
    <section v-else class="postulante-notifications" aria-label="Listado de notificaciones">
      <article
        v-for="item in notifications.items"
        :key="item.id"
        class="postulante-notification-card"
        :class="{ 'postulante-notification-card--unread': !item.leida }"
        role="button"
        tabindex="0"
        @click="openOne(item)"
        @keydown.enter.prevent="openOne(item)"
        @keydown.space.prevent="openOne(item)"
      >
        <span class="postulante-notification-card__icon" aria-hidden="true">
          <Megaphone :size="16" />
        </span>
        <div>
          <h2>{{ item.titulo }}</h2>
          <p>{{ item.cuerpo }}</p>
          <time>{{ item.createdAt ? new Date(item.createdAt).toLocaleString('es-UY') : '' }}</time>
        </div>
      </article>
    </section>
  </PostulanteShell>
</template>

<style scoped>
.postulante-notifications__actions { margin-bottom: 12px; }
.postulante-notifications__empty { color: #68737c; }
.postulante-notifications { display: grid; gap: 12px; }
.postulante-notification-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e4ebe6;
  cursor: pointer;
}
.postulante-notification-card--unread { border-color: #9fbfad; background: #f4faf6; }
.postulante-notification-card h2 { margin: 0 0 6px; font-size: 1rem; color: #16382b; }
.postulante-notification-card p {
  margin: 0 0 8px;
  white-space: pre-wrap;
  color: #4d5b55;
  font-size: 0.92rem;
}
.postulante-notification-card time { color: #7a8781; font-size: 0.82rem; }
.postulante-notification-card__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: #e7f2ec;
  color: #1f5a42;
}
</style>
