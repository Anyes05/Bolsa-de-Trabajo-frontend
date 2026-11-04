<script setup lang="ts">
import { CheckCircle2, Eye, FileText, Send } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
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
const busy = ref(false)
const loading = ref(true)
const error = ref('')
const success = ref('')
const selectedId = ref<number | null>(null)
const notices = ref<ComunicadoRecord[]>([])
const counts = ref<AudienciaCounts>({ sociosActivos: 0, sociosDirectivos: 0 })

const selectedNotice = computed(() => notices.value.find((item) => item.id === selectedId.value) ?? null)
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

onMounted(async () => {
  await refresh()
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
    })
    notices.value = [created, ...notices.value]
    selectedId.value = created.id
    title.value = ''
    message.value = ''
    const fallidos = created.correosFallidos > 0
      ? ` (${created.correosFallidos} correos no se pudieron enviar)`
      : ''
    success.value = `Comunicado enviado a ${created.destinatariosNotificados} socios por campana y ${created.correosEnviados} por correo${fallidos}.`
    counts.value = await comunicadoService.audiencia()
  } catch (exception) {
    error.value = userFacingError(exception, 'enviar el comunicado')
  } finally {
    busy.value = false
  }
}

function viewNotice(notice: ComunicadoRecord) {
  selectedId.value = notice.id
  success.value = ''
}
</script>

<template>
  <AdminShell active="comunicados" title="Comunicados y Notificaciones" subtitle="Envío de avisos institucionales y boletines">
    <div class="communications-layout">
      <div class="communications-main">
        <section class="communication-editor">
          <h2>Redactar Comunicado</h2>
          <p class="communication-draft">
            <CheckCircle2 :size="14" />
            Se envía a la vez por la campana interna y por correo electrónico (Gmail).
          </p>
          <label>Título del Comunicado
            <input v-model="title" maxlength="180" placeholder="Asunto del aviso institucional">
          </label>
          <label>Mensaje
            <textarea v-model="message" rows="6" placeholder="Redactá el contenido del comunicado..." />
          </label>
          <fieldset>
            <legend>Destinatarios</legend>
            <div class="communication-audiences">
              <button
                type="button"
                :class="{ 'communication-audience--active': audience === 'SOCIOS' }"
                @click="audience = 'SOCIOS'"
              >
                Todos los Socios
                <small>{{ counts.sociosActivos }} socios activos</small>
              </button>
              <button
                type="button"
                :class="{ 'communication-audience--active': audience === 'SOLO_DIRECTIVOS' }"
                @click="audience = 'SOLO_DIRECTIVOS'"
              >
                Socios Directivos
                <small>Comisión directiva ({{ counts.sociosDirectivos }})</small>
              </button>
            </div>
          </fieldset>
          <AppAlert v-if="error">{{ error }}</AppAlert>
          <AppAlert v-if="success" tone="success">{{ success }}</AppAlert>
          <button class="communication-send" type="button" :disabled="busy || loading" @click="send">
            <Send :size="15" />
            {{ busy ? 'Enviando...' : 'Enviar Comunicado' }}
          </button>
        </section>

        <section class="communication-previous">
          <h3>Comunicados anteriores</h3>
          <p v-if="loading" class="communication-empty">Cargando historial...</p>
          <p v-else-if="!notices.length" class="communication-empty">Todavía no hay comunicados enviados.</p>
          <div v-for="notice in notices" :key="notice.id">
            <span><FileText :size="15" /></span>
            <p>
              <strong>{{ notice.titulo }}</strong>
              <small>
                {{ notice.fechaPublicacion
                  ? new Date(notice.fechaPublicacion).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Sin fecha' }}
                · Audiencia: {{ destinatarioLabel(notice.destinatario) }}
              </small>
            </p>
            <button type="button" @click="viewNotice(notice)"><Eye :size="14" /> Ver</button>
          </div>
        </section>
      </div>

      <aside class="communication-previews">
        <section class="preview-window">
          <header><i /><i /><i /><span>Panel del Socio (Vista Web)</span></header>
          <div>
            <h3>VISTA EN CAMPANA / PORTAL</h3>
            <article>
              <strong>📢 {{ previewTitle }}</strong>
              <small>Audiencia: {{ previewAudience }} · {{ previewDate }}</small>
              <p>{{ previewMessage }}</p>
              <b>Notificación interna</b>
            </article>
          </div>
        </section>
        <section class="preview-window preview-email">
          <header><i /><i /><i /><span>Correo Electrónico Entrante</span></header>
          <div>
            <small>De: <b>CCISJ</b></small>
            <small>Para: {{ previewAudience }}</small>
            <small>Asunto: CCISJ: {{ previewTitle }}</small>
            <article>
              <strong>CENTRO COMERCIAL E INDUSTRIAL DE SAN JOSÉ</strong>
              <h3>{{ previewTitle }}</h3>
              <p>{{ previewMessage }}</p>
              <b>También disponible en tu campana de notificaciones</b>
              <small>Artigas 532, San José de Mayo, Uruguay</small>
            </article>
          </div>
        </section>
      </aside>
    </div>
  </AdminShell>
</template>

<style scoped>
.communication-empty {
  margin: 0;
  color: #68737c;
  font-size: 0.95rem;
}

.communication-send:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
