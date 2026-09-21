<script setup lang="ts">
import { ArrowLeft, CalendarDays, ChevronDown, DollarSign } from 'lucide-vue-next'
import AdminShell from '../../components/admin/AdminShell.vue'
</script>

<template>
  <AdminShell active="socios" title="Nueva Socio" subtitle="Registrar nueva firma en el padrón social">
    <template #header-actions><RouterLink class="admin-back-button" to="/admin/socios"><ArrowLeft :size="15" /> Volver</RouterLink></template>
    <section class="new-company-card">
      <header class="new-company-card__header"><h2>Ficha del Socio</h2><p>Completá los campos obligatorios para dar de alta un nuevo socio.</p></header>
      <form class="new-company-form" @submit.prevent>
        <label class="new-company-form__wide">Razón Social *<input value="Distribuidora Oriental de Alimentos S.A."></label>
        <label>BPS *<input value="12345678"></label>
        <label>Teléfono<input value="095 888 777"></label>
        <label class="new-company-form__wide">Email de contacto<input value="contacto@oriental.com.uy"></label>
        <label>Rubro *<span class="new-company-select">Alimentación <ChevronDown :size="15" /></span></label>
        <label>Monto de Cuota ($) *<span class="new-company-money"><DollarSign :size="14" /><input value="3.500"></span></label>
        <label>Estado Inicial *<span class="new-company-select">Al Día <ChevronDown :size="15" /></span></label>
        <label>Cuotas en Mora<input value="0"></label>
        <label class="new-company-form__wide">Fecha de Alta<span class="new-company-date"><input value="25/02/2026"><CalendarDays :size="15" /></span></label>
        <footer class="new-company-form__footer"><RouterLink class="new-company-cancel" to="/admin/socios">Cancelar</RouterLink><button class="new-company-submit" type="submit">Crear Socio</button></footer>
      </form>
    </section>
  </AdminShell>
</template>
