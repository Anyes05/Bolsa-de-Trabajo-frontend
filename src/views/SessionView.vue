<script setup lang="ts">
import { LogOut, ShieldCheck } from 'lucide-vue-next'
import type { AuthResponse } from '../services/api'
defineProps<{ session: AuthResponse }>()
defineEmits<{ logout: [] }>()
</script>
<template><main class="session"><section class="session__card"><ShieldCheck :size="38" /><p>Sesion iniciada</p><h1>{{ session.email }}</h1><span>{{ session.role }}</span><button type="button" class="button button--primary" @click="$emit('logout')"><LogOut :size="16" /> Cerrar sesion</button></section></main></template>