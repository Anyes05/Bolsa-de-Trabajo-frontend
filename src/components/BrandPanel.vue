<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import BrandLogo from './BrandLogo.vue'

const benefits = [
  'Control de Caja y Cobranza',
  'Bolsa de Empleo Digital',
  'Gestión de Ofertas Laborales',
  'Comunicados Institucionales',
]
</script>

<template>
  <aside class="brand-panel">
    <BrandLogo variant="white" />
    <div class="brand-panel__copy">
      <h1>Sistema de Gestión<br>Integrado</h1>
      <p>Accede a los servicios digitales del Centro Comercial e Industrial de San José de forma segura y centralizada.</p>
    </div>
    <ul class="brand-panel__benefits">
      <li v-for="benefit in benefits" :key="benefit">
        <Check :size="13" aria-hidden="true" />{{ benefit }}
      </li>
    </ul>
    <small class="brand-panel__footer">© 2026 CCISJ · San José, Uruguay</small>
  </aside>
</template>
