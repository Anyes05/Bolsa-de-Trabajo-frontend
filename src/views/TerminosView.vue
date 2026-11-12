<script setup lang="ts">
import { RouterLink } from 'vue-router'
import BrandLogo from '../components/BrandLogo.vue'
</script>

<template>
  <main class="terms">
    <header>
      <BrandLogo />
      <p><RouterLink to="/">Volver al ingreso</RouterLink></p>
      <h1>Términos y condiciones</h1>
      <p>Bolsa de Empleo Digital del Centro Comercial e Industrial de San José (CCISJ).</p>
    </header>

    <section>
      <h2>1. Quién opera el sistema</h2>
      <p>
        El sistema es operado por el CCISJ para gestionar socios, caja, postulantes y ofertas de empleo.
        El uso implica aceptar estas condiciones.
      </p>
    </section>

    <section>
      <h2>2. Cuentas</h2>
      <ul>
        <li>El postulante es responsable de la veracidad de sus datos, cédula y CV.</li>
        <li>El socio usa la cuenta habilitada por la administración. Una clave provisional vence a las 24 horas.</li>
        <li>El administrador gestiona padrones, caja y habilitación de acceso.</li>
        <li>Una cuenta dada de baja no puede ingresar. Un socio moroso sí puede usar el sistema.</li>
      </ul>
    </section>

    <section>
      <h2>3. Datos personales</h2>
      <p>
        Se tratan cédulas, correos, teléfonos, CV, fotos y datos de caja con la finalidad de operar la bolsa y la
        administración del centro. El socio solo ve el CV asociado a una postulación a su oferta, no todos los CV del perfil.
      </p>
    </section>

    <section>
      <h2>4. Contenido y archivos</h2>
      <p>
        Está prohibido subir archivos que no sean el CV o la foto declarados, o contenido ilícito.
        El sistema verifica el tipo real del archivo (no solo la extensión).
      </p>
    </section>

    <section>
      <h2>5. Comunicaciones</h2>
      <p>
        El CCISJ y las empresas socias pueden enviar avisos relacionados con postulaciones, aniversarios y permanencia.
        El postulante puede pausar su visibilidad en la bolsa.
      </p>
    </section>

    <section>
      <h2>6. Limitación</h2>
      <p>
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
  color: #24352b;
  line-height: 1.6;
}
.terms h1 { margin: 12px 0 8px; }
.terms h2 { margin-top: 28px; font-size: 1.1rem; }
.terms a { color: #08775f; }
</style>
