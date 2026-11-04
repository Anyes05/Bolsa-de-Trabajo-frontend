<script setup lang="ts">
import { Megaphone } from 'lucide-vue-next'
import { onMounted } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import { mockCompany } from '../../data/mockSocioBolsa'
import { useSocioNotificationsStore } from '../../stores/socioNotifications'

const notifications = useSocioNotificationsStore()

onMounted(() => {
  void notifications.load()
})
</script>

<template>
  <SocioShell
    active-nav="notificaciones"
    title="Notificaciones"
    subtitle="Novedades y alertas del CCISJ"
    :company-name="mockCompany.name"
    :company-initials="mockCompany.initials"
    :company-role="mockCompany.roleLabel"
  >
    <template #header-actions>
      <AppButton variant="secondary" type="button" :disabled="!notifications.unreadCount" @click="notifications.markAllRead()">
        Marcar todo como leído
      </AppButton>
    </template>

    <AppAlert v-if="notifications.error">{{ notifications.error }}</AppAlert>
    <p v-if="notifications.loading" class="socio-notifications__empty">Cargando notificaciones...</p>
    <p v-else-if="!notifications.items.length" class="socio-notifications__empty">No tenés notificaciones por ahora.</p>

    <section v-else class="socio-notifications" aria-label="Listado de notificaciones">
      <article
        v-for="item in notifications.items"
        :key="item.id"
        class="socio-notification-card"
        :class="{ 'socio-notification-card--unread': item.unread }"
      >
        <span class="socio-notification-card__icon" aria-hidden="true">
          <Megaphone :size="16" />
        </span>
        <div class="socio-notification-card__body">
          <header class="socio-notification-card__header">
            <h2>{{ item.title }}</h2>
          </header>
          <p>{{ item.body }}</p>
          <time>{{ item.date }}</time>
        </div>
        <span v-if="item.unread" class="socio-notification-card__dot" aria-label="No leída"></span>
      </article>
    </section>
  </SocioShell>
</template>

<style scoped>
.socio-notifications__empty {
  margin: 12px 0;
  color: #68737c;
  font-size: 0.95rem;
}
</style>
