<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  id?: string
  placeholder?: string
  autocomplete?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  minlength?: number
}>(), {
  id: undefined,
  placeholder: '',
  autocomplete: 'current-password',
  required: false,
  disabled: false,
  readonly: false,
  minlength: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const show = ref(false)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="password-field">
    <input
      :id="props.id"
      :value="props.modelValue"
      :type="show ? 'text' : 'password'"
      :placeholder="props.placeholder"
      :autocomplete="props.autocomplete"
      :required="props.required"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :minlength="props.minlength"
      @input="onInput"
    >
    <button
      type="button"
      class="password-field__toggle"
      :aria-label="show ? 'Ocultar contraseña' : 'Mostrar contraseña'"
      @click="show = !show"
    >
      <EyeOff v-if="show" :size="16" aria-hidden="true" />
      <Eye v-else :size="16" aria-hidden="true" />
    </button>
  </div>
</template>
