import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mintmind.app',
  appName: 'Mintmind',
  webDir: '.next', // Changed from 'out' since we're not using static export
  // For development, uncomment the server config below to point to your local dev server
  // server: {
  //   url: 'http://localhost:3000',
  //   cleartext: true,
  // },
  // For production, deploy your Next.js app and set the server URL to your production domain
  // server: {
  //   url: 'https://your-production-domain.com',
  //   androidScheme: 'https',
  //   iosScheme: 'https',
  // },
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

