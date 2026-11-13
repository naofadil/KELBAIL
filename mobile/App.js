import { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ActivityIndicator,
  BackHandler, Platform, StatusBar as RNStatusBar, RefreshControl, ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { APP_URL } from './config';

SplashScreen.preventAutoHideAsync().catch(() => {});

const BG = '#101418';
const PRIMARY = '#19e6b8';
const MUTED = '#8a93a0';

export default function App() {
  const webRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [key, setKey] = useState(0); // force le remontage de la WebView au rechargement

  // Bouton retour physique Android -> navigation dans la WebView
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBack = () => {
      if (canGoBack && webRef.current) { webRef.current.goBack(); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [canGoBack]);

  const reload = useCallback(() => {
    setError(false);
    setLoading(true);
    setKey((k) => k + 1);
  }, []);

  const onLoadEnd = useCallback(() => {
    setLoading(false);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.logo}>Kel Bail</Text>
        <Text style={styles.errTitle}>Connexion impossible</Text>
        <Text style={styles.errText}>
          Vérifie que le serveur Vite tourne sur ton Mac et que le téléphone est
          sur le même réseau Wi-Fi.{'\n'}Adresse : {APP_URL}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={reload}>
          <Text style={styles.btnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.safeTop} />
      <WebView
        key={key}
        ref={webRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        pullToRefreshEnabled
        onLoadEnd={onLoadEnd}
        onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
        onError={() => { setLoading(false); setError(true); }}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent.statusCode >= 500) { setLoading(false); setError(true); }
        }}
        renderError={() => null}
        decelerationRate="normal"
      />
      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <Text style={styles.logo}>Kel Bail</Text>
          <ActivityIndicator color={PRIMARY} size="large" style={{ marginTop: 16 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safeTop: {
    height: Platform.OS === 'android' ? RNStatusBar.currentHeight : 44,
    backgroundColor: BG,
  },
  webview: { flex: 1, backgroundColor: BG },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  logo: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  errTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 24 },
  errText: { color: MUTED, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  btn: {
    marginTop: 24, backgroundColor: PRIMARY, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14,
  },
  btnText: { color: BG, fontSize: 16, fontWeight: '800' },
});
