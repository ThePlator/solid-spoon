import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { subscribeFeed, searchSaves, currentUser, type Save } from '@supermind/core';
import { relativeDate } from '../src/format';
import { C, RADIUS } from '../src/theme';
import type { RootStackParamList } from '../src/nav';

export function FeedScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const uid = currentUser()?.uid;

  const [feed, setFeed] = useState<Save[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Save[] | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeFeed(uid, (s) => { setFeed(s); setReady(true); });
  }, [uid]);

  async function onSearch(q: string) {
    setQuery(q);
    if (!uid || q.trim().length < 2) { setResults(null); return; }
    setResults(await searchSaves(uid, q));
  }

  const list = results ?? feed;

  return (
    <View style={s.wrap}>
      <View style={s.searchRow}>
        <Text style={s.slash}>/</Text>
        <TextInput
          style={s.search} placeholder="search your mind" placeholderTextColor={C.fg3}
          value={query} onChangeText={onSearch} autoCapitalize="none"
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListHeaderComponent={
          <Text style={s.count}>{ready ? `${list.length} ${results ? 'result(s)' : 'entr' + (list.length === 1 ? 'y' : 'ies')}` : 'loading…'}</Text>
        }
        ListEmptyComponent={
          ready ? (
            <View style={s.empty}>
              <Text style={s.emptyGlyph}>+</Text>
              <Text style={s.emptyMark}>{results ? 'No results' : 'Your mind is empty'}</Text>
              <Text style={s.emptyTxt}>{results ? 'Try another search.' : 'Tap Capture below to save your first thought or link.'}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => nav.navigate('Detail', { id: item.id })}>
            <View style={s.cardTop}>
              <Text style={s.cardType}>{item.type.toUpperCase()}</Text>
              <Text style={s.cardDate}>{relativeDate(item.createdAt)}</Text>
            </View>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title || 'Untitled'}</Text>
            {item.text && item.text !== item.title ? <Text style={s.cardSnip} numberOfLines={2}>{item.text}</Text> : null}
            <View style={s.cardFoot}>
              {item.source ? <Text style={s.cardSrc}>{item.source}</Text> : null}
              {item.tags.length > 0 ? <Text style={s.cardTags}>{item.tags.map((t) => `#${t}`).join('  ')}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  searchRow: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 0, backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, paddingHorizontal: 12 },
  slash: { color: C.accent, fontWeight: '700', fontSize: 16, marginRight: 8 },
  search: { flex: 1, color: C.fg, fontSize: 15, paddingVertical: 11 },
  count: { color: C.fg3, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  card: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardType: { color: C.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  cardDate: { color: C.fg3, fontSize: 11 },
  cardTitle: { color: C.fg, fontSize: 17, fontWeight: '600' },
  cardSnip: { color: C.fg2, fontSize: 13, marginTop: 4 },
  cardFoot: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  cardSrc: { color: C.fg2, fontSize: 12 },
  cardTags: { color: C.fg3, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 64 },
  emptyGlyph: { color: C.line2, fontSize: 44, fontWeight: '800' },
  emptyMark: { color: C.fg, fontSize: 18, fontWeight: '600', marginTop: 8 },
  emptyTxt: { color: C.fg2, fontSize: 14, textAlign: 'center', marginTop: 8, maxWidth: 260 },
});
