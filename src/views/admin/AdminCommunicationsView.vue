<script setup lang="ts">
import { CheckCircle2, Eye, FileText, Send, X } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import {
  comunicadoService,
  destinatarioLabel,
  type AudienciaCounts,
  type ComunicadoRecord,
} from '../../services/comunicadoService'
import { userFacingError } from '../../utils/userMessage'

const title = ref('')
const message = ref('')
const audience = ref<'SOCIOS' | 'SOLO_DIRECTIVOS'>('SOCIOS')
const asPopup = ref(false)
const busy = ref(false)
const loading = ref(true)
const error = ref('')
const success = ref('')
const selectedId = ref<number | null>(null)
const openedNotice = ref<ComunicadoRecord | null>(null)
const notices = ref<ComunicadoRecord[]>([])
const counts = ref<AudienciaCounts>({ sociosActivos: 0, sociosDirectivos: 0 })

const selectedNotice = computed(() => openedNotice.value
  ?? notices.value.find((item) => item.id === selectedId.value)
  ?? null)
const previewTitle = computed(() => (selectedNotice.value?.titulo || title.value || 'Título del comunicado').trim())
const previewMessage = computed(() => (selectedNotice.value?.contenido || message.value || 'El mensaje aparecerá aquí.').trim())
const previewAudience = computed(() => (
  selectedNotice.value
    ? destinatarioLabel(selectedNotice.value.destinatario)
    : audience.value === 'SOLO_DIRECTIVOS' ? 'Socios Directivos' : 'Todos los socios'
))
const previewDate = computed(() => {
  if (selectedNotice.value?.fechaPublicacion) {
    return new Date(selectedNotice.value.fechaPublicacion).toLocaleString('es-UY', {
      dateStyle: 'long',
      timeStyle: 'short',
    })
  }
  return new Date().toLocaleString('es-UY', { dateStyle: 'long', timeStyle: 'short' })
})

watch(openedNotice, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
})

onMounted(async () => {
  await refresh()
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const [list, audiencia] = await Promise.all([
      comunicadoService.list(),
      comunicadoService.audiencia(),
    ])
    notices.value = list
    counts.value = audiencia
  } catch (exception) {
    error.value = userFacingError(exception, 'cargar comunicados')
  } finally {
    loading.value = false
  }
}

async function send() {
  error.value = ''
  success.value = ''
  if (!title.value.trim() || !message.value.trim()) {
    error.value = 'Completá el título y el mensaje antes de enviar.'
    return
  }
  busy.value = true
  try {
    const created = await comunicadoService.publish({
      titulo: title.value.trim(),
      contenido: message.value.trim(),
      destinatario: audience.value,
      popup: asPopup.value,
    })
    notices.value = [created, ...notices.value]
    selectedId.value = created.id
    openedNotice.value = created
    title.value = ''
    message.value = ''
    asPopup.value = false
    const parts = [
      `Campana interna: ${created.destinatariosNotificados} socios`,
      `Gmail: ${created.correosEnviados} enviados`,
    ]
    if (created.popup) {
      parts.push('pop-up bloqueante activado')
    }
    if (created.correosFallidos > 0) {
      parts.push(`${created.correosFallidos} correos fallaron`)
    }
    if (created.sociosSinEmail > 0) {
      parts.push(`${created.sociosSinEmail} socios sin email de contacto`)
    }
    if (created.correosDestino?.length) {
      parts.push(`Destinos: ${created.correosDestino.join(', ')}`)
    }
    success.value = `Comunicado publicado. ${parts.join(' · ')}.`
    if (created.correosEnviados === 0) {
      error.value = created.sociosSinEmail > 0
        ? 'La campana se actualizó, pero no hay emails de contacto cargados en los socios de esa audiencia. Completá el mail de contacto en Gestión de Socios.'
        : 'La campana se actualizó, pero Gmail no pudo enviar ningún correo. Revisá SMTP o los emails de contacto.'
    }
    counts.value = await comunicadoService.audiencia()
  } catch (exception) {
    error.value = userFacingError(exception, 'enviar el comunicado')
  } finally {
    busy.value = false
  }
}

function viewNotice(notice: ComunicadoRecord) {
  selectedId.value = notice.id
  openedNotice.value = notice
  success.value = ''
  error.value = ''
}

