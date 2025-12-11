import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goldmirubada.laobus',
  appName: 'Lao Bus',

  webDir: 'out',
  server: {
    androidScheme: 'http',
    cleartext: true
  }
};

export default config;
