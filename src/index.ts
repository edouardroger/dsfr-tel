import type { App } from 'vue';
import DsfrTel from './DsfrTel.vue';
import { getCountryList, numberTypeLabels, defaultLabels, type Country, type Labels } from './data';

export { DsfrTel, getCountryList, numberTypeLabels, defaultLabels, type Country, type Labels };

export default {
  install(app: App) {
    app.component('DsfrTel', DsfrTel);
  }
};
