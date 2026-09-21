<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, Check, MapPin } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '../../components/AppButton.vue'
import ProfileDetailModal from '../../components/socio/ProfileDetailModal.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import { mockApplicantProfiles, mockCompany, type MockApplicantProfile } from '../../data/mockSocioBolsa'
import { useSocioOffersStore } from '../../stores/socioOffers'

const route = useRoute()
const router = useRouter()
const offers = useSocioOffersStore()
const selectedProfile = ref<MockApplicantProfile | null>(null)

const offerId = computed(() => String(route.params.offerId ?? ''))
const offer = computed(() => offers.offerById(offerId.value))
const applications = computed(() => offers.applicationsFor(offerId.value))
const subtitle = computed(() => `${applications.value.length} ${applications.value.length === 1 ? 'recibida' : 'recibidas'}`)

function openProfile(profileId: string) {
  selectedProfile.value = mockApplicantProfiles.find((profile) => profile.id === profileId) ?? null
}
</script>

<template>
  <SocioShell
    v-if="offer"
    active-nav="ofertas"
    :title="`Postulaciones — ${offer.title}`"
    :subtitle="subtitle"
    :company-name="mockCompany.name"
    :company-initials="mockCompany.initials"
    :company-role="mockCompany.roleLabel"
  >
    <template #header-actions>
      <AppButton variant="secondary" type="button" @click="router.push({ name: 'socio-mis-ofertas' })">
        <ArrowLeft :size="15" aria-hidden="true" />
        Volver
      </AppButton>
    </template>

    <section class="socio-applications" aria-label="Postulaciones de la oferta">
      <article
        v-for="application in applications"
        :key="application.id"
        class="socio-application-card"
      >
        <button type="button" class="socio-application-card__main" @click="openProfile(application.profileId)">
          <span class="socio-application-card__avatar" aria-hidden="true">{{ application.initials }}</span>
          <div>
            <h2>{{ application.fullName }}</h2>
            <p>
              Perfil: {{ application.profileName }}
              <span>
                <MapPin :size="12" aria-hidden="true" />
                {{ application.location }}
              </span>
            </p>
            <ul>
              <li v-for="tag in application.tags" :key="tag">{{ tag }}</li>
            </ul>
          </div>
        </button>
        <div class="socio-application-card__status" :class="`socio-application-card__status--${application.status.toLowerCase()}`">
          <span>
            <Check v-if="application.status === 'Contactada'" :size="12" aria-hidden="true" />
            {{ application.status }}
          </span>
          <time>{{ application.appliedOn }}</time>
        </div>
      </article>
      <p v-if="!applications.length" class="socio-applications__empty">No hay postulaciones mock para esta oferta.</p>
    </section>

    <template #overlay>
      <ProfileDetailModal
        v-if="selectedProfile"
        :profile="selectedProfile"
        @close="selectedProfile = null"
      />
    </template>
  </SocioShell>
  <SocioShell
    v-else
    active-nav="ofertas"
    title="Postulaciones"
    subtitle="Oferta no encontrada"
    :company-name="mockCompany.name"
    :company-initials="mockCompany.initials"
    :company-role="mockCompany.roleLabel"
  >
    <template #header-actions>
      <AppButton variant="secondary" type="button" @click="router.push({ name: 'socio-mis-ofertas' })">
        <ArrowLeft :size="15" aria-hidden="true" />
        Volver
      </AppButton>
    </template>
  </SocioShell>
</template>
