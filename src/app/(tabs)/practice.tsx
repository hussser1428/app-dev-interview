// Tab Luyện: lộ trình theo chủ đề của từng mảng, câu đã lưu, câu yếu từ phỏng vấn AI.
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { retryPlan, setPending } from "@/lib/api";
import { byTrack, getQuestion, questions, roadmap, title } from "@/lib/data";
import { isDone, levelName, toggleWeak, tr, trackName, tracks, type Track, type WeakItem } from "@/lib/shared";
import { updateProgress, usePrefs, useProgress } from "@/lib/store";
import { Bar, Btn, C, Card, Chip, Icon, lc, PickerSheet, s, Screen, Tag, tc, tint, trackIco } from "@/ui/kit";

type Tab = "road" | "saved" | "weak";

export default function Practice() {
  const p = useProgress();
  const pf = usePrefs();
  const [tab, setTab] = useState<Tab>("road");
  const [track, setTrack] = useState<Track>(pf.tracks[0] ?? "backend");
  const [pick, setPick] = useState(false);
  const saved = questions.filter((q) => p.q[q.id]?.saved);
  const weak = [...(p.weak ?? [])].reverse().sort((a, b) => Number(!!a.done) - Number(!!b.done));
  const weakLeft = weak.filter((w) => !w.done).length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={[s.pad, { gap: 14, paddingTop: 8, paddingBottom: 24 }]}>
        <View style={[s.row, { gap: 8 }]}>
          <Chip label={tr("Lộ trình", "Path")} on={tab === "road"} onPress={() => setTab("road")} />
          <Chip label={tr("Đã lưu", "Saved")} icon="star" color={C.amber} count={saved.length} on={tab === "saved"} onPress={() => setTab("saved")} />
          <Chip label={tr("Câu yếu", "Weak")} icon="alert" color={C.red} count={weakLeft} on={tab === "weak"} onPress={() => setTab("weak")} style={tab !== "weak" && weakLeft ? { borderColor: C.redLine } : undefined} />
        </View>
        {tab === "road" && <Road track={track} onChange={() => setPick(true)} setTrack={setTrack} />}
        {tab === "saved" &&
          (saved.length ? (
            <Card>
              {saved.map((q, i) => (
                <Pressable key={q.id} onPress={() => router.push(`/q/${q.id}`)} style={[s.row, { padding: 14, gap: 12 }, i > 0 && s.sep]}>
                  <Icon name="star" size={18} color={C.amber} fill={C.amber} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[s.b14, { fontWeight: "600" }]} numberOfLines={2}>{title(q)}</Text>
                    <Text style={s.xs}>{trackName[q.track]} · {q.topic}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          ) : (
            <Empty text={tr("Chưa lưu câu nào. Bấm ☆ ở một câu hỏi để lưu lại.", "Nothing saved yet. Tap ☆ on a question to save it.")} />
          ))}
        {tab === "weak" && (weak.length ? weak.map((w) => <Weak key={w.id} w={w} />) : <Empty text={tr("Chưa có câu yếu. Câu nào dưới 5 điểm trong phỏng vấn AI sẽ hiện ở đây.", "No weak answers yet. Anything scored below 5 in an AI interview shows up here.")} />)}
      </ScrollView>
      <PickerSheet
        visible={pick}
        title={tr("Chọn mảng", "Pick a field")}
        value={track}
        options={tracks.map((t) => ({ key: t, label: trackName[t], icon: trackIco(t), color: tc(t) }))}
        onPick={setTrack}
        onClose={() => setPick(false)}
      />
    </Screen>
  );
}

const Empty = ({ text }: { text: string }) => <Text style={[s.sub, { textAlign: "center", marginTop: 40, paddingHorizontal: 20 }]}>{text}</Text>;

function Road({ track, onChange, setTrack }: { track: Track; onChange: () => void; setTrack: (t: Track) => void }) {
  const p = useProgress();
  const pf = usePrefs();
  const topics = roadmap(track);
  const doneOf = (qs: { id: string }[]) => qs.filter((q) => isDone(p.q[q.id])).length;
  const all = byTrack(track);
  const cur = topics.findIndex((t) => doneOf(t.questions) < t.questions.length);
  const open = (topic: string) => router.push({ pathname: "/review", params: { track, topic } });

  return (
    <>
      <Card style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
        <View style={[s.row, { marginBottom: 4 }]}>
          <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: tint(tc(track), 0.11) }}>
            <Icon name={trackIco(track)} color={tc(track)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.b15, { fontWeight: "700" }]}>{trackName[track]}</Text>
            <Text style={s.xs}>{doneOf(all)}/{all.length} {tr("câu", "questions")} · {levelName[pf.level]}</Text>
          </View>
          <Pressable onPress={onChange} style={[s.row, { gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: C.hover }]}>
            <Text style={[s.xs, { color: C.muted }]}>{tr("Đổi", "Change")}</Text>
            <Icon name="down" size={14} color={C.muted} />
          </Pressable>
        </View>
        <Pressable onPress={() => router.push({ pathname: "/review", params: { track } })} style={[s.row, { gap: 8, marginVertical: 8, height: 40, borderRadius: 12, justifyContent: "center", backgroundColor: C.brandSoft, borderWidth: 1, borderColor: C.brandLine }]}>
          <Icon name="layers" size={17} color={C.brand} />
          <Text style={{ color: C.brand, fontWeight: "700", fontSize: 14 }}>{tr(`Ôn cả mảng · ${all.length} thẻ`, `Review all · ${all.length} cards`)}</Text>
        </Pressable>
        {topics.map((t, i) => {
          const d = doneOf(t.questions);
          const full = d === t.questions.length;
          const isCur = i === cur;
          return (
            <Pressable key={t.topic} onPress={() => open(t.topic)} style={[s.row, { gap: 12, paddingVertical: 11 }, i > 0 && s.sep]}>
              <View style={{ width: 28, height: 28, borderRadius: 99, alignItems: "center", justifyContent: "center", backgroundColor: full ? C.green : isCur ? C.brand : C.hover }}>
                {full ? <Icon name="check" size={14} color="#fff" width={3} /> : <Text style={{ fontSize: 13, fontWeight: "800", color: isCur ? "#fff" : C.subtle }}>{i + 1}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.b14}>{t.topic}</Text>
                {isCur && <Bar value={d / t.questions.length} style={{ marginTop: 6 }} />}
              </View>
              {isCur ? (
                <View style={{ backgroundColor: C.brand, borderRadius: 11, paddingHorizontal: 12, height: 34, justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{tr("Tiếp tục", "Continue")}</Text>
                </View>
              ) : (
                <Text style={s.xs}>{d}/{t.questions.length}</Text>
              )}
            </Pressable>
          );
        })}
      </Card>
      <Text style={[s.h2, { marginTop: 4 }]}>{tr("Mảng khác", "Other fields")}</Text>
      <Card>
        {tracks.filter((t) => t !== track).map((t, i) => {
          const qs = byTrack(t);
          return (
            <Pressable key={t} onPress={() => setTrack(t)} style={[s.row, { padding: 12, paddingHorizontal: 14, gap: 12 }, i > 0 && s.sep]}>
              <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tint(tc(t), 0.11) }}>
                <Icon name={trackIco(t)} size={18} color={tc(t)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.b14}>{trackName[t]}</Text>
                <Bar value={doneOf(qs) / qs.length} color={tc(t)} style={{ marginTop: 6 }} />
              </View>
              <Text style={s.xs}>{doneOf(qs)}/{qs.length}</Text>
            </Pressable>
          );
        })}
      </Card>
    </>
  );
}

