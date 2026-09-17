import { useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { C, RADIUS } from '../src/theme';
import type { RootStackParamList } from '../src/nav';

export function NotFoundScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NotFound'>>();
  const title = route.params?.title ?? 'Page not found';
  const message = route.params?.message ?? 'The page you asked for does not exist on this device.';

  useLayoutEffect(() => {
    nav.setOptions({ title: '404' });
  }, [nav]);

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <Text style={s.kicker}>404 · mobile route missing</Text>
        <Text style={s.code}>404</Text>
        <Text style={s.title}>{title}</Text>
        <Text style={s.body}>{message}</Text>
        <Text style={s.bodySoft}>
          If you opened this from an old link or a deleted save, go back to the library and try again.
        </Text>

        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={() => nav.navigate('Tabs', { screen: 'Library' })}>
            <Text style={s.btnPrimaryTxt}>Open library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={() => nav.navigate('Tabs', { screen: 'Capture' })}>
            <Text style={s.btnTxt}>Capture something</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 18, justifyContent: 'center' },
  card: {
    backgroundColor: C.bg2,
    borderColor: C.line2,
    borderWidth: 1,
    borderRadius: RADIUS,
    padding: 24,
    overflow: 'hidden',
  },
  kicker: { color: C.fg3, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 18 },
  code: { color: C.accent, fontSize: 72, fontWeight: '900', letterSpacing: -3, lineHeight: 70, marginBottom: 8 },
  title: { color: C.fg, fontSize: 28, fontWeight: '800', letterSpacing: -0.4, lineHeight: 33, marginBottom: 12 },
  body: { color: C.fg2, fontSize: 15, lineHeight: 22, marginBottom: 10 },
  bodySoft: { color: C.fg3, fontSize: 14, lineHeight: 21, marginBottom: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: C.line2,
    backgroundColor: C.bg3,
  },
  btnTxt: { color: C.fg, fontSize: 13, fontWeight: '700' },
  btnPrimary: { backgroundColor: C.accent, borderColor: C.accent },
  btnPrimaryTxt: { color: C.accentInk, fontSize: 13, fontWeight: '800' },
});