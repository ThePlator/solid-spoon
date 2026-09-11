import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { signIn, signUp } from '@supermind/core';
import { C, RADIUS } from '../src/theme';

export function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace('Firebase: ', '') : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.logo}>
        MIND<Text style={{ color: C.accent }}>·</Text>OS
      </Text>
      <Text style={s.tag}>Your external brain. Capture anything, find it later.</Text>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, mode === 'signin' && s.tabOn]} onPress={() => setMode('signin')}>
          <Text style={[s.tabTxt, mode === 'signin' && s.tabTxtOn]}>Log in</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, mode === 'signup' && s.tabOn]} onPress={() => setMode('signup')}>
          <Text style={[s.tabTxt, mode === 'signup' && s.tabTxtOn]}>Create account</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={s.input} placeholder="email" placeholderTextColor={C.fg3}
        autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="password (min 6)" placeholderTextColor={C.fg3}
        secureTextEntry value={password} onChangeText={setPassword} />

      {error ? <Text style={s.err}>⚠ {error}</Text> : null}

      <TouchableOpacity style={s.btn} onPress={submit} disabled={busy}>
        <Text style={s.btnTxt}>{busy ? 'Connecting…' : mode === 'signup' ? 'Boot my mind →' : 'Enter →'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 24 },
  logo: { color: C.fg, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  tag: { color: C.fg2, fontSize: 14, marginTop: 8, marginBottom: 28 },
  tabs: { flexDirection: 'row', backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: RADIUS - 2, alignItems: 'center' },
  tabOn: { backgroundColor: C.accent },
  tabTxt: { color: C.fg3, fontSize: 13, fontWeight: '600' },
  tabTxtOn: { color: C.accentInk, fontWeight: '700' },
  input: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, color: C.fg, padding: 13, fontSize: 16, marginBottom: 12 },
  err: { color: C.danger, fontSize: 13, marginBottom: 12 },
  btn: { backgroundColor: C.accent, borderRadius: RADIUS, padding: 15, alignItems: 'center', marginTop: 8 },
  btnTxt: { color: C.accentInk, fontWeight: '700', fontSize: 15 },
});
