import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emilionicoli.webllmapp',
  appName: 'WebLLM Chat',
  webDir: 'build',
  ios: {
    webSecurity: false,
    allowsBackForwardNavigationGestures: false,
    scheme: 'capacitor',
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#000000',
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: false,
    allowsInlineMediaPlayback: true,
    allowsAirPlayForMediaPlayback: false,
    mediaPlaybackRequiresUserGesture: false,
    suppresses3DTouchGesture: false,
    suppressesIncrementalRendering: false,
    hideLogs: false,
    inspectable: true,
    minWebkitVersion: '14.0'
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'localhost',
    cleartext: false,
    allowNavigation: ['*']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true
    }
  }
};

export default config;