function Weak({ w }: { w: WeakItem }) {
  const [open, setOpen] = useState(false);
  const related = w.related ? getQuestion(w.related) : undefined;
  const retry = () => {
    setPending({ track: w.track, level: w.level, style: w.style, total: 3, context: retryPlan([w]) });
    router.push("/room");
  };
  return (
    <Card style={{ opacity: w.done ? 0.6 : 1 }}>
      <Pressable onPress={() => setOpen(!open)} style={[s.row, { padding: 14, gap: 12, alignItems: "flex-start" }]}>
        <View style={{ width: 38, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: w.score >= 4.5 ? C.amberSoft : C.redSoft }}>
          <Text style={{ fontWeight: "800", fontSize: 14, color: w.score >= 4.5 ? C.amber : C.red }}>{w.score}</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[s.b14, { fontWeight: "600", lineHeight: 20 }]}>{w.question}</Text>
          <View style={[s.row, { gap: 6 }]}>
            <Tag label={trackName[w.track]} color={tc(w.track)} />
            <Tag label={levelName[w.level]} color={lc(w.level)} />
            {w.done && <Text style={[s.xs, { color: C.green }]}>{tr("Đã nắm", "Got it")}</Text>}
          </View>
        </View>
        <Icon name={open ? "down" : "chev"} size={16} color={C.subtle} />
      </Pressable>
      {open && (
        <View style={[s.sep, { padding: 14, gap: 10 }]}>
          {!!w.answer && <Section label={tr("BẠN ĐÃ TRẢ LỜI", "YOUR ANSWER")} text={w.answer} />}
          <Section label={tr("NHẬN XÉT", "FEEDBACK")} text={w.feedback} />
          <Section label={tr("CÂU TRẢ LỜI MẪU", "MODEL ANSWER")} text={w.betterAnswer} />
          {!!w.nextTime && <Section label={tr("LẦN SAU NÊN", "NEXT TIME")} text={w.nextTime} />}
          {related && (
            <Pressable onPress={() => router.push(`/q/${related.id}`)} style={[s.row, { gap: 6 }]}>
              <Text style={{ color: C.brand, fontWeight: "700", fontSize: 14, flex: 1 }} numberOfLines={1}>{tr("Câu liên quan", "Related")}: {title(related)}</Text>
              <Icon name="chev" size={16} color={C.brand} />
            </Pressable>
          )}
          <View style={[s.row, { gap: 8 }]}>
            <Btn label={tr("Luyện lại", "Retry")} icon="rotate" onPress={retry} style={{ flex: 1, height: 44 }} />
            <Btn label={w.done ? tr("Bỏ đã nắm", "Not yet") : tr("Đã nắm", "Got it")} icon="check" ghost onPress={() => updateProgress((p) => toggleWeak(p, w.id))} style={{ flex: 1, height: 44 }} />
          </View>
        </View>
      )}
    </Card>
  );
}

const Section = ({ label, text }: { label: string; text: string }) => (
  <View style={{ gap: 4 }}>
    <Text style={s.xs}>{label}</Text>
    <Text style={{ fontSize: 14.5, lineHeight: 21, color: C.body }}>{text}</Text>
  </View>
);
