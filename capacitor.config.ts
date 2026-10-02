import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ir.lmsmfih.tahzib',
  appName: 'Tahzib App',
  webDir: 'dist',
  server: {
    url: 'http://77.238.122.209:3000',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
