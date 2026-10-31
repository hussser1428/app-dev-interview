// Tab Câu hỏi: ngân hàng câu hỏi, lọc mảng / level / trạng thái / đã lưu, nhóm theo chủ đề theo thứ tự lộ trình.
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, SectionList, Text, TextInput, View } from "react-native";
import { questions, title, type Question } from "@/lib/data";
import { daysBetween, isDone, isDue, levelName, levels, pick, today, tr, trackName, tracks, type Level, type QState, type Track } from "@/lib/shared";
import { prefs, useProgress } from "@/lib/store";
import { C, Card, Chip, Icon, lc, PickerSheet, s, Screen, Tag, tc, trackIco } from "@/ui/kit";

type Status = "" | "new" | "due" | "hard" | "done";
const statusName = (): Record<Status, string> => ({
  "": tr("Trạng thái", "Status"), new: tr("Chưa làm", "Not done"), due: tr("Đến hạn", "Due"), hard: tr("Khó", "Hard"), done: tr("Đã làm", "Done"),
});

/** Bỏ dấu để gõ "index cham" vẫn ra "Index làm chậm". */
const fold = (x: string) => x.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").toLowerCase();
const haystack = new Map(questions.map((q) => [q.id, fold(`${pick(q.q, "vi")} ${pick(q.q, "en")} ${q.topic}`)]));

function status(st: QState | undefined, now: string): Exclude<Status, ""> {
  if (isDue(st, now)) return "due";
  if (st?.rating === 1) return "hard";
  return isDone(st) ? "done" : "new";
}

export default function Bank() {
  const p = useProgress();
  const [track, setTrack] = useState<Track | "">(prefs.read().tracks[0] ?? "");
  const [level, setLevel] = useState<Level | "">("");
  const [stat, setStat] = useState<Status>("");
  const [saved, setSaved] = useState(false);
  const [q, setQ] = useState("");
  const [sheet, setSheet] = useState<"level" | "status" | null>(null);
  const now = today();

  const sections = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    const groups = new Map<string, { title: string; data: Question[]; total: number; done: number }>();
    const topicNo = new Map<string, number>();
    for (const x of questions) {
      const key = `${x.track}|${x.topic}`;
      if (!topicNo.has(key)) topicNo.set(key, [...topicNo.keys()].filter((k) => k.startsWith(x.track + "|")).length + 1);
      if (track && x.track !== track) continue;
      const g = groups.get(key) ?? { title: `${topicNo.get(key)} · ${track ? "" : trackName[x.track] + " · "}${x.topic}`, data: [], total: 0, done: 0 };
      g.total++;
      if (isDone(p.q[x.id])) g.done++;
      groups.set(key, g);
      if (level && x.level !== level) continue;
      if (stat && status(p.q[x.id], now) !== stat) continue;
      if (saved && !p.q[x.id]?.saved) continue;
      if (words.length && !words.every((w) => haystack.get(x.id)!.includes(w))) continue;
      g.data.push(x);
    }
    return [...groups.values()].filter((g) => g.data.length);
  }, [track, level, stat, saved, q, p, now]);
  const count = sections.reduce((n, g) => n + g.data.length, 0);

  return (
    <Screen>
      <View style={[s.pad, { gap: 12, paddingTop: 8, paddingBottom: 8 }]}>
        <View style={s.search}>
          <Icon name="search" color={C.subtle} />
          <TextInput value={q} onChangeText={setQ} placeholder={tr(`Tìm trong ${questions.length} câu…`, `Search ${questions.length} questions…`)} placeholderTextColor={C.subtle} style={s.searchT} clearButtonMode="while-editing" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          <Chip small label={tr("Tất cả", "All")} on={!track} onPress={() => setTrack("")} />
          {tracks.map((t) => (
            <Chip key={t} small label={trackName[t]} icon={trackIco(t)} color={tc(t)} on={track === t} onPress={() => setTrack(t)} />
          ))}
        </ScrollView>
        <View style={[s.row, { gap: 8 }]}>
          <Chip small label={level ? levelName[level] : "Level"} on={!!level} onPress={() => setSheet("level")} />
          <Chip small label={statusName()[stat]} on={!!stat} onPress={() => setSheet("status")} />
          <Chip small label={tr("Đã lưu", "Saved")} icon="star" color={C.amber} on={saved} onPress={() => setSaved(!saved)} />
        </View>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(x) => x.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[s.pad, { paddingBottom: 24 }]}
        keyboardDismissMode="on-drag"
        ListEmptyComponent={<Text style={[s.sub, { textAlign: "center", marginTop: 40 }]}>{tr("Không có câu nào khớp bộ lọc.", "No questions match these filters.")}</Text>}
        renderSectionHeader={({ section }) => (
          <View style={[s.row, { marginTop: 14, marginBottom: 8 }]}>
            <Text style={[s.xs, { flex: 1, fontWeight: "800", letterSpacing: 0.6 }]}>{section.title.toUpperCase()}</Text>
            <Text style={s.xs}>{section.done}/{section.total} {tr("đã làm", "done")}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <Row q={item} st={p.q[item.id]} now={now} first={index === 0} last={index === section.data.length - 1} />
        )}
        ListFooterComponent={count ? <Text style={[s.xs, { textAlign: "center", marginTop: 16 }]}>{count} {tr("câu", "questions")}</Text> : undefined}
      />
      <PickerSheet
        visible={sheet === "level"}
        title="Level"
        value={level}
        options={[{ key: "" as const, label: tr("Tất cả level", "All levels") }, ...levels.map((l) => ({ key: l, label: levelName[l] }))]}
        onPick={setLevel}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === "status"}
        title={tr("Trạng thái", "Status")}
        value={stat}
        options={(Object.keys(statusName()) as Status[]).map((k) => ({ key: k, label: k ? statusName()[k] : tr("Tất cả", "All") }))}
        onPick={setStat}
        onClose={() => setSheet(null)}
      />
    </Screen>
  );
}

