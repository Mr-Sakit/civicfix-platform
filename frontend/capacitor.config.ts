import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.civicfix.app',
  appName: 'CivicFix',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
};

export default config;
