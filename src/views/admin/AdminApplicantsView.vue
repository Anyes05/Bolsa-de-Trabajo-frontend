<script setup lang="ts">
import { ChevronDown, ChevronUp, Download, Eye, MapPin, Search } from 'lucide-vue-next'
import { ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'

type ApplicantCv = { id: string; title: string; tags: string[]; schedule: string; active: string; visible: boolean }
type Applicant = { initials: string; name: string; document: string; phone: string; location: string; cvs: ApplicantCv[] }

const applicants: Applicant[] = [
  { initials: 'MG', name: 'María González', document: '4.892.341-2', phone: '099 876 543', location: 'San José de Mayo', cvs: [{ id: 'cv-mg-ventas', title: 'Perfil Ventas & Atención al Cliente', tags: ['Ventas', 'Recepción'], schedule: 'Full-time', active: '15/03/2026', visible: true }, { id: 'cv-mg-admin', title: 'Perfil Administrativo', tags: ['Administración'], schedule: 'Part-time', active: '10/03/2026', visible: true }] },
  { initials: 'CM', name: 'Carlos Méndez', document: '3.421.908-4', phone: '098 123 456', location: 'Libertad', cvs: [{ id: 'cv-cm-logistica', title: 'Perfil Transporte y Logística', tags: ['Choferes', 'Repartidores'], schedule: 'Full-time · Con vehículo propio', active: '', visible: true }] },
  { initials: 'LS', name: 'Laura Sosa', document: '5.120.443-1', phone: '094 321 098', location: 'Ciudad del Plata', cvs: [{ id: 'cv-ls-admin', title: 'Perfil Administración', tags: ['Administración'], schedule: 'Full-time', active: '08/03/2026', visible: true }, { id: 'cv-ls-atencion', title: 'Perfil Atención al Cliente', tags: ['Atención'], schedule: 'Part-time', active: '06/03/2026', visible: true }, { id: 'cv-ls-ventas', title: 'Perfil Ventas', tags: ['Ventas'], schedule: 'Full-time', active: '01/03/2026', visible: true }] },
  { initials: 'AF', name: 'Ana Ferraro', document: '4.567.890-9', phone: '099 222 333', location: 'Ecilda Paullier', cvs: [{ id: 'cv-af-comunicacion', title: 'Perfil Comunicación', tags: ['Comunicaciones'], schedule: 'Part-time', active: '25/02/2026', visible: true }] },
]

const expanded = ref(new Set(['MG', 'CM']))

function toggleApplicant(initials: string) {
  const next = new Set(expanded.value)
  if (next.has(initials)) next.delete(initials)
  else next.add(initials)
  expanded.value = next
}
</script>

<template>
  <AdminShell active="postulantes" title="Postulantes Registrados" subtitle="6 postulantes · 10 perfiles totales">
    <div class="applicant-toolbar"><label class="applicant-search"><Search :size="17" /><input placeholder="Buscar por nombre o cédula..."></label><button class="applicant-download" type="button"><Download :size="16" /> Descargar Excel</button></div>
    <section class="applicant-list"><article v-for="applicant in applicants" :key="applicant.initials" class="applicant-card"><button class="applicant-card__header" type="button" @click="toggleApplicant(applicant.initials)"><span class="applicant-avatar">{{ applicant.initials }}</span><span class="applicant-identity"><strong>{{ applicant.name }}</strong><small>CI: {{ applicant.document }} · Tel: {{ applicant.phone }} · <MapPin :size="11" /> {{ applicant.location }}</small></span><span class="applicant-count">{{ applicant.cvs.length }} {{ applicant.cvs.length === 1 ? 'CV' : 'CVs' }}</span><component :is="expanded.has(applicant.initials) ? ChevronUp : ChevronDown" :size="17" /></button><div v-if="expanded.has(applicant.initials)" class="applicant-profiles"><div v-for="cv in applicant.cvs" :key="cv.id" class="applicant-profile"><div class="applicant-profile__top"><strong>{{ cv.title }}</strong><button v-if="cv.visible" class="applicant-cv-link" type="button"><Eye :size="11" /> Ver CV</button><span v-else class="applicant-cv-hidden">No visible</span></div><div class="applicant-tags"><span v-for="tag in cv.tags" :key="tag">{{ tag }}</span></div><small>Jornada: {{ cv.schedule }}<template v-if="cv.active"> · 📅 Activo: {{ cv.active }}</template></small></div></div></article></section>
  </AdminShell>
</template>