function Row({ q, st, now, first, last }: { q: Question; st?: QState; now: string; first: boolean; last: boolean }) {
  const k = status(st, now);
  const mark = {
    done: { bg: C.green, line: C.green, icon: "check" as const, color: "#fff" },
    due: { bg: C.amberSoft, line: C.amberLine, icon: "clock" as const, color: C.amber },
    hard: { bg: C.redSoft, line: C.redLine, icon: "alert" as const, color: C.red },
    new: { bg: "transparent", line: C.line2, icon: null, color: "" },
  }[k];
  const note =
    k === "due" ? <Text style={[s.xs, { color: C.amber }]}>{tr("Đến hạn ôn", "Due for review")}</Text>
    : k === "hard" ? <Text style={[s.xs, { color: C.red }]}>{tr(`Khó · ôn lại sau ${daysBetween(now, st!.due!)} ngày`, `Hard · review in ${daysBetween(now, st!.due!)} days`)}</Text>
    : k === "done" ? <Text style={s.xs}>{tr(`Ôn lại sau ${daysBetween(now, st!.due!)} ngày`, `Review in ${daysBetween(now, st!.due!)} days`)}</Text>
    : <Text style={s.xs}>{tr("Chưa làm", "Not done")}</Text>;
  return (
    <Card style={{ borderRadius: 0, borderTopWidth: first ? 1 : 0, borderTopLeftRadius: first ? 18 : 0, borderTopRightRadius: first ? 18 : 0, borderBottomLeftRadius: last ? 18 : 0, borderBottomRightRadius: last ? 18 : 0 }}>
      <Pressable onPress={() => router.push(`/q/${q.id}`)} style={[s.row, { alignItems: "flex-start", gap: 12, padding: 14 }]}>
        <View style={{ width: 24, height: 24, borderRadius: 99, borderWidth: 1.5, borderStyle: k === "new" ? "dashed" : "solid", borderColor: mark.line, backgroundColor: mark.bg, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
          {mark.icon && <Icon name={mark.icon} size={13} color={mark.color} width={k === "done" ? 3 : 2.2} />}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[s.b15, { fontSize: 14.5, lineHeight: 20 }]} numberOfLines={2}>{title(q)}</Text>
          <View style={[s.row, { gap: 6 }]}>
            <Tag label={levelName[q.level]} color={lc(q.level)} />
            {q.code && <Icon name="code" size={14} color={C.subtle} />}
            {note}
          </View>
        </View>
        {st?.saved && <Icon name="star" size={18} color={C.amber} fill={C.amber} />}
      </Pressable>
    </Card>
  );
}
