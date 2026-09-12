import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { subscribeSave, updateSave, deleteSave, currentUser, type Save } from '@supermind/core';
import { formatDate } from '../src/format';
import { C, RADIUS } from '../src/theme';
import type { RootStackParamList } from '../src/nav';

export function DetailScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'Detail'>>();
  const uid = currentUser()?.uid;
  const id = route.params.id;

  const [save, setSave] = useState<Save | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);

  // Read the latest editing state inside the snapshot callback without
  // re-subscribing, so live updates never clobber in-progress edits.
  const editingRef = useRef(false);
  useEffect(() => { editingRef.current = editing; }, [editing]);

  useEffect(() => {
    if (!uid) return;
    // Live subscription: async enrichment (summary/tags) appears without leaving the screen.
    return subscribeSave(uid, id, (sv) => {
      if (!sv) return;
      setSave(sv);
      if (!editingRef.current) { setTitle(sv.title); setText(sv.text); setTags(sv.tags.join(', ')); }
    });
  }, [uid, id]);

  // Header action mirrors the current mode: Edit while viewing, Delete while editing.
  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () =>
        editing ? (
          <TouchableOpacity onPress={remove}><Text style={{ color: C.danger, fontWeight: '600' }}>Delete</Text></TouchableOpacity>
        ) : save ? (
          <TouchableOpacity onPress={startEdit}><Text style={{ color: C.accent, fontWeight: '600' }}>Edit</Text></TouchableOpacity>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, save, editing]);

  function startEdit() {
    if (!save) return;
    setTitle(save.title); setText(save.text); setTags(save.tags.join(', '));
    setEditing(true);
  }

  async function persist() {
    if (!uid || !save) return;
    setBusy(true);
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      await updateSave(uid, save.id, { title, text, tags: tagList }, save);
      setSave({ ...save, title, text, tags: tagList });
      setEditing(false);
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

  const aiOnly = save.aiTags.filter((t) => !save.tags.includes(t));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.wrap}>
      <View style={s.head}>
        <Text style={s.type}>{save.type.toUpperCase()}</Text>
        <Text style={s.date}>Filed {formatDate(save.createdAt)}</Text>
      </View>

      {editing ? (
        /* ── edit mode ── */
        <>
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
          <TouchableOpacity style={s.btnGhost} onPress={() => setEditing(false)} disabled={busy}>
            <Text style={s.btnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : (
        /* ── view mode (default) ── */
        <>
          <Text style={s.title}>{save.title || 'Untitled'}</Text>

          {save.url ? (
            <TouchableOpacity onPress={() => Linking.openURL(save.url!)}>
              <Text style={s.sourceLink}>{save.source || save.url} ↗</Text>
            </TouchableOpacity>
          ) : null}

          {save.summary ? (
            <View style={s.summaryBox}>
              <Text style={s.label}>Summary</Text>
              <Text style={s.summaryTxt}>{save.summary}</Text>
            </View>
          ) : save.enrichStatus === 'pending' ? (
            <View style={s.summaryBox}>
              <Text style={s.label}>Summary</Text>
              <Text style={s.summaryMuted}>Summarizing…</Text>
            </View>
          ) : null}

          {save.text ? (
            <>
              <Text style={s.label}>{save.type === 'note' ? 'The thought' : 'Note'}</Text>
              <Text style={s.bodyTxt}>{save.text}</Text>
            </>
          ) : null}

          {save.tags.length > 0 || aiOnly.length > 0 ? (
            <View style={s.tagRow}>
              {save.tags.map((t) => <Text key={t} style={s.tag}>#{t}</Text>)}
              {aiOnly.map((t) => <Text key={t} style={[s.tag, s.tagAi]}>✦{t}</Text>)}
            </View>
          ) : null}
        </>
      )}
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
  btnGhost: { padding: 15, alignItems: 'center', marginTop: 4 },
  btnGhostTxt: { color: C.fg2, fontWeight: '600', fontSize: 15 },
  // view mode
  title: { color: C.fg, fontSize: 24, fontWeight: '800', letterSpacing: -0.3, lineHeight: 30, marginBottom: 10 },
  sourceLink: { color: C.accent, fontSize: 14, marginBottom: 20 },
  summaryBox: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderLeftColor: C.accent, borderLeftWidth: 2, borderRadius: RADIUS, padding: 14, marginBottom: 20 },
  summaryTxt: { color: C.fg, fontSize: 15, lineHeight: 22 },
  summaryMuted: { color: C.fg3, fontSize: 15, fontStyle: 'italic' },
  bodyTxt: { color: C.fg2, fontSize: 15, lineHeight: 24, marginBottom: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  tag: { color: C.fg3, fontSize: 13, fontFamily: 'monospace' },
  tagAi: { color: C.accent },
});
