// Kết quả buổi phỏng vấn AI gần nhất: điểm tổng, 3 tiêu chí, từng câu; câu yếu đã tự vào Câu yếu + lịch ôn.
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { retryPlan, setPending } from "@/lib/api";
import { levelName, tr, trackName, WEAK } from "@/lib/shared";
import { useLastReport, useProgress } from "@/lib/store";
import { Bar, Btn, C, Card, Icon, IconBtn, s, Screen, Tag, TopNav } from "@/ui/kit";

const verdict = (x: number) => (x >= 8 ? tr("Tốt", "Great") : x >= 6.5 ? tr("Khá", "Good") : x >= 5 ? tr("Trung bình", "Fair") : tr("Cần luyện thêm", "Needs practice"));
const scoreColor = (x: number) => (x >= 7 ? [C.green, C.greenSoft] : x >= WEAK ? [C.amber, C.amberSoft] : [C.red, C.redSoft]);

function Ring({ value }: { value: number }) {
  const r = 58;
  const len = 2 * Math.PI * r;
  return (
    <View style={{ width: 132, height: 132, alignItems: "center", justifyContent: "center" }}>
      <Svg width={132} height={132} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={66} cy={66} r={r} stroke={C.track} strokeWidth={12} fill="none" />
        <Circle cx={66} cy={66} r={r} stroke={C.brand} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray={`${(value / 10) * len} ${len}`} />
      </Svg>
      <Text style={{ fontSize: 36, fontWeight: "800", color: C.text }}>{value}</Text>
      <Text style={s.xs}>/10</Text>
    </View>
  );
}

export default function ReportScreen() {
  const last = useLastReport().v;
  const p = useProgress();
  const [open, setOpen] = useState<number | null>(null);
  if (!last) return <Screen><TopNav onLeft={router.back} /><Text style={[s.sub, s.pad]}>{tr("Chưa có buổi phỏng vấn nào.", "No interviews yet.")}</Text></Screen>;
  const { report: r, track, level, style } = last;
  const logs = p.interviews ?? [];
  const diff = logs.length > 1 ? Math.round((logs.at(-1)!.overall - logs.at(-2)!.overall) * 10) / 10 : null;
  const weakQs = r.questions.filter((q) => q.score < WEAK);

  const retry = () => {
    setPending({ track, level, style, total: Math.min(10, weakQs.length + 1), context: retryPlan(weakQs) });
    router.replace("/room");
  };
  const share = () =>
    Share.share({ message: `${tr("Phỏng vấn thử", "Mock interview:")} ${trackName[track]} ${levelName[level]} ${tr("trên", "on")} DevInterview: ${r.overall}/10 — ${r.summary}` });

  return (
    <Screen>
      <TopNav onLeft={router.back} center={<Text style={[s.h2, { textAlign: "center" }]}>{tr("Kết quả", "Results")}</Text>} right={<IconBtn name="send" onPress={share} />} />
      <ScrollView contentContainerStyle={[s.pad, { gap: 14, paddingTop: 4, paddingBottom: 16 }]}>
        <View style={[s.row, { gap: 18 }]}>
          <Ring value={r.overall} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: C.text }}>{verdict(r.overall)} · {levelName[level]}</Text>
            <Text style={s.sub}>{r.summary}</Text>
            {diff !== null && diff !== 0 && <Tag label={`${diff > 0 ? "↑" : "↓"} ${Math.abs(diff)} ${tr("so với lần trước", "vs last time")}`} color={diff > 0 ? C.green : C.red} style={{ marginTop: 6 }} />}
          </View>
        </View>
        <Card style={{ padding: 16, gap: 10 }}>
          {([[tr("Kiến thức", "Knowledge"), r.criteria.knowledge], [tr("Giải quyết vấn đề", "Problem solving"), r.criteria.problemSolving], [tr("Giao tiếp", "Communication"), r.criteria.communication]] as const).map(([l, v]) => (
            <View key={l} style={[s.row, { gap: 12 }]}>
              <Text style={[s.b14, { width: 128, fontWeight: "600" }]}>{l}</Text>
              <Bar value={v / 10} color={v >= WEAK ? C.brand : C.amber} style={{ flex: 1 }} />
              <Text style={[s.b14, { width: 30, textAlign: "right" }]}>{v}</Text>
            </View>
          ))}
        </Card>
        <Card>
          {r.questions.map((q, i) => {
            const [fg, bg] = scoreColor(q.score);
            return (
              <View key={i} style={i > 0 ? s.sep : undefined}>
                <Pressable onPress={() => setOpen(open === i ? null : i)} style={[s.row, { padding: 12, paddingHorizontal: 14, gap: 12 }]}>
                  <View style={{ width: 38, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: bg }}>
                    <Text style={{ fontWeight: "800", color: fg }}>{q.score}</Text>
                  </View>
                  <Text style={[s.b14, { flex: 1, fontWeight: "600" }]} numberOfLines={open === i ? undefined : 2}>{q.question}</Text>
                  {q.score < WEAK ? <Tag label={tr("Yếu", "Weak")} color={C.red} /> : <Icon name={open === i ? "down" : "chev"} size={16} color={C.subtle} />}
                </Pressable>
                {open === i && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
                    <Text style={s.xs}>{tr("NHẬN XÉT", "FEEDBACK")}</Text>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: C.body }}>{q.feedback}</Text>
                    <Text style={s.xs}>{tr("CÂU TRẢ LỜI MẪU", "MODEL ANSWER")}</Text>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: C.body }}>{q.betterAnswer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </Card>
        {weakQs.length > 0 && (
          <View style={[s.row, { gap: 10, backgroundColor: C.greenSoft, borderColor: C.greenLine, borderWidth: 1, borderRadius: 14, padding: 12 }]}>
            <Icon name="check" color={C.green} />
            <Text style={{ flex: 1, color: C.greenInk, fontWeight: "600", fontSize: 13.5 }}>
              {tr(`${weakQs.length} câu yếu đã lưu ở Luyện › Câu yếu`, `${weakQs.length} weak answers saved to Practice › Weak`)}
              {last.related ? tr(`, ${last.related} câu khớp ngân hàng đã vào phiên ôn`, `, ${last.related} matching bank questions added to review`) : ""}
            </Text>
          </View>
        )}
        {r.improvements.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={s.xs}>{tr("CẦN CẢI THIỆN", "TO IMPROVE")}</Text>
            {r.improvements.map((x) => <Text key={x} style={{ fontSize: 14, lineHeight: 20, color: C.body }}>• {x}</Text>)}
          </View>
        )}
      </ScrollView>
      <View style={[s.pad, { paddingVertical: 10 }]}>
        {weakQs.length ? <Btn label={tr(`Luyện lại ${weakQs.length} câu yếu ngay`, `Retry ${weakQs.length} weak answers now`)} icon="rotate" onPress={retry} /> : <Btn label={tr("Xong", "Done")} onPress={router.back} />}
      </View>
    </Screen>
  );
}
