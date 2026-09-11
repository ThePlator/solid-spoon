import { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { getSave, updateSave, deleteSave, currentUser, type Save } from '@supermind/core';
import { formatDate } from '../src/format';
import { C, RADIUS } from '../src/theme';
import type { RootStackParamList } from '../src/nav';

export function DetailScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'Detail'>>();
  const uid = currentUser()?.uid;
  const id = route.params.id;

  const [save, setSave] = useState<Save | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getSave(uid, id).then((sv) => {
      if (!sv) return;
      setSave(sv); setTitle(sv.title); setText(sv.text); setTags(sv.tags.join(', '));
    });
  }, [uid, id]);

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={remove}><Text style={{ color: C.danger, fontWeight: '600' }}>Delete</Text></TouchableOpacity>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, save]);

  async function persist() {
    if (!uid || !save) return;
    setBusy(true);
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      await updateSave(uid, save.id, { title, text, tags: tagList }, save);
      nav.goBack();
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (!uid || !save) return;
    Alert.alert('Remove entry', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSave(uid, save.id); nav.goBack(); } },
    ]);
  }

  if (!save) return <View style={s.wrap}><Text style={s.loading}>Retrieving…</Text></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.wrap}>
      <View style={s.head}>
        <Text style={s.type}>{save.type.toUpperCase()}</Text>
        <Text style={s.date}>Filed {formatDate(save.createdAt)}</Text>
      </View>

      <Text style={s.label}>Title</Text>
      <TextInput style={s.input} value={title} onChangeText={setTitle} />

      {save.url ? (
        <>
          <Text style={s.label}>Source</Text>
          <TouchableOpacity onPress={() => Linking.openURL(save.url!)}>
            <Text style={s.link}>{save.source || save.url} ↗</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <Text style={s.label}>{save.type === 'note' ? 'The thought' : 'Note'}</Text>
      <TextInput style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]} multiline value={text} onChangeText={setText} />

      <Text style={s.label}>Tags</Text>
      <TextInput style={s.input} value={tags} onChangeText={setTags} placeholder="comma, separated" placeholderTextColor={C.fg3} />

      <TouchableOpacity style={[s.btn, busy && { opacity: 0.5 }]} onPress={persist} disabled={busy}>
        <Text style={s.btnTxt}>{busy ? 'Saving…' : 'Save changes'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16 },
  loading: { color: C.fg2, marginTop: 40 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 14, borderBottomColor: C.line, borderBottomWidth: 1 },
  type: { color: C.accentInk, backgroundColor: C.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  date: { color: C.fg3, fontSize: 12, marginLeft: 'auto' },
  label: { color: C.fg3, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, color: C.fg, padding: 13, fontSize: 16, marginBottom: 18 },
  link: { color: C.accent, fontSize: 15, marginBottom: 18 },
  btn: { backgroundColor: C.accent, borderRadius: RADIUS, padding: 15, alignItems: 'center', marginTop: 8 },
  btnTxt: { color: C.accentInk, fontWeight: '700', fontSize: 15 },
});
