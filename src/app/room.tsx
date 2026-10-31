// Phòng phỏng vấn AI: AI đọc câu hỏi, bạn nói (hoặc gõ), hết số câu thì chấm điểm → màn Kết quả.
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { gradeInterview, nextQuestion, takePending, type Setup, type Turn } from "@/lib/api";
import { dict, logInterview, styleName, today, tr, trackName, WEAK } from "@/lib/shared";
import { lastReport, updateProgress } from "@/lib/store";
import { canListen, speak, stopSpeaking, useVoice } from "@/lib/voice";
import { Btn, C, Icon, IconBtn, mono, s, Screen, TopNav } from "@/ui/kit";

const SKIP = "(The candidate skipped this question.)"; // gửi cho AI, giao diện hiện "Bỏ qua"

export default function Room() {
  const [setup] = useState<Setup | null>(takePending);
  const [msgs, setMsgs] = useState<Turn[]>([]);
  const [busy, setBusy] = useState<"thinking" | "grading" | null>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(!canListen);
  const [elapsed, setElapsed] = useState(0);
  const voice = useVoice(setText);
  const retry = useRef<() => void>(() => {});
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const asked = msgs.filter((m) => m.role === "model").length;

  async function run(kind: "thinking" | "grading", fn: () => Promise<void>) {
    setBusy(kind);
    setError("");
    retry.current = () => run(kind, fn);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const ask = (m: Turn[]) =>
    run("thinking", async () => {
      const q = await nextQuestion(setup!, m);
      setMsgs([...m, { role: "model", text: q }]);
      speak(q);
    });

  const grade = (m: Turn[]) =>
    run("grading", async () => {
      const r = await gradeInterview(setup!, m);
      const date = today();
      const { track, level, style } = setup!;
      const weak = r.questions
        .filter((q) => q.score < WEAK)
        .map((q, i) => ({ ...q, id: `${Date.now()}-${i}`, date, track, level, style, project: setup!.project }));
      updateProgress((p) => logInterview(p, { date, track, level, style, overall: r.overall }, weak));
      lastReport.update(() => ({ v: { report: r, track, level, style, weak: weak.length, related: weak.filter((w) => w.related).length } }));
      router.replace("/report");
    });

  useEffect(() => {
    if (!setup) return router.back();
    ask([]);
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => {
      clearInterval(id);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send(answer = text.trim()) {
    if (!answer || busy) return;
    voice.stop();
    stopSpeaking();
    setText("");
    const m: Turn[] = [...msgs, { role: "user", text: answer }];
    setMsgs(m);
    if (asked >= setup!.total) grade(m);
    else ask(m);
  }

  const quit = () =>
    Alert.alert(tr("Thoát buổi phỏng vấn?", "Leave the interview?"), asked > 1 ? tr("Có thể chấm điểm những câu đã trả lời.", "You can get graded on the answers so far.") : undefined, [
      { text: tr("Ở lại", "Stay"), style: "cancel" },
      ...(msgs.some((m) => m.role === "user") ? [{ text: tr("Chấm điểm", "Grade"), onPress: () => grade(msgs) }] : []),
      { text: tr("Thoát", "Leave"), style: "destructive" as const, onPress: () => router.back() },
    ]);

  if (!setup) return null;
  const lastAi = [...msgs].reverse().find((m) => m.role === "model");
  const mm = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <Screen>
      <TopNav
        onLeft={quit}
        center={
          <View style={{ alignItems: "center" }}>
            <Text style={s.b14}>{trackName[setup.track]} · {styleName[setup.style]}</Text>
            <Text style={s.xs}>{tr("Câu", "Question")} {Math.max(1, asked)}/{setup.total} · {mm}</Text>
          </View>
        }
        right={canListen ? <IconBtn name={typing ? "mic" : "keyboard"} onPress={() => { voice.stop(); setTyping(!typing); }} /> : <View style={{ width: 40 }} />}
      />
      <View style={{ height: 6, marginHorizontal: 20, marginBottom: 6, borderRadius: 99, backgroundColor: C.track, overflow: "hidden" }}>
        <View style={{ width: `${(Math.max(0, asked - 1) / setup.total) * 100}%`, height: "100%", backgroundColor: C.brand }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd()} contentContainerStyle={[s.pad, { gap: 14, paddingVertical: 10 }]}>
          {msgs.map((m, i) =>
            m.role === "model" ? (
              <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <View style={{ width: 40, height: 40, borderRadius: 99, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="bot" color="#fff" />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 18, borderTopLeftRadius: 4, padding: 14 }}>
                    <Body text={m.text} style={{ fontSize: 16, lineHeight: 24, fontWeight: "500", color: C.text }} />
                  </View>
                  {m === lastAi && (
                    <View style={[s.row, { gap: 12 }]}>
                      <Pressable onPress={() => speak(m.text)} style={[s.row, { gap: 4 }]} hitSlop={6}>
                        <Icon name="volume" size={15} color={C.subtle} />
                        <Text style={s.xs}>{tr("Nghe lại", "Replay")}</Text>
                      </Pressable>
                      <Pressable onPress={() => speak(m.text, true)} hitSlop={6}>
                        <Text style={s.xs}>{tr("Chậm hơn", "Slower")}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View key={i} style={meStyle()}>
                <Text style={{ fontSize: 15.5, lineHeight: 22, color: C.brandInk }}>{m.text === SKIP ? tr("Bỏ qua", "Skipped") : m.text}</Text>
              </View>
            ),
          )}
          {!typing && (voice.listening || !!text) && (
            <>
              <View style={meStyle()}>
                <Text style={{ fontSize: 15.5, lineHeight: 22, color: C.brandInk }}>{text || "…"}</Text>
              </View>
              {voice.listening && <Text style={[s.xs, { alignSelf: "flex-end", marginTop: -6 }]}><Text style={{ color: C.red }}>● </Text>{tr("Đang nghe · chạm nút đỏ để gửi", "Listening · tap the red button to send")}</Text>}
            </>
          )}
          {busy && (
            <View style={[s.row, { gap: 8, alignSelf: "center", marginTop: 8 }]}>
              <ActivityIndicator color={C.brand} />
              <Text style={s.sub}>{busy === "thinking" ? dict().interview.thinking : dict().interview.grading}</Text>
            </View>
          )}
          {!!error && (
            <View style={{ gap: 10, backgroundColor: C.redSoft, borderColor: C.redLine, borderWidth: 1, borderRadius: 14, padding: 12 }}>
              <Text style={{ color: C.red, fontSize: 14 }}>{error}</Text>
              <Btn label={tr("Thử lại", "Try again")} ghost onPress={() => retry.current()} style={{ height: 40 }} />
            </View>
          )}
        </ScrollView>

        {typing ? (
          <View style={[s.row, { padding: 12, paddingHorizontal: 20, gap: 8, alignItems: "flex-end" }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={tr("Nhập câu trả lời… (code thì bọc trong ```)", "Type your answer… (wrap code in ```)")}
              placeholderTextColor={C.subtle}
              multiline
              style={{ flex: 1, maxHeight: 160, minHeight: 46, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: C.text }}
            />
            <IconBtn name="send" color="#fff" size={46} onPress={() => send()} style={{ backgroundColor: text.trim() && !busy ? C.brand : C.line2, borderWidth: 0 }} />
          </View>
        ) : (
          <View style={[s.row, { justifyContent: "space-between", paddingHorizontal: 34, paddingBottom: 16, paddingTop: 8 }]}>
            <Side icon="x" label={tr("Kết thúc", "End")} onPress={quit} />
            <View style={{ alignItems: "center", gap: 10 }}>
              <Pressable
                disabled={!!busy}
                onPress={() => (voice.listening ? send() : voice.start(text))}
                style={{
                  width: 88, height: 88, borderRadius: 99, alignItems: "center", justifyContent: "center",
                  backgroundColor: voice.listening ? C.red : C.surface, borderWidth: voice.listening ? 0 : 2, borderColor: C.red, opacity: busy ? 0.5 : 1,
                  shadowColor: C.red, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 5,
                }}
              >
                {voice.listening ? <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: "#fff" }} /> : <Icon name="mic" size={34} color={C.red} />}
              </Pressable>
              <Text style={s.b14}>{voice.listening ? tr("Chạm để gửi", "Tap to send") : tr("Chạm để nói", "Tap to speak")}</Text>
            </View>
            <Side icon="skip" label={tr("Bỏ qua", "Skip")} onPress={() => send(SKIP)} />
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const meStyle = () => ({ alignSelf: "flex-end" as const, maxWidth: "86%" as const, backgroundColor: C.brandSoft, borderWidth: 1, borderColor: C.brandLine, borderRadius: 18, borderTopRightRadius: 4, padding: 14 });

const Side = ({ icon, label, onPress }: { icon: "x" | "skip"; label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ alignItems: "center", gap: 6 }}>
    <View style={{ width: 52, height: 52, borderRadius: 99, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} color={C.text} />
    </View>
    <Text style={[s.xs, { color: C.muted }]}>{label}</Text>
  </Pressable>
);

/** Chữ thường + khối ``` hiển thị dạng code (giống renderText bên web). */
function Body({ text, style }: { text: string; style: object }) {
  return (
    <>
      {text.split(/```[^\n]*\n?([\s\S]*?)```/).map((part, i) =>
        i % 2 ? (
          <Text key={i} style={{ fontFamily: mono, fontSize: 12.5, color: "#e2e8f0", backgroundColor: C.code, padding: 10, borderRadius: 10, marginVertical: 6 }}>{part.trimEnd()}</Text>
        ) : (
          part.trim() && <Text key={i} style={style}>{part.trim().replace(/\*\*([^*]+)\*\*/g, "$1")}</Text>
        ),
      )}
    </>
  );
}
