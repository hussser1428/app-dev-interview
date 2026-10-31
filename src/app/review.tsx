// Phiên ôn flashcard, lướt như lật trang: lướt trái = câu sau, lướt phải = câu trước (cả 2 mặt thẻ, lướt nhẹ là đủ).
// Chạm để lật xem đáp án, chạm lần nữa để lật lại; chấm Khó/Vừa/Dễ bằng nút ở mặt đáp án rồi sang câu sau.
// Không có params: phiên hôm nay (các mảng đang học). ?track: ôn cả mảng. ?track&topic: một chủ đề của lộ trình.
// ?resume=1: ôn tiếp phiên đang dở (lưu trong store.session sau mỗi thẻ).
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, ScrollView, Text, View, type PanResponderGestureState } from "react-native";
import { byTrack, getQuestion, SESSION, title } from "@/lib/data";
import { addDays, buildQueue, daysBetween, isDue, levelName, rate, ratingKey, ratingName, streak, today, tr, trackName, type Rating, type Track } from "@/lib/shared";
import { prefs, progress, session, updateProgress, useProgress, type Session } from "@/lib/store";
import { canListen, useVoice } from "@/lib/voice";
import { Btn, C, Icon, lc, s, Screen, Tag, tc, TopNav } from "@/ui/kit";
import { QuestionView } from "@/ui/question-view";
import { RateButtons } from "@/ui/rate";

const SWIPE = 30; // px tính từ lúc chạm: kéo nhẹ là đủ; vuốt nhanh (vận tốc > FLICK) thì ngắn hơn cũng qua
const FLICK = 0.3;

function makeSession(track?: Track, topic?: string): Session {
  const p = progress.read();
  const date = today();
  if (track && topic) {
    const ids = byTrack(track).filter((q) => q.topic === topic).map((q) => q.id);
    const q = buildQueue(ids, p, ids.length);
    // chủ đề đã xong hết thì cho học lại cả chủ đề
    return { ids: q.length ? q : ids, i: 0, kind: "topic", track, topic, date };
  }
  if (track) {
    // Cả mảng: thẻ đến hạn + thẻ mới (theo lộ trình) trước, rồi các thẻ đã làm còn lại, hạn gần trước.
    const ids = byTrack(track).map((q) => q.id);
    const first = buildQueue(ids, p, ids.length);
    const rest = ids.filter((id) => !first.includes(id)).sort((a, b) => (p.q[a]?.due ?? "").localeCompare(p.q[b]?.due ?? ""));
    return { ids: [...first, ...rest], i: 0, kind: "track", track, date };
  }
  const ids = prefs.read().tracks.flatMap((t) => byTrack(t).map((q) => q.id));
  return { ids: buildQueue(ids, p, SESSION), i: 0, kind: "today", date };
}

