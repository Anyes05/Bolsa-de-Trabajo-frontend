import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  mockOfferApplications,
  mockSocioOffers,
  type MockSocioOffer,
  type OfferStatus,
} from '../data/mockSocioOfertas'

export const useSocioOffersStore = defineStore('socio-offers', () => {
  const offers = ref(mockSocioOffers.map((offer) => ({ ...offer })))
  const applications = ref(mockOfferApplications.map((item) => ({ ...item })))

  const offerCount = computed(() => offers.value.length)

  function offerById(id: string) {
    return offers.value.find((offer) => offer.id === id)
  }

  function applicationsFor(offerId: string) {
    return applications.value.filter((item) => item.offerId === offerId)
  }

  function saveOffer(offer: MockSocioOffer) {
    if (offer.id) {
      const index = offers.value.findIndex((item) => item.id === offer.id)
      if (index >= 0) {
        offers.value[index] = { ...offer }
        return
      }
    }
    offers.value.unshift({
      ...offer,
      id: String(Date.now()),
      status: 'Activa',
    })
  }

  function setStatus(id: string, status: OfferStatus) {
    const offer = offers.value.find((item) => item.id === id)
    if (offer) offer.status = status
  }

  return { offers, applications, offerCount, offerById, applicationsFor, saveOffer, setStatus }
})
