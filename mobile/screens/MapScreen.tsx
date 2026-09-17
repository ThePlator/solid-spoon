import { useCallback, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import Constants from 'expo-constants';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { currentUser } from '@supermind/core';
import { C } from '../src/theme';
import type { RootStackParamList } from '../src/nav';

const WEB_URL =
  ((Constants.expoConfig?.extra ?? {}) as Record<string, string>).webUrl ??
  'https://supermind.theplator.dev';

/**
 * The brain map is the same web page the site uses, loaded in a WebView with
 * the user's Firebase ID token passed in (?token=). Tapping a node in the graph
 * posts a message back, which we route to the native Detail screen. The token
 * is refreshed every time the tab is focused so it never goes stale.
 */
export function MapScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [uri, setUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const user = currentUser();
        if (!user) return;
        try {
          const token = await user.getIdToken();
          if (alive) setUri(`${WEB_URL}/map?embed=1&token=${encodeURIComponent(token)}`);
        } catch {
          /* stay on the loader; user can pull back and retry */
        }
      })();
      return () => { alive = false; };
    }, [])
  );

  function onMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string; id?: string };
      if (msg.type === 'openSave' && msg.id) nav.navigate('Detail', { id: msg.id });
    } catch {
      /* ignore non-JSON messages */
    }
  }

  if (!uri) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <WebView
      source={{ uri }}
      style={s.web}
      originWhitelist={['*']}
      onMessage={onMessage}
      startInLoadingState
      renderLoading={() => (
        <View style={s.loadingOverlay}>
          <ActivityIndicator color={C.accent} />
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  web: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
});
