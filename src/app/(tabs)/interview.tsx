// Tab Phỏng vấn: chọn vị trí, level, phong cách công ty, số câu → phòng phỏng vấn AI.
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { setPending } from "@/lib/api";
import { dict, levels, styleName, styles, tr, trackName, tracks, type Level, type Style, type Track } from "@/lib/shared";
import { prefs, useLastReport, usePrefs, useProgress, useProject } from "@/lib/store";
import { canListen } from "@/lib/voice";
import { Btn, C, Card, Chip, Icon, s, Screen, Seg, tc, trackIco } from "@/ui/kit";

const levelShort: Record<Level, string> = { intern: "Intern", junior: "Junior", mid: "Mid", senior: "Senior" };

export default function InterviewSetup() {
  const pf = usePrefs();
  const p = useProgress();
  const last = useLastReport().v;
  const proj = useProject().v;
  const [track, setTrack] = useState<Track>(pf.tracks[0] ?? "backend");
  const [level, setLevel] = useState<Level>(pf.level);
  const [style, setStyle] = useState<Style>(pf.style);
  const [total, setTotal] = useState("5");
  const past = [...(p.interviews ?? [])].reverse().slice(0, 5);

  const start = () => {
    prefs.update((x) => ({ ...x, style }));
    setPending({ track, level, style, total: Number(total) });
    router.push("/room");
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={[s.pad, { gap: 18, paddingTop: 8, paddingBottom: 24 }]}>
        <Text style={[s.sub, { fontSize: 15 }]}>{dict().interview.subtitle} {canListen ? tr("Trả lời bằng giọng nói hoặc gõ.", "Answer by voice or by typing.") : tr("Trả lời bằng cách gõ.", "Answer by typing.")}</Text>
        {/* Phỏng vấn về project của chính mình: màn riêng (/project) */}
        <Pressable onPress={() => router.push("/project")}>
          <Card style={[s.row, { padding: 14, gap: 12, borderColor: C.brandLine, backgroundColor: C.brandSoft }]}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}>
              <Icon name="git" color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.b14}>{dict().nav.project} · Beta</Text>
              <Text style={s.xs} numberOfLines={2}>{proj ? `📦 ${proj.name} · ${proj.questions.length} ${tr("câu hỏi", "questions")}` : dict().project.subtitle}</Text>
            </View>
            <Icon name="chev" size={16} color={C.brand} />
          </Card>
        </Pressable>
        <View style={{ gap: 8 }}>
          <Text style={s.b14}>{dict().interview.track}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {tracks.map((t) => (
              <Chip key={t} small label={trackName[t]} icon={trackIco(t)} color={tc(t)} on={t === track} onPress={() => setTrack(t)} />
            ))}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={s.b14}>Level</Text>
          <Seg options={levels.map((l) => ({ key: l, label: levelShort[l] }))} value={level} onChange={setLevel} />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={s.b14}>{tr("Loại công ty", "Company type")}</Text>
          <Seg options={styles.map((x) => ({ key: x, label: styleName[x] }))} value={style} onChange={setStyle} />
          <Text style={s.xs}>{dict().interview.styleDesc[style]}</Text>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={s.b14}>{dict().interview.countLabel}</Text>
          <Seg options={["3", "5", "7"].map((n) => ({ key: n, label: tr(`${n} câu`, `${n} questions`) }))} value={total} onChange={setTotal} />
        </View>
        <Btn label={dict().interview.start} icon="mic" onPress={start} />
        {last && (
          <Pressable onPress={() => router.push("/report")}>
            <Card style={[s.row, { padding: 14, gap: 12 }]}>
              <Icon name="bars" color={C.brand} />
              <Text style={[s.b14, { flex: 1 }]}>{tr("Xem kết quả buổi gần nhất", "Last interview results")} · {last.report.overall}/10</Text>
              <Icon name="chev" size={16} color={C.subtle} />
            </Card>
          </Pressable>
        )}
        {past.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={s.b14}>{tr("Các buổi gần đây", "Recent interviews")}</Text>
            <Card>
              {past.map((x, i) => (
                <View key={i} style={[s.row, { padding: 12, paddingHorizontal: 14 }, i > 0 && s.sep]}>
                  <Text style={[s.b14, { flex: 1, fontWeight: "600" }]}>{trackName[x.track]} · {levelShort[x.level]} · {styleName[x.style]}</Text>
                  <Text style={s.xs}>{x.date.slice(8)}/{x.date.slice(5, 7)}</Text>
                  <Text style={{ width: 40, textAlign: "right", fontWeight: "800", color: x.overall >= 7 ? C.green : x.overall >= 5 ? C.amber : C.red }}>{x.overall}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
