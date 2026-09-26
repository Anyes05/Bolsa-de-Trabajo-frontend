<script setup lang="ts">
import { CircleDollarSign, Megaphone, Sparkles, Wrench } from 'lucide-vue-next'
import AppButton from '../../components/AppButton.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import { mockCompany } from '../../data/mockSocioBolsa'
import type { NotificationKind } from '../../data/mockSocioNotificaciones'
import { useSocioNotificationsStore } from '../../stores/socioNotifications'

const notifications = useSocioNotificationsStore()

const icons: Record<NotificationKind, typeof Megaphone> = {
  asamblea: Megaphone,
  cuota: CircleDollarSign,
  bienvenida: Sparkles,
  mantenimiento: Wrench,
}
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
      <AppButton variant="secondary" type="button" @click="notifications.markAllRead()">
        Marcar todo como leído
      </AppButton>
    </template>

    <section class="socio-notifications" aria-label="Listado de notificaciones">
      <article
        v-for="item in notifications.items"
        :key="item.id"
        class="socio-notification-card"
        :class="{ 'socio-notification-card--unread': item.unread }"
      >
        <span class="socio-notification-card__icon" aria-hidden="true">
          <component :is="icons[item.kind]" :size="16" />
        </span>
        <div class="socio-notification-card__body">
          <header class="socio-notification-card__header">
            <h2>{{ item.title }}</h2>
            <span v-if="item.popup" class="socio-notification-card__badge">Popup</span>
          </header>
          <p>{{ item.body }}</p>
          <time>{{ item.date }}</time>
        </div>
        <span v-if="item.unread" class="socio-notification-card__dot" aria-label="No leida"></span>
      </article>
    </section>
  </SocioShell>
</template>
