import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { createSave, currentUser, type SaveType } from '@supermind/core';
import { C, RADIUS } from '../src/theme';
import type { TabParamList } from '../src/nav';

function hostOf(url: string): string {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

export function CaptureScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<TabParamList, 'Capture'>>();
  const uid = currentUser()?.uid;

  const [type, setType] = useState<SaveType>('note');
  const [value, setValue] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Prefill from a share-sheet payload. The root ShareRouter routes the intent
  // here as route params (and switches to this tab), so this is the single
  // place that consumes it — prefilling the create page for the shared link.
  useEffect(() => {
    const p = route.params;
    if (p?.sharedUrl) { setType('link'); setValue(p.sharedUrl); }
    else if (p?.sharedText) { setType('note'); setValue(p.sharedText); }
  }, [route.params]);

  async function save() {
    const v = value.trim();
    if (!v || !uid) return;
    setBusy(true);
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const isLink = type === 'link';
      await createSave(uid, {
        type,
        url: isLink ? (v.startsWith('http') ? v : `https://${v}`) : null,
        source: isLink ? hostOf(v) : '',
        title: isLink ? (hostOf(v) || v) : v.slice(0, 80),
        text: isLink ? '' : v,
        tags: tagList,
        status: 'active',
      });
      setValue(''); setTags(''); setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      nav.navigate('Library');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>New entry</Text>

        <View style={s.seg}>
          {(['note', 'link'] as SaveType[]).map((t) => (
            <TouchableOpacity key={t} style={[s.segBtn, type === t && s.segOn]} onPress={() => setType(t)}>
              <Text style={[s.segTxt, type === t && s.segTxtOn]}>{t === 'note' ? 'Thought' : 'Link'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>{type === 'link' ? 'Link' : 'The thought'}</Text>
        <TextInput
          style={[s.input, type === 'note' && { minHeight: 120, textAlignVertical: 'top' }]}
          multiline={type === 'note'}
          placeholder={type === 'link' ? 'https://…' : 'What’s on your mind…'}
          placeholderTextColor={C.fg3} value={value} onChangeText={setValue} autoCapitalize="none"
        />

        <Text style={s.label}>Tags</Text>
        <TextInput style={s.input} placeholder="comma, separated" placeholderTextColor={C.fg3}
          value={tags} onChangeText={setTags} autoCapitalize="none" />

        <TouchableOpacity style={[s.btn, (!value.trim() || busy) && { opacity: 0.4 }]} onPress={save} disabled={!value.trim() || busy}>
          <Text style={s.btnTxt}>{busy ? 'Filing…' : saved ? '✓ Filed' : 'File it →'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16 },
  eyebrow: { color: C.fg3, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 },
  seg: { flexDirection: 'row', backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, padding: 3, marginBottom: 20, alignSelf: 'flex-start' },
  segBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: RADIUS - 2 },
  segOn: { backgroundColor: C.accent },
  segTxt: { color: C.fg3, fontSize: 14, fontWeight: '600' },
  segTxtOn: { color: C.accentInk, fontWeight: '700' },
  label: { color: C.fg3, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, color: C.fg, padding: 13, fontSize: 16, marginBottom: 20 },
  btn: { backgroundColor: C.accent, borderRadius: RADIUS, padding: 15, alignItems: 'center' },
  btnTxt: { color: C.accentInk, fontWeight: '700', fontSize: 15 },
});
