<script setup lang="ts">
import { RouterLink } from 'vue-router'
import BrandLogo from '../components/BrandLogo.vue'
</script>

<template>
  <main class="terms">
    <header class="terms__header">
      <BrandLogo />
      <p class="terms__back"><RouterLink class="terms__link" to="/">Volver al ingreso</RouterLink></p>
      <h1 class="terms__title">Términos y condiciones</h1>
      <p class="terms__lead">Bolsa de Empleo Digital del Centro Comercial e Industrial de San José (CCISJ).</p>
    </header>

    <section class="terms__section">
      <h2 class="terms__heading">1. Quién opera el sistema</h2>
      <p class="terms__text">
        El sistema es operado por el CCISJ para gestionar socios, caja, postulantes y ofertas de empleo.
        El uso implica aceptar estas condiciones.
      </p>
    </section>
    

    <section class="terms__section">
      <h2 class="terms__heading">2. Cuentas</h2>
      <ul class="terms__list">
        <li class="terms__item">El postulante es responsable de la veracidad de sus datos, cédula y CV.</li>
        <li class="terms__item">El socio usa la cuenta habilitada por la administración. Una clave provisional vence a las 24 horas.</li>
        <li class="terms__item">El administrador gestiona padrones, caja y habilitación de acceso.</li>
        <li class="terms__item">Una cuenta dada de baja no puede ingresar. Un socio moroso sí puede usar el sistema.</li>
      </ul>
    </section>

    <section class="terms__section">
      <h2 class="terms__heading">3. Datos personales</h2>
      <p class="terms__text">
        Se tratan cédulas, correos, teléfonos, CV, fotos y datos de caja con la finalidad de operar la bolsa y la
        administración del centro. El socio solo ve el CV asociado a una postulación a su oferta, no todos los CV del perfil.
      </p>
    </section>

    <section class="terms__section">
      <h2 class="terms__heading">4. Contenido y archivos</h2>
      <p class="terms__text">
        Está prohibido subir archivos que no sean el CV o la foto declarados, o contenido ilícito.
        El sistema verifica el tipo real del archivo (no solo la extensión).
      </p>
    </section>

    <section class="terms__section">
      <h2 class="terms__heading">5. Comunicaciones</h2>
      <p class="terms__text">
        El CCISJ y las empresas socias pueden enviar avisos relacionados con postulaciones, aniversarios y permanencia.
        El postulante puede pausar su visibilidad en la bolsa.
      </p>
    </section>

    <section class="terms__section">
      <h2 class="terms__heading">6. Limitación</h2>
      <p class="terms__text">
        El sistema facilita el contacto entre empresas y postulantes. No constituye una oferta de empleo ni una
        contratación por parte del CCISJ.
      </p>
    </section>
  </main>
</template>

<style scoped>
.terms {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 20px 64px;
  color: var(--t-fg-24352b);
  line-height: 1.6;
}
.terms__header { margin: 0; }
.terms__back { margin: 12px 0 0; }
.terms__title { margin: 12px 0 8px; }
.terms__lead { margin: 0; }
.terms__section { margin: 0; }
.terms__heading { margin: 28px 0 0; font-size: 1.1rem; }
.terms__text { margin: 0; }
.terms__list { margin: 8px 0 0; padding-left: 1.25rem; }
.terms__item { margin: 0; }
.terms__link { color: var(--t-fg-08775f); text-decoration: none; }
.terms__link:hover { text-decoration: underline; }
</style>
