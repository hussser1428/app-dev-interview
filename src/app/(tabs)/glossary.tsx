// Tab Thuật ngữ: A–Z, lọc theo mảng + chưa hiểu/đã hiểu, thanh chữ cái bên phải để nhảy nhanh. Chạm 1 dòng → TermSheet.
import { useMemo, useRef, useState } from "react";
import { Pressable, SectionList, Text, TextInput, View } from "react-native";
import { appearsIn, glossary, termTracks, type Term } from "@/lib/data";
import { lang, pick, tr, trackName, tracks, type Track } from "@/lib/shared";
import { prefs, useProgress } from "@/lib/store";
import { Bar, C, Chip, Icon, mono, PickerSheet, s, Screen, Seg, tc, trackIco } from "@/ui/kit";
import { TermSheet } from "@/ui/term-sheet";

type Known = "all" | "todo" | "known";
const ROW = 66; // chiều cao cố định mỗi dòng để nhảy theo chữ cái chính xác (getItemLayout)
const HEAD = 34;
const letter = (t: Term) => (/^[a-z]/i.test(t.term) ? t.term[0].toUpperCase() : "#");

export default function Glossary() {
  const p = useProgress();
  const [track, setTrack] = useState<Track | "">(prefs.read().tracks[0] ?? "");
  const [known, setKnown] = useState<Known>("todo");
  const [q, setQ] = useState("");
  const [pick_, setPick] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const list = useRef<SectionList<Term>>(null);
  const isKnown = (id: string) => !!p.terms?.[id];

  const inTrack = useMemo(() => glossary.filter((t) => !track || termTracks(t.id).includes(track)), [track]);
  const counts = { all: inTrack.length, known: inTrack.filter((t) => isKnown(t.id)).length };
  const sections = useMemo(() => {
    const w = q.trim().toLowerCase();
    const out = new Map<string, { title: string; key: string; data: Term[] }>();
    for (const t of inTrack) {
      if (known === "known" && !isKnown(t.id)) continue;
      if (known === "todo" && isKnown(t.id)) continue;
      if (w && !`${t.term} ${t.match.join(" ")} ${pick(t.def, lang())}`.toLowerCase().includes(w)) continue;
      const l = letter(t);
      if (!out.has(l)) out.set(l, { title: l, key: l, data: [] });
      out.get(l)!.data.push(t);
    }
    return [...out.values()].sort((x, y) => Number(x.title === "#") - Number(y.title === "#")); // "#" (.NET, 2PC…) ở cuối
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTrack, known, q, p.terms]);

  // SectionList trải phẳng: [header, ...dòng, footer] cho mỗi nhóm.
  const layout = useMemo(() => {
    const ls: number[] = [];
    for (const sec of sections) ls.push(HEAD, ...sec.data.map(() => ROW), 0);
    let off = 0;
    return ls.map((length, index) => ({ length, offset: (off += length) - length, index }));
  }, [sections]);

  const all = glossary.length;
  const knownAll = Object.keys(p.terms ?? {}).length;

  return (
    <Screen>
      <View style={[s.pad, { gap: 12, paddingTop: 8, paddingBottom: 4 }]}>
        <View style={s.row}>
          <Text style={[s.sub, { flex: 1, fontWeight: "600" }]}>{tr(`Đã hiểu ${knownAll}/${all} thuật ngữ`, `${knownAll}/${all} terms understood`)}</Text>
          <Text style={{ fontWeight: "700", color: C.green, fontSize: 13 }}>{Math.round((knownAll / all) * 100)}%</Text>
        </View>
        <Bar value={knownAll / all} color={C.green} style={{ marginTop: -6 }} />
        <View style={[s.row, { gap: 8 }]}>
          <View style={[s.search, { flex: 1 }]}>
            <Icon name="search" color={C.subtle} />
            <TextInput value={q} onChangeText={setQ} placeholder={tr("Tìm thuật ngữ…", "Search terms…")} placeholderTextColor={C.subtle} style={s.searchT} autoCapitalize="none" clearButtonMode="while-editing" />
          </View>
          <Chip label={track ? trackName[track] : tr("Mọi mảng", "All fields")} icon={track ? trackIco(track) : undefined} color={track ? tc(track) : undefined} onPress={() => setPick(true)} style={{ height: 46, borderRadius: 14, maxWidth: 150 }} />
        </View>
        <Seg
          options={[
            { key: "all" as const, label: tr("Tất cả", "All"), n: counts.all },
            { key: "todo" as const, label: tr("Chưa hiểu", "To learn"), n: counts.all - counts.known },
            { key: "known" as const, label: tr("Đã hiểu", "Known"), n: counts.known },
          ]}
          value={known}
          onChange={setKnown}
        />
      </View>
      <View style={{ flex: 1 }}>
        <SectionList
          ref={list}
          sections={sections}
          keyExtractor={(t) => `t-${t.id}`} // id "header" sẽ trùng key tiêu đề nhóm "H:header" của SectionList
          getItemLayout={(_, i) => layout[i] ?? { length: 0, offset: 0, index: i }}
          stickySectionHeadersEnabled={false}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 30, paddingBottom: 24 }}
          ListEmptyComponent={<Text style={[s.sub, { textAlign: "center", marginTop: 40 }]}>{tr("Không có thuật ngữ nào.", "No terms.")}</Text>}
          renderSectionHeader={({ section }) => (
            <Text style={{ height: HEAD, paddingTop: 12, paddingLeft: 4, fontSize: 13, fontWeight: "800", color: C.brand }}>{section.title}</Text>
          )}
          renderItem={({ item: t, index, section }) => {
            const first = index === 0;
            const last = index === section.data.length - 1;
            const n = appearsIn(t.id).length + (t.see ? 1 : 0);
            return (
              <Pressable
                onPress={() => setOpen(t.id)}
                style={[s.row, {
                  height: ROW, paddingHorizontal: 14, gap: 12, backgroundColor: C.surface, borderColor: C.line, borderLeftWidth: 1, borderRightWidth: 1,
                  borderTopWidth: first ? 1 : 0, borderBottomWidth: 1,
                  borderTopLeftRadius: first ? 18 : 0, borderTopRightRadius: first ? 18 : 0, borderBottomLeftRadius: last ? 18 : 0, borderBottomRightRadius: last ? 18 : 0,
                }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: mono, fontSize: 15, fontWeight: "700", color: C.text }} numberOfLines={1}>{t.term}</Text>
                  <Text style={[s.sub, { marginTop: 2 }]} numberOfLines={1}>{pick(t.def, lang())}</Text>
                </View>
                {isKnown(t.id) ? <Icon name="check" size={18} color={C.green} width={2.6} /> : n > 0 && <Text style={s.xs}>{n} {tr("câu", n === 1 ? "question" : "questions")}</Text>}
              </Pressable>
            );
          }}
        />
        <View style={{ position: "absolute", right: 4, top: 8, bottom: 8, justifyContent: "center" }}>
          {sections.map((sec, i) => (
            <Pressable key={sec.title} hitSlop={{ left: 12, right: 6 }} onPress={() => list.current?.scrollToLocation({ sectionIndex: i, itemIndex: 0, viewOffset: HEAD, animated: false })}>
              <Text style={{ fontSize: 10.5, fontWeight: "700", color: C.brand, lineHeight: 15, textAlign: "center", width: 16 }}>{sec.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <PickerSheet
        visible={pick_}
        title={tr("Lọc theo mảng", "Filter by field")}
        value={track}
        options={[{ key: "" as const, label: tr("Mọi mảng", "All fields") }, ...tracks.map((t) => ({ key: t, label: trackName[t], icon: trackIco(t), color: tc(t) }))]}
        onPick={setTrack}
        onClose={() => setPick(false)}
      />
      <TermSheet id={open} setId={setOpen} full />
    </Screen>
  );
}
