import { createApp } from 'vue';
import DsfrTelPlugin from '../src/index';
import App from './App.vue';

createApp(App).use(DsfrTelPlugin).mount('#app');
