import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'
import './assets/css/theme.css'
import './assets/css/app.css'
import './assets/css/responsive.css'

initTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
