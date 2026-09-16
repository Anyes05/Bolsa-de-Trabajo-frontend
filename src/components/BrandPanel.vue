<script setup lang="ts">
import { Check, CircleHelp } from 'lucide-vue-next'
const benefits = ['Control de Caja y Cobranza', 'Bolsa de Empleo Digital', 'Gestion de Ofertas Laborales', 'Comunicados Institucionales']
</script>
<template>
  <aside class="brand-panel"><div class="brand-panel__logo"><span class="brand-panel__mark"><CircleHelp :size="19" /></span><b>CENTRO COMERCIAL<br>E INDUSTRIAL<br>DE SAN JOSE</b></div><div class="brand-panel__copy"><h1>Sistema de Gestion<br>Integrado</h1><p>Accede a los servicios digitales del Centro Comercial e Industrial de San Jose de forma segura y centralizada.</p></div><ul class="brand-panel__benefits"><li v-for="benefit in benefits" :key="benefit"><Check :size="13" />{{ benefit }}</li></ul><small class="brand-panel__footer">© 2026 CCISJ · San Jose, Uruguay</small></aside>
</template>