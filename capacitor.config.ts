import { CapacitorConfig } from '@capacitor/cli';

// ponytail: Capacitor needs static webDir for sync; Next.js runs separately via server.url.
// Simulator: http://localhost:3000
// Physical device: set CAPACITOR_SERVER_URL=http://<your-mac-ip>:3000
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000';

const config: CapacitorConfig = {
  appId: 'com.mintmind.app',
  appName: 'Mintmind',
  webDir: 'www',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2563eb',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#2563eb',
    },
  },
};

export default config;
