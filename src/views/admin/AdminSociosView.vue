<script setup lang="ts">
import { Download, Pencil, Plus, Search } from 'lucide-vue-next'
import { ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'

type Company = [string, string, string, string, string, string, boolean]

const companies = ref<Company[]>([
  ['Distribuidora Fernández Hnos.', '#e101 · 099 123 456', '21234567', 'Distribución', 'Al Día', '12 Ene, 2024', true],
  ['Supermercado Don Carlos S.R.L.', '#e102 · 098 765 432', '31234567', 'Comercio', 'Al Día', '18 Mar, 2023', true],
  ['Mueblería La Estrella San José', '#e103 · 095 555 444', '41234567', 'Mueblería', 'Pendiente', '05 Nov, 2024', true],
  ['Taller Mecánico Rodríguez & Cía', '#e104 · 092 111 222', '51234567', 'Automotriz', 'Inactivo', '14 Jul, 2022', false],
  ['Ferretería El Martillo Uruguay', '#e105 · 091 999 888', '61234567', 'Ferretería', 'Al Día', '29 Ago, 2025', true],
  ['Panadería San José S.A.', '#e106 · 097 333 444', '71234567', 'Alimentación', 'Inactivo', '02 Oct, 2021', false],
])

function toggleActive(company: Company) {
  company[6] = !company[6]
  company[4] = company[6] ? 'Al Día' : 'Inactivo'
}
</script>

<template>
  <AdminShell active="socios" title="Gestion de Socios" subtitle="Listado general y altas del padron">
    <div class="company-actions"><button class="company-button company-button--outline" type="button"><Download :size="16" /> Descargar Excel</button><RouterLink class="company-button company-button--primary" to="/admin/socios/nueva"><Plus :size="16" /> Nuevo Socio</RouterLink></div>
    <section class="company-search-card"><label class="company-search"><Search :size="17" /><input placeholder="Buscar por razon social, RUT, BPS o rubro..."></label><span>6 de 10 socios listados</span></section>
    <section class="company-table-card"><div class="company-table-wrap"><table class="company-table"><thead><tr><th>Socio<br><small>BPS</small></th><th>Rubro</th><th>Cuota</th><th>Estado</th><th>Alta</th><th>Activo</th><th>Acciones</th></tr></thead><tbody><tr v-for="company in companies" :key="company[0]"><td class="company-table__name"><strong>{{ company[0] }}</strong><small>{{ company[1] }}</small></td><td>{{ company[3] }}</td><td class="company-table__fee">$3.500</td><td><span class="cash-status" :class="`cash-status--${company[4] === 'Al Día' ? 'green' : company[4] === 'Pendiente' ? 'orange' : 'red'}`"><i />{{ company[4] }}</span></td><td>{{ company[5] }}</td><td><button class="company-toggle" :class="{ 'company-toggle--on': company[6] }" type="button" :aria-label="company[6] ? 'Pasar socio a inactivo' : 'Quitar inactividad del socio'" @click="toggleActive(company)"><i /></button></td><td><button class="company-edit" type="button"><Pencil :size="12" /> Editar</button></td></tr></tbody></table></div></section>
  </AdminShell>
</template>