export default function Review() {
  const { track, topic, resume } = useLocalSearchParams<{ track?: Track; topic?: string; resume?: string }>();
  const [sess] = useState(() => {
    const old = session.read().v;
    return resume && old && old.i < old.ids.length ? old : makeSession(track, topic);
  });
  const queue = sess.ids;
  const [i, setI] = useState(sess.i);
  // Lưu vị trí sau mỗi thẻ; xong phiên thì xoá để Hôm nay không còn nút "ôn tiếp".
  useEffect(() => {
    session.update(() => (i < sess.ids.length ? { v: { ...sess, i } } : {}));
  }, [i, sess]);
  const [flipped, setFlipped] = useState(false);
  const [said, setSaid] = useState("");
  const voice = useVoice(setSaid);
  const p = useProgress();
  const [pan] = useState(() => new Animated.ValueXY());

  const id = queue[i];
  const q = id ? getQuestion(id) : undefined;
  const [rated, setRated] = useState(0); // số thẻ đã chấm trong lượt này (lướt qua thì không tính)

  /** Lật trang: d = 1 câu sau, -1 câu trước. i = queue.length là màn kết thúc. */
  function go(d: 1 | -1) {
    voice.stop();
    setSaid("");
    setFlipped(false);
    pan.setValue({ x: 0, y: 0 });
    setI((n) => Math.min(queue.length, Math.max(0, n + d)));
  }
  function next(r: Rating) {
    updateProgress((x) => rate(x, id, r));
    setRated((n) => n + 1);
    go(1);
  }
  // PanResponder tạo 1 lần, gọi hàm mới nhất qua ref (cập nhật sau mỗi lần render).
  const act = useRef({ go, flip: () => {}, canBack: false });
  useEffect(() => {
    act.current = { go, flip: () => { voice.stop(); setFlipped(true); }, canBack: i > 0 };
  });

  const [responders] = useState(() => {
    /** Thả tay: đủ xa hoặc đủ nhanh thì lật trang (true), không thì bật về chỗ cũ (false). */
    // min: ngưỡng tính từ lúc PanResponder nhận cử chỉ (dx đếm từ đó, không phải từ lúc chạm).
    const release = (g: PanResponderGestureState, min: number) => {
      const fast = Math.abs(g.vx) > FLICK && Math.abs(g.dx) > 8;
      let d: 1 | -1 | 0 = g.dx < -min || (fast && g.dx < 0) ? 1 : g.dx > min || (fast && g.dx > 0) ? -1 : 0;
      if (d === -1 && !act.current.canBack) d = 0;
      if (d) {
        const dir = d;
        Animated.timing(pan, { toValue: { x: dir === 1 ? -500 : 500, y: 0 }, duration: 160, useNativeDriver: false }).start(() => act.current.go(dir));
        return true;
      }
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      return false;
    };
    const common = {
      // Chỉ nhận lướt ngang rõ ràng, để cuộn dọc ở mặt đáp án vẫn bình thường.
      onMoveShouldSetPanResponderCapture: (_: unknown, g: PanResponderGestureState) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderTerminate: () => Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(),
    };
    return {
      // Mặt câu hỏi: nhận cả chạm (lật xem đáp án) lẫn lướt.
      front: PanResponder.create({
        ...common,
        onStartShouldSetPanResponder: () => true,
        onPanResponderRelease: (_, g) => {
          if (!release(g, SWIPE) && Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) act.current.flip();
        },
      }),
      // Mặt đáp án: chỉ bắt lướt ngang; chạm và cuộn dọc để cho nội dung bên trong.
      back: PanResponder.create({
        ...common,
        onPanResponderRelease: (_, g) => {
          release(g, SWIPE - 10); // mặt này chỉ nhận sau khi đã kéo > 10px
        },
      }),
    };
  });

  if (!q) {
    const st = streak(progress.read().days);
    return (
      <Screen>
        <TopNav onLeft={router.back} />
        <View style={[s.pad, { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }]}>
          <Text style={{ fontSize: 56 }}>🎉</Text>
          <Text style={s.h1}>{queue.length ? tr("Hết thẻ trong phiên", "End of session") : tr("Không còn thẻ nào", "No cards left")}</Text>
          <Text style={[s.sub, { textAlign: "center", fontSize: 15 }]}>
            {queue.length ? tr(`Bạn đã chấm ${rated}/${queue.length} thẻ.`, `You rated ${rated}/${queue.length} cards.`) : tr("Hôm nay bạn đã ôn hết.", "You're done for today.")}{" "}
            {st ? tr(`Chuỗi ${st} ngày liên tiếp 🔥`, `${st}-day streak 🔥`) : ""}
          </Text>
        </View>
        <View style={[s.pad, { paddingBottom: 12, gap: 10 }]}>
          {queue.length > 0 && <Btn ghost label={tr("Xem lại thẻ trước", "Back to last card")} icon="back" onPress={() => go(-1)} />}
          <Btn label={tr("Xong", "Done")} onPress={router.back} />
        </View>
      </Screen>
    );
  }

  const st = p.q[id];
  const progressBar = (
    <View style={[s.row, { gap: 12 }]}>
      <View style={{ flex: 1, height: 8, borderRadius: 99, backgroundColor: C.track, overflow: "hidden" }}>
        <View style={{ width: `${(i / queue.length) * 100}%`, height: "100%", backgroundColor: C.brand }} />
      </View>
      <Text style={[s.b14, { color: C.subtle }]}>{i + 1}/{queue.length}</Text>
    </View>
  );
  const hint = (
    <View style={[s.row, { justifyContent: "space-between", paddingHorizontal: 6 }]}>
      <Text style={[s.xs, i === 0 && { opacity: 0.4 }]}>‹ {tr("Lướt phải: câu trước", "Swipe right: previous")}</Text>
      <Text style={s.xs}>{tr("Lướt trái: câu sau", "Swipe left: next")} ›</Text>
    </View>
  );

  if (flipped)
    return (
      <Screen>
        <TopNav onLeft={router.back} center={progressBar} right={<View />} />
        <Animated.View {...responders.back.panHandlers} style={{ flex: 1, transform: [{ translateX: pan.x }] }}>
          <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 16 }]}>
            {/* Chạm chỗ trống để lật lại mặt câu hỏi; thuật ngữ, ☆, nút bên trong vẫn bấm riêng được. */}
            <Pressable onPress={() => setFlipped(false)} style={{ gap: 12 }}>
              <View style={[s.row, { gap: 6, alignSelf: "center" }]}>
                <Icon name="rotate" size={14} color={C.subtle} />
                <Text style={s.xs}>{tr("Chạm để lật lại câu hỏi", "Tap to flip back")}</Text>
              </View>
              {!!said && (
                <View style={{ gap: 4 }}>
                  <Text style={s.xs}>{tr("BẠN ĐÃ NÓI", "YOU SAID")}</Text>
                  <Text style={[s.sub, { fontSize: 14, lineHeight: 20 }]}>{said}</Text>
                </View>
              )}
              <QuestionView key={id} q={q} />
            </Pressable>
          </ScrollView>
        </Animated.View>
        <View style={[s.pad, { paddingVertical: 10, gap: 10 }]}>
          <RateButtons id={id} onRate={next} />
          {hint}
        </View>
      </Screen>
    );

  const last = st?.due && st.interval && st.rating ? daysBetween(addDays(st.due, -st.interval), today()) : null;
  const rot = pan.x.interpolate({ inputRange: [-300, 0, 300], outputRange: ["-8deg", "0deg", "8deg"] });

  return (
    <Screen>
      <TopNav onLeft={router.back} center={progressBar} right={<View />} />
      <View style={[s.pad, { flex: 1, gap: 18, paddingBottom: 12 }]}>
        <View style={{ flex: 1, marginTop: 8 }}>
          <View style={[card(), { transform: [{ translateY: 26 }, { scale: 0.88 }], opacity: 0.45 }]} />
          <View style={[card(), { transform: [{ translateY: 14 }, { scale: 0.94 }], opacity: 0.7 }]} />
          <Animated.View {...responders.front.panHandlers} style={[card(), { shadowOpacity: 0.12, transform: [{ translateX: pan.x }, { rotate: rot }] }]}>
            <View style={[s.row, { justifyContent: "flex-end", gap: 6 }]}>
              <Tag label={trackName[q.track]} color={tc(q.track)} />
              <Tag label={levelName[q.level]} color={lc(q.level)} />
            </View>
            <Text style={[s.xs, { marginTop: "auto", fontWeight: "700", letterSpacing: 0.6 }]}>
              {q.topic.toUpperCase()} · {isDue(st) ? tr("ĐẾN HẠN HÔM NAY", "DUE TODAY") : st?.rating ? tr("ÔN LẠI", "REVIEW") : tr("CÂU MỚI", "NEW")}
            </Text>
            <Text style={{ fontSize: 25, fontWeight: "800", lineHeight: 32, color: C.text, marginTop: 8 }}>{title(q)}</Text>
            {last !== null && (
              <View style={[s.row, { gap: 6, marginTop: 14 }]}>
                <Icon name="rotate" size={15} color={C.subtle} />
                <Text style={s.xs}>{tr("Lần trước", "Last time")}: {ratingName[ratingKey[st!.rating!]]} · {last ? tr(`${last} ngày trước`, `${last} days ago`) : tr("hôm nay", "today")}</Text>
              </View>
            )}
            <View style={[s.row, { marginTop: "auto", justifyContent: "center", gap: 8 }]}>
              <Icon name="hand" color={C.subtle} />
              <Text style={[s.b14, { color: C.subtle }]}>{tr("Chạm để xem đáp án", "Tap to see the answer")}</Text>
            </View>
          </Animated.View>
        </View>
        {canListen && (
          <View style={{ gap: 6 }}>
            <Btn ghost icon={voice.listening ? "stop" : "mic"} label={voice.listening ? tr("Đang nghe… chạm để dừng", "Listening… tap to stop") : tr("Nói thử câu trả lời trước", "Say your answer first")} onPress={() => (voice.listening ? voice.stop() : voice.start())} style={{ height: 46 }} />
            {!!said && <Text style={s.sub} numberOfLines={2}>{said}</Text>}
          </View>
        )}
        {hint}
      </View>
    </Screen>
  );
}

const card = () => ({
  position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0,
  borderRadius: 26, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, padding: 22,
  shadowColor: "#0f172a", shadowOpacity: 0, shadowRadius: 20, shadowOffset: { width: 0, height: 18 }, elevation: 4,
});
