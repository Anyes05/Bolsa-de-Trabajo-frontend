<script setup lang="ts">
import { CheckCircle2, Eye, FileText, Send } from 'lucide-vue-next'
import { ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'

const title = ref('Nueva Convocatoria para Asamblea General Extraordinaria')
const message = ref('Estimados asociados, los convocamos a participar de la próxima Asamblea Extraordinaria a celebrarse en la sede central del CCIJS...')
const audience = ref('Todos los Socios')
const sent = ref(false)
const notices = [{ title: 'Lanzamiento de la Bolsa de Empleo Digital', audience: 'Todos', date: 'Publicado ayer' }]
</script>

<template>
  <AdminShell active="comunicados" title="Comunicados y Notificaciones" subtitle="Envío de avisos institucionales y boletines">
    <div class="communications-layout">
      <div class="communications-main">
        <section class="communication-editor">
          <h2>Redactar Comunicado</h2>
          <p class="communication-draft"><CheckCircle2 :size="14" /> Borrador guardado automáticamente. Listo para enviar.</p>
          <label>Título del Comunicado<input v-model="title"></label>
          <label>Mensaje<textarea v-model="message" rows="5" /></label>
          <fieldset><legend>Destinatarios</legend><div class="communication-audiences"><button type="button" :class="{ 'communication-audience--active': audience === 'Todos los Socios' }" @click="audience = 'Todos los Socios'">👥 Todos los Socios <small>245 socios activos</small></button><button type="button" :class="{ 'communication-audience--active': audience === 'Socios Directivos' }" @click="audience = 'Socios Directivos'">🏛 Socios Directivos <small>Comisión directiva (15)</small></button></div></fieldset>
          <button class="communication-send" type="button" @click="sent = true"><Send :size="15" /> {{ sent ? 'Comunicado enviado' : 'Enviar Comunicado' }}</button>
        </section>
        <section class="communication-previous"><h3>Comunicados anteriores</h3><div v-for="notice in notices" :key="notice.title"><span><FileText :size="15" /></span><p><strong>{{ notice.title }}</strong><small>{{ notice.date }} · Audiencia: {{ notice.audience }}</small></p><button type="button">Ver</button></div></section>
      </div>
      <aside class="communication-previews"><section class="preview-window"><header><i /><i /><i /><span>Panel del Socio (Vista Web)</span></header><div><h3>VISTA EN PORTAL DE SOCIOS</h3><article><strong>📢 {{ title }}</strong><small>Fecha: 12 de marzo, 19:00 hs</small><p>{{ message }}</p><b>Leer más →</b></article></div></section><section class="preview-window preview-email"><header><i /><i /><i /><span>Correo Electrónico Entrante</span></header><div><small>De: <b>CCISJ &lt;no-reply@ccisj.org.uy&gt;</b></small><small>Para: asociados@ccisj.org.uy</small><small>Asunto: CCISJ: {{ title }} - 12 de Marzo</small><article><strong>CENTRO COMERCIAL E INDUSTRIAL SAN JOSÉ</strong><h3>Convocatoria Asamblea General</h3><p>Trataremos el balance anual y las nuevas propuestas de capacitación digital para socios empresariales.</p><b>Ver en el Portal →</b><small>Artigas 532, San José de Mayo, Uruguay</small></article></div></section></aside>
    </div>
  </AdminShell>
</template>
