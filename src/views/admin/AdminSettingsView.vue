<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Save } from 'lucide-vue-next'
import { ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'

const amount = ref('3.500')
const saved = ref(false)
const history = ref([
  { amount: '3.500', date: '12 de Ene, 2026', current: true },
  { amount: '3.000', date: '01 de Jul, 2025', current: false },
  { amount: '2.500', date: '05 de Ene, 2025', current: false },
])

function saveAmount() {
  saved.value = true
  history.value = [
    { amount: amount.value, date: '20 de Sep, 2026', current: true },
    ...history.value.map((entry) => ({ ...entry, current: false })),
  ]
}
</script>
<template>
  <AdminShell active="configuracion" title="Configuración de Cuota" subtitle="Monto mensual para socios del CCISJ">
    <div class="fee-settings">
      <section class="fee-panel fee-current">
        <div class="fee-current__intro"><h2>Monto de cuota vigente</h2><p>Definí el valor mensual de la cuota social. Este monto se aplicará automáticamente a todos los socios activos al momento de generar la facturación.</p></div>
        <div class="fee-current__control"><label class="fee-input"><span>$</span><input v-model="amount" aria-label="Monto de cuota vigente"></label><button class="fee-save" type="button" @click="saveAmount"><Save :size="16" /> Guardar Monto</button></div>
        <p class="fee-success"><CheckCircle2 :size="15" /> {{ saved ? 'Monto actualizado correctamente para el próximo período de facturación.' : 'Monto actualizado correctamente para el próximo período de facturación.' }}</p>
        <p class="fee-warning"><AlertTriangle :size="15" /> Nota: El cambio de cuota impactará a las nuevas facturas. Los históricos o saldos ya emitidos no sufrirán modificaciones automáticas.</p>
      </section>
      <section class="fee-panel fee-history"><h2>Historial de cambios</h2><div v-for="entry in history" :key="`${entry.amount}-${entry.date}`" class="fee-history__entry"><span>💰</span><div><strong>${{ entry.amount }} / mes</strong><small>Modificado por Admin CCISJ · {{ entry.date }}</small></div><b v-if="entry.current">Vigente</b></div></section>
    </div>
  </AdminShell>
</template>
