import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { subscribeFeed, searchSaves, deleteSave, currentUser, type Save } from '@supermind/core';
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
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Bumped per search/tag action; async responses only apply if still current.
  const searchSeq = useRef(0);

  useEffect(() => {
    if (!uid) return;
    return subscribeFeed(uid, (s) => { setFeed(s); setReady(true); });
  }, [uid]);

  const stats = useMemo(() => {
    const links = feed.filter((s) => s.type === 'link').length;
    const summarized = feed.filter((s) => !!s.summary).length;
    return { total: feed.length, links, thoughts: feed.length - links, summarized };
  }, [feed]);

  // All tags across the library — user tags first, then AI tags, unique.
  const allTags = useMemo(() => {
    const set = new Set<string>();
    feed.forEach((s) => { s.tags.forEach((t) => set.add(t)); s.aiTags.forEach((t) => set.add(t)); });
    return Array.from(set).sort();
  }, [feed]);

  async function onSearch(q: string) {
    setQuery(q);
    setActiveTag(null);
    const seq = ++searchSeq.current;
    if (!uid || q.trim().length < 2) { setResults(null); return; }
    const r = await searchSaves(uid, q);
    if (seq === searchSeq.current) setResults(r);
  }

  // Tapping a tag chip searches for it — matches both user and AI tags, since
  // AI tags are folded into searchTokens.
  async function applyTag(tag: string) {
    setQuery('');
    const seq = ++searchSeq.current;
    if (!uid || activeTag === tag) { setActiveTag(null); setResults(null); return; }
    setActiveTag(tag);
    const r = await searchSaves(uid, tag);
    if (seq === searchSeq.current) setResults(r);
  }

  function onRefresh() {
    // The feed is a live subscription, so there's nothing to re-fetch — this is
    // a brief confirmation that the list is current.
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }

  function confirmDelete(item: Save) {
    Alert.alert('Remove entry', `Delete “${(item.title || 'Untitled').slice(0, 40)}”? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { if (uid) deleteSave(uid, item.id); } },
    ]);
  }

  const list = results ?? feed;
  const filtering = results !== null;

  const Header = (
    <View>
      <View style={s.searchRow}>
        <Text style={s.slash}>/</Text>
        <TextInput
          style={s.search} placeholder="search your mind" placeholderTextColor={C.fg3}
          value={query} onChangeText={onSearch} autoCapitalize="none"
        />
      </View>

      {ready && (
        <View style={s.statsStrip}>
          <Stat n={stats.total} k="Entries" />
          <Stat n={stats.links} k="Links" />
          <Stat n={stats.thoughts} k="Thoughts" />
          <Stat n={stats.summarized} k="Summ." accent />
        </View>
      )}

      {allTags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tagRail}>
          {allTags.map((t) => (
            <TouchableOpacity key={t} style={[s.chip, activeTag === t && s.chipOn]} onPress={() => applyTag(t)}>
              <Text style={[s.chipTxt, activeTag === t && s.chipTxtOn]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={s.count}>
        {ready ? `${list.length} ${filtering ? 'result(s)' : 'entr' + (list.length === 1 ? 'y' : 'ies')}` : 'loading…'}
      </Text>
    </View>
  );

  return (
    <View style={s.wrap}>
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingTop: 12 }}
        ListHeaderComponent={Header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} colors={[C.accent]} />}
        ListEmptyComponent={
          ready ? (
            <View style={s.empty}>
              <Text style={s.emptyGlyph}>{filtering ? '∅' : '+'}</Text>
              <Text style={s.emptyMark}>{filtering ? 'No results' : 'Your mind is empty'}</Text>
              <Text style={s.emptyTxt}>{filtering ? 'Try another search or tag.' : 'Tap Capture below to save your first thought or link.'}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={() => (
              <TouchableOpacity style={s.swipeDelete} onPress={() => confirmDelete(item)}>
                <Text style={s.swipeDeleteTxt}>Delete</Text>
              </TouchableOpacity>
            )}
            overshootRight={false}
          >
            <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => nav.navigate('Detail', { id: item.id })}>
              <View style={s.cardTop}>
                <Text style={s.cardType}>{item.type.toUpperCase()}</Text>
                <Text style={s.cardDate}>{relativeDate(item.createdAt)}</Text>
              </View>
              <Text style={s.cardTitle} numberOfLines={2}>{item.title || 'Untitled'}</Text>
              {item.summary ? (
                <Text style={s.cardSnip} numberOfLines={2}>{item.summary}</Text>
              ) : item.text && item.text !== item.title ? (
                <Text style={s.cardSnip} numberOfLines={2}>{item.text}</Text>
              ) : null}
              <View style={s.cardFoot}>
                {item.source ? <Text style={s.cardSrc}>{item.source}</Text> : null}
                {item.tags.length > 0 ? <Text style={s.cardTags}>{item.tags.map((t) => `#${t}`).join('  ')}</Text> : null}
                {(() => {
                  const aiOnly = item.aiTags.filter((t) => !item.tags.includes(t));
                  return aiOnly.length > 0 ? <Text style={s.cardTagsAi}>{aiOnly.map((t) => `✦${t}`).join('  ')}</Text> : null;
                })()}
                {item.enrichStatus === 'pending' ? <Text style={s.cardPending}>summarizing…</Text> : null}
              </View>
            </TouchableOpacity>
          </Swipeable>
        )}
      />
    </View>
  );
}

function Stat({ n, k, accent }: { n: number; k: string; accent?: boolean }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statN, accent && { color: C.accent }]}>{n}</Text>
      <Text style={s.statK}>{k}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, paddingHorizontal: 12 },
  slash: { color: C.accent, fontWeight: '700', fontSize: 16, marginRight: 8 },
  search: { flex: 1, color: C.fg, fontSize: 15, paddingVertical: 11 },
  statsStrip: { flexDirection: 'row', marginTop: 14, backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRightColor: C.line, borderRightWidth: StyleSheet.hairlineWidth },
  statN: { color: C.fg, fontSize: 20, fontWeight: '800' },
  statK: { color: C.fg3, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  tagRail: { gap: 8, paddingVertical: 14, paddingRight: 8 },
  chip: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipTxt: { color: C.fg2, fontSize: 13 },
  chipTxtOn: { color: C.accentInk, fontWeight: '700' },
  count: { color: C.fg3, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 2 },
  card: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardType: { color: C.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  cardDate: { color: C.fg3, fontSize: 11 },
  cardTitle: { color: C.fg, fontSize: 17, fontWeight: '600' },
  cardSnip: { color: C.fg2, fontSize: 13, marginTop: 4 },
  cardFoot: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  cardSrc: { color: C.fg2, fontSize: 12 },
  cardTags: { color: C.fg3, fontSize: 12 },
  cardTagsAi: { color: C.accent, fontSize: 12 },
  cardPending: { color: C.fg3, fontSize: 11, fontStyle: 'italic' },
  swipeDelete: { backgroundColor: C.danger, justifyContent: 'center', alignItems: 'center', width: 88, marginBottom: 12, borderRadius: RADIUS },
  swipeDeleteTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 64 },
  emptyGlyph: { color: C.line2, fontSize: 44, fontWeight: '800' },
  emptyMark: { color: C.fg, fontSize: 18, fontWeight: '600', marginTop: 8 },
  emptyTxt: { color: C.fg2, fontSize: 14, textAlign: 'center', marginTop: 8, maxWidth: 260 },
});