function closeNotice() {
  openedNotice.value = null
}

function formatNoticeDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleString('es-UY', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}
</script>

<template>
  <AdminShell active="comunicados" title="Comunicados y Notificaciones" subtitle="Envío de avisos institucionales y boletines">
    <div class="communications-layout">
      <div class="communications-main">
        <section class="communication-editor">
          <h2 class="communication-editor__heading">Redactar Comunicado</h2>
          <p class="communication-draft">
            <CheckCircle2 :size="14" />
            Se envía a la vez por la campana interna y por Gmail al <strong>email de contacto</strong> del socio (si no hay, usa el email de cuenta).
          </p>
          <label class="communication-editor__label">Título del Comunicado
            <input v-model="title" class="communication-editor__input" maxlength="180" placeholder="Asunto del aviso institucional">
          </label>
          <label class="communication-editor__label">Mensaje
            <textarea v-model="message" class="communication-editor__textarea" rows="6" placeholder="Redactá el contenido del comunicado..." />
          </label>
          <fieldset class="communication-editor__fieldset">
            <legend class="communication-editor__legend">Destinatarios</legend>
            <div class="communication-audiences">
              <button
                class="communication-audiences__button"
                type="button"
                :class="{ 'communication-audience--active': audience === 'SOCIOS' }"
                @click="audience = 'SOCIOS'"
              >
                Todos los Socios
                <small class="communication-audiences__note">{{ counts.sociosActivos }} socios activos</small>
              </button>
              <button
                class="communication-audiences__button"
                type="button"
                :class="{ 'communication-audience--active': audience === 'SOLO_DIRECTIVOS' }"
                @click="audience = 'SOLO_DIRECTIVOS'"
              >
                Socios Directivos
                <small class="communication-audiences__note">Comisión directiva ({{ counts.sociosDirectivos }})</small>
              </button>
            </div>
          </fieldset>
          <label class="communication-popup-option communication-editor__label">
            <input v-model="asPopup" class="communication-editor__input communication-popup-option__input" type="checkbox">
            <span class="communication-popup-option__inline">
              <strong class="communication-popup-option__strong">Mostrar como ventana emergente</strong>
              <small class="communication-popup-option__note">Al ingresar, el socio verá un pop-up bloqueante hasta cerrarlo (además de la campana y el mail).</small>
            </span>
          </label>
          <AppAlert v-if="error">{{ error }}</AppAlert>
          <AppAlert v-if="success" tone="success">{{ success }}</AppAlert>
          <button class="communication-send" type="button" :disabled="busy || loading" @click="send">
            <Send :size="15" />
            {{ busy ? 'Enviando...' : 'Enviar Comunicado' }}
          </button>
        </section>

        <section class="communication-previous">
          <h3 class="communication-previous__subheading">Comunicados anteriores</h3>
          <p v-if="loading" class="communication-empty communication-previous__text">Cargando historial...</p>
          <p v-else-if="!notices.length" class="communication-empty communication-previous__text">Todavía no hay comunicados enviados.</p>
          <div
            v-for="notice in notices"
            :key="notice.id"
            class="communication-previous__row communication-previous__box"
            :class="{ 'communication-previous__row--active': selectedId === notice.id }"
          >
            <span class="communication-previous__inline"><FileText :size="15" /></span>
            <p class="communication-previous__text">
              <strong class="communication-previous__strong">{{ notice.titulo }}</strong>
              <small class="communication-previous__note">
                {{ formatNoticeDate(notice.fechaPublicacion) }}
                · Audiencia: {{ destinatarioLabel(notice.destinatario) }}
                <template v-if="notice.popup"> · Pop-up</template>
              </small>
            </p>
            <button type="button" class="communication-previous__view communication-previous__button" @click.stop="viewNotice(notice)">
              <Eye :size="14" /> Ver
            </button>
          </div>
        </section>
      </div>

      <aside class="communication-previews">
        <section class="preview-window">
          <header class="preview-window__header"><i class="preview-window__italic" /><i class="preview-window__italic" /><i class="preview-window__italic" /><span class="preview-window__inline">Panel del Socio (Vista Web)</span></header>
          <div class="preview-window__box">
            <h3 class="preview-window__subheading">VISTA EN CAMPANA / PORTAL</h3>
            <article class="preview-window__article">
              <strong class="preview-window__strong">📢 {{ previewTitle }}</strong>
              <small class="preview-window__note">Audiencia: {{ previewAudience }} · {{ previewDate }}</small>
              <p class="preview-window__text">{{ previewMessage }}</p>
              <b class="preview-window__bold">{{ asPopup || selectedNotice?.popup ? 'Pop-up bloqueante + campana' : 'Notificación interna' }}</b>
            </article>
          </div>
        </section>
        <section class="preview-window preview-email">
          <header class="preview-window__header"><i class="preview-window__italic" /><i class="preview-window__italic" /><i class="preview-window__italic" /><span class="preview-window__inline">Correo Electrónico Entrante</span></header>
          <div class="preview-email__box preview-window__box">
            <small class="preview-email__note">De: <b>CCISJ</b></small>
            <small class="preview-email__note">Para: {{ previewAudience }}</small>
            <small class="preview-email__note">Asunto: CCISJ: {{ previewTitle }}</small>
            <article class="preview-email__article preview-window__article">
              <strong class="preview-email__strong preview-window__strong">CENTRO COMERCIAL E INDUSTRIAL DE SAN JOSÉ</strong>
              <h3 class="preview-email__subheading preview-window__subheading">{{ previewTitle }}</h3>
              <p class="preview-window__text">{{ previewMessage }}</p>
              <b class="preview-email__bold preview-window__bold">También disponible en tu campana de notificaciones</b>
              <small class="preview-email__note preview-window__note">Artigas 532, San José de Mayo, Uruguay</small>
            </article>
          </div>
        </section>
      </aside>
    </div>

    <div
      v-if="openedNotice"
      class="notification-modal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`admin-comunicado-${openedNotice.id}`"
      @click.self="closeNotice"
      @keydown.esc.stop.prevent="closeNotice"
    >
      <section class="notification-modal__panel">
        <header class="notification-modal__header">
          <div>
            <p class="notification-modal__eyebrow">Comunicado enviado</p>
            <h2 :id="`admin-comunicado-${openedNotice.id}`" class="notification-modal__header-heading">{{ openedNotice.titulo }}</h2>
            <time class="notification-modal__header-time">{{ formatNoticeDate(openedNotice.fechaPublicacion) }}</time>
            <p class="communication-modal__meta">
              Audiencia: {{ destinatarioLabel(openedNotice.destinatario) }}
              <template v-if="openedNotice.popup"> · Pop-up bloqueante</template>
              <template v-if="openedNotice.autorEmail"> · Autor: {{ openedNotice.autorEmail }}</template>
            </p>
          </div>
          <button type="button" class="notification-modal__close" aria-label="Cerrar" @click="closeNotice">
            <X :size="18" />
          </button>
        </header>
        <div class="notification-modal__body">
          <p class="notification-modal__body-text">{{ openedNotice.contenido }}</p>
        </div>
        <footer class="notification-modal__footer communication-modal__footer">
          <div v-if="openedNotice.correosDestino?.length" class="communication-modal__emails">
            <strong class="communication-modal__emails-strong">Correos destino</strong>
            <span class="communication-modal__emails-inline">{{ openedNotice.correosDestino.join(', ') }}</span>
          </div>
          <button type="button" class="notification-modal__done" @click="closeNotice">Cerrar</button>
        </footer>
      </section>
    </div>
  </AdminShell>
</template>

<style scoped>
.communication-empty {
  margin: 0;
  color: var(--t-fg-68737c);
  font-size: 0.95rem;
}

.communication-send:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.communication-previous__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
}

.communication-previous__row--active {
  background: var(--t-bg-f3faf6);
}

.communication-previous__view {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--t-line-0a9d4d);
  border-radius: 8px;
  background: var(--t-bg-ffffff);
  color: var(--t-fg-078747);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
}

.communication-modal__meta {
  margin: 8px 0 0;
  color: var(--t-fg-556070);
  font-size: 0.9rem;
}

.communication-modal__footer {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
}

.communication-modal__emails {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1;
  color: var(--t-fg-556070);
  font-size: 0.85rem;
}

.communication-modal__emails-strong {
  color: var(--t-fg-1f2a24);
}

.communication-modal__emails-inline {
  overflow-wrap: anywhere;
}
</style>
