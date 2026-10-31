// Tab Hôm nay: một nút chính (phiên ôn), đếm ngược ngày phỏng vấn, lối tắt phỏng vấn AI / lộ trình, tuần học.
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { byTrack, roadmap, SESSION } from "@/lib/data";
import { addDays, bcp47, buildQueue, daysBetween, isDone, isDue, levelName, streak, today, tr, trackName } from "@/lib/shared";
import { usePrefs, useProgress, useSession, type Session } from "@/lib/store";
import { Bar, C, Card, Icon, IconBtn, s, Screen, tc, type Name } from "@/ui/kit";

const weekdays = () => tr("T2 T3 T4 T5 T6 T7 CN", "Mo Tu We Th Fr Sa Su").split(" ");
const sessionTitle = (x: Session) =>
  x.kind === "topic" ? `${trackName[x.track!]} · ${x.topic}`
  : x.kind === "track" ? tr(`Cả mảng ${trackName[x.track!]}`, `All of ${trackName[x.track!]}`)
  : tr("Phiên hôm nay", "Today's session");

export default function Today() {
  const p = useProgress();
  const pf = usePrefs();
  const now = today();
  const ids = pf.tracks.flatMap((t) => byTrack(t).map((q) => q.id));
  const queue = buildQueue(ids, p, SESSION, now);
  const hard = queue.filter((id) => isDue(p.q[id], now) && p.q[id].rating === 1).length;
  const due = queue.filter((id) => isDue(p.q[id], now)).length - hard;
  const fresh = queue.length - due - hard;
  const st = streak(p.days, now);
  const done = ids.filter((id) => isDone(p.q[id])).length;
  // Phiên ôn đang dở. Phiên hôm nay của ngày cũ thì bỏ (thẻ đến hạn đã khác), phiên chủ đề / cả mảng thì giữ.
  const sess = useSession().v;
  const open = sess && sess.i < sess.ids.length && (sess.kind !== "today" || sess.date === now) ? sess : undefined;
  const resumeToday = open?.kind === "today";
  const resume = () => router.push({ pathname: "/review", params: { resume: "1" } });
  const left = p.interviewDate && p.interviewDate >= now ? daysBetween(now, p.interviewDate) : null;

  // Chủ đề đang học: chủ đề đầu tiên còn câu chưa làm của mảng chính.
  const main = pf.tracks[0];
  const topics = main ? roadmap(main) : [];
  const cur = topics.find((t) => t.questions.some((q) => !isDone(p.q[q.id])));
  const ready = ids.length ? Math.round((done / ids.length) * 100) : 0;
  const untouched = pf.tracks.flatMap((t) => roadmap(t)).filter((t) => !t.questions.some((q) => isDone(p.q[q.id]))).length;

  // Tuần hiện tại, bắt đầu từ thứ Hai.
  const dow = (new Date(`${now}T00:00`).getDay() + 6) % 7;
  const week = weekdays().map((label, i) => ({ label, day: addDays(now, i - dow) }));

  return (
    <Screen>
      <ScrollView contentContainerStyle={[s.pad, { gap: 16, paddingTop: 8, paddingBottom: 24 }]}>
        <View style={s.row}>
          <Text style={[s.h2, { flex: 1 }]}>{new Date().toLocaleDateString(bcp47(), { weekday: "long", day: "numeric", month: "numeric" })}</Text>
          <View style={[s.row, { gap: 5, height: 36, paddingHorizontal: 12, borderRadius: 99, backgroundColor: C.tip, borderWidth: 1, borderColor: C.tipLine }]}>
            <Icon name="flame" size={18} color={C.tipHead} />
            <Text style={{ color: C.tipHead, fontWeight: "800", fontSize: 15 }}>{st}</Text>
          </View>
          <IconBtn name="gear" color={C.muted} onPress={() => router.push("/onboarding")} />
        </View>

        {open && !resumeToday && (
          <Pressable onPress={resume}>
            <Card style={[s.row, { padding: 14, gap: 12, borderColor: C.brandLine, backgroundColor: C.brandSoft }]}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}>
                <Icon name="play" size={16} color="#fff" fill="#fff" width={0} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.b14} numberOfLines={1}>{tr("Ôn tiếp", "Resume")}: {sessionTitle(open)}</Text>
                <Bar value={open.i / open.ids.length} style={{ marginTop: 6, marginBottom: 4 }} />
                <Text style={s.xs}>{tr(`Đã ôn ${open.i}/${open.ids.length} thẻ · còn ${open.ids.length - open.i} thẻ`, `${open.i}/${open.ids.length} cards done · ${open.ids.length - open.i} left`)}</Text>
              </View>
              <Icon name="chev" size={18} color={C.brand} />
            </Card>
          </Pressable>
        )}

        {/* Thẻ phiên hôm nay: gradient xanh teal (g-teal của web), khác màu tím thương hiệu */}
        <View style={{ borderRadius: 24, padding: 20, backgroundColor: "#0e9f8a", overflow: "hidden", shadowColor: "#0e7490", shadowOpacity: 0.32, shadowRadius: 15, shadowOffset: { width: 0, height: 12 }, elevation: 6 }}>
          <View style={{ position: "absolute", top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: "#0e7490", opacity: 0.55 }} />
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15, opacity: 0.9 }}>{tr("Phiên hôm nay", "Today's session")}</Text>
            <Text style={{ color: "#fff", fontSize: 12, opacity: 0.85 }}>{pf.tracks.map((t) => trackName[t]).join(" · ")}</Text>
          </View>
          <View style={[s.row, { alignItems: "baseline", gap: 8, marginTop: 6 }]}>
            <Text style={{ color: "#fff", fontSize: 44, fontWeight: "800", letterSpacing: -1 }}>{queue.length}</Text>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{tr("phút", "min")}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginVertical: 16 }}>
            {[[due, tr("thẻ đến hạn", "due")], [hard, tr("câu khó", "hard")], [fresh, tr("câu mới", "new")]].map(([n, l]) => (
              <View key={l} style={{ flex: 1, backgroundColor: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.18)", borderWidth: 1, borderRadius: 14, padding: 10 }}>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>{n}</Text>
                <Text style={{ color: "#fff", fontSize: 12, opacity: 0.85 }}>{l}</Text>
              </View>
            ))}
          </View>
          <Pressable
            disabled={!queue.length && !resumeToday}
            onPress={resumeToday ? resume : () => router.push("/review")}
            style={[s.row, { height: 52, borderRadius: 14, backgroundColor: "#fff", justifyContent: "center", gap: 8, opacity: queue.length || resumeToday ? 1 : 0.6 }]}
          >
            <Icon name="play" size={16} color="#115e59" fill="#115e59" width={0} />
            <Text style={{ color: "#115e59", fontWeight: "800", fontSize: 16 }}>{resumeToday ? `${tr("Ôn tiếp", "Resume")} · ${open.i}/${open.ids.length}` : queue.length ? tr("Bắt đầu ôn", "Start review") : tr("Đã ôn hết hôm nay 🎉", "All done for today 🎉")}</Text>
          </Pressable>
        </View>

        {left !== null && (
          <Card style={[s.row, { padding: 16, gap: 12 }]}>
            <Tile icon="cal" color={C.tipHead} />
            <View style={{ flex: 1 }}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={s.b14}>{tr("Phỏng vấn", "Interview:")} {trackName[main]} {levelName[pf.level]}</Text>
                <Text style={[s.b14, { color: C.tipHead }]}>{left ? tr(`${left} ngày`, `${left} days`) : tr("Hôm nay!", "Today!")}</Text>
              </View>
              <Bar value={ids.length ? done / ids.length : 0} style={{ marginTop: 8, marginBottom: 4 }} />
              <Text style={s.xs}>{tr(`Sẵn sàng ${ready}% · còn ${untouched} chủ đề chưa ôn`, `${ready}% ready · ${untouched} topics not started`)}</Text>
            </View>
          </Card>
        )}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable style={{ flex: 1 }} onPress={() => router.push("/interview")}>
            <Card style={{ padding: 14, gap: 10 }}>
              <Tile icon="mic" color={C.red} />
              <View>
                <Text style={[s.b15, { fontWeight: "700" }]}>{tr("Phỏng vấn AI", "AI interview")}</Text>
                <Text style={s.xs}>{tr("5 câu · nói hoặc gõ", "5 questions · speak or type")}</Text>
              </View>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} disabled={!cur} onPress={() => cur && router.push({ pathname: "/review", params: { track: main, topic: cur.topic } })}>
            <Card style={{ padding: 14, gap: 10 }}>
              <Tile icon="map" color={main ? tc(main) : C.brand} />
              <View>
                <Text style={[s.b15, { fontWeight: "700" }]}>{tr("Tiếp lộ trình", "Continue path")}</Text>
                <Text style={s.xs} numberOfLines={1}>
                  {cur ? `${cur.topic} · ${cur.questions.filter((q) => isDone(p.q[q.id])).length}/${cur.questions.length}` : tr("Đã xong lộ trình", "Path complete")}
                </Text>
              </View>
            </Card>
          </Pressable>
        </View>

        <Card style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16 }}>
          {week.map(({ label, day }) => {
            const ok = !!p.days[day];
            const isToday = day === now;
            return (
              <View key={day} style={{ alignItems: "center", gap: 6 }}>
                <View style={{ width: 32, height: 32, borderRadius: 99, alignItems: "center", justifyContent: "center", backgroundColor: ok ? C.brand : "transparent", borderWidth: ok ? 0 : isToday ? 2 : 1.5, borderColor: isToday ? C.brand : C.line2, borderStyle: ok || isToday ? "solid" : "dashed" }}>
                  {ok && <Icon name="check" size={15} color="#fff" width={3} />}
                </View>
                <Text style={[s.xs, isToday && { color: C.brand }]}>{label}</Text>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const Tile = ({ icon, color }: { icon: Name; color: string }) => (
  <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: color + "1c" }}>
    <Icon name={icon} color={color} />
  </View>
);
