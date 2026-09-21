import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSocioProfileStore = defineStore('socio-profile', () => {
  const photoUrl = ref<string | null>(null)

  function setPhoto(file: File) {
    if (photoUrl.value) URL.revokeObjectURL(photoUrl.value)
    photoUrl.value = URL.createObjectURL(file)
  }

  function clearPhoto() {
    if (photoUrl.value) URL.revokeObjectURL(photoUrl.value)
    photoUrl.value = null
  }

  return { photoUrl, setPhoto, clearPhoto }
})
