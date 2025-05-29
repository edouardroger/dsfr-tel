import { App } from 'vue';
import DsfrTel from './DsfrTel.vue';

export { DsfrTel };

export default {
    install(app: App) {
        app.component('DsfrTel', DsfrTel);
    }
};
