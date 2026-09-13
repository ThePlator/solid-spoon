import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checkEasUpdate, applyEasUpdate, checkGithubUpdate, type AppUpdate,
} from '../src/updates';
import { C } from '../src/theme';

type Mode = 'none' | 'ota' | 'apk';

/**
 * Slim top strip announcing an available update:
 *  - OTA (EAS Update): "Update ready — Restart" → reloads to apply.
 *  - New APK (GitHub release): "vX available — Download" → opens the release.
 * Renders nothing when up to date or dismissed.
 */
export function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('none');
  const [apk, setApk] = useState<AppUpdate | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      // OTA takes priority — it's instant and free.
      if (await checkEasUpdate()) { if (alive) setMode('ota'); return; }
      const gh = await checkGithubUpdate();
      if (alive && gh) { setApk(gh); setMode('apk'); }
    })();
    return () => { alive = false; };
  }, []);

  if (mode === 'none' || dismissed) return null;

  const isOta = mode === 'ota';
  const label = isOta
    ? 'Update ready to install'
    : `Version ${apk?.version ?? ''} available`;
  const action = isOta ? 'Restart' : 'Download';

  function onAction() {
    if (isOta) { applyEasUpdate(); return; }
    const target = apk?.apkUrl || apk?.url;
    if (target) Linking.openURL(target);
  }

  return (
    <View style={[s.bar, { paddingTop: insets.top + 8 }]}>
      <Text style={s.txt} numberOfLines={1}>{label}</Text>
      <TouchableOpacity onPress={onAction} style={s.btn}><Text style={s.btnTxt}>{action}</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setDismissed(true)} style={s.x}><Text style={s.xTxt}>✕</Text></TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, elevation: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, paddingHorizontal: 14, paddingBottom: 10, gap: 12 },
  txt: { flex: 1, color: C.accentInk, fontSize: 13, fontWeight: '700' },
  btn: { backgroundColor: C.accentInk, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
  btnTxt: { color: C.accent, fontSize: 13, fontWeight: '700' },
  x: { paddingHorizontal: 4 },
  xTxt: { color: C.accentInk, fontSize: 14, fontWeight: '700' },
});
