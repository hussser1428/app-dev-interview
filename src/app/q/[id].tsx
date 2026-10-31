// Chi tiết câu hỏi: tự trả lời trước (gõ / nói) → xem đáp án → tự chấm Khó/Vừa/Dễ. Câu đã làm thì mở đáp án luôn.
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { setPending } from "@/lib/api";
import { getQuestion, title } from "@/lib/data";
import { isDone, rate, setDraft, tr } from "@/lib/shared";
import { prefs, updateProgress, useProgress } from "@/lib/store";
import { canListen, useVoice } from "@/lib/voice";
import { Btn, C, IconBtn, s, Screen, TopNav } from "@/ui/kit";
import { QuestionView } from "@/ui/question-view";
import { RateButtons } from "@/ui/rate";

export default function QuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = getQuestion(id);
  const p = useProgress();
  const [shown, setShown] = useState(() => isDone(p.q[id]));
  const draft = p.drafts?.[id] ?? "";
  const save = (t: string) => updateProgress((x) => setDraft(x, id, t));
  const voice = useVoice(save);

  if (!q) return <Screen><TopNav left="back" onLeft={router.back} /><Text style={[s.sub, s.pad]}>{tr("Không tìm thấy câu hỏi.", "Question not found.")}</Text></Screen>;

  const practise = () => {
    const pf = prefs.read();
    setPending({ track: q.track, level: q.level, style: pf.style, total: 3, context: `Start with this question (rephrase it naturally), then probe it with follow-ups and closely related questions.\nQuestion: ${title(q)}` });
    router.push("/room");
  };

  return (
    <Screen>
      <TopNav left="back" onLeft={router.back} center={<Text style={[s.b14, { textAlign: "center" }]} numberOfLines={1}>{q.topic}</Text>} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[s.pad, { gap: 14, paddingBottom: 24 }]} keyboardDismissMode="on-drag">
          {shown ? (
            <>
              <QuestionView q={q} expanded />
              {!!draft && (
                <View style={{ gap: 6 }}>
                  <Text style={s.xs}>{tr("CÂU TRẢ LỜI CỦA BẠN", "YOUR ANSWER")}</Text>
                  <Text style={{ fontSize: 15, lineHeight: 22, color: C.body, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 12 }}>{draft}</Text>
                </View>
              )}
              <Btn label={tr("Phỏng vấn AI về câu này", "AI interview on this question")} icon="mic" ghost onPress={practise} />
            </>
          ) : (
            <>
              <Text style={{ fontSize: 21, lineHeight: 28, fontWeight: "800", color: C.text }}>{title(q)}</Text>
              <Text style={s.sub}>{tr("Tự trả lời trước rồi mới xem đáp án — nhớ lâu hơn nhiều so với đọc ngay.", "Answer it yourself before looking — you remember far more than by just reading.")}</Text>
              <View style={{ backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: voice.listening ? C.brand : C.line, padding: 12, minHeight: 160 }}>
                <TextInput
                  value={draft}
                  onChangeText={save}
                  placeholder={canListen ? tr("Gõ hoặc bấm micro để nói câu trả lời…", "Type, or tap the mic to speak your answer…") : tr("Gõ câu trả lời của bạn…", "Type your answer…")}
                  placeholderTextColor={C.subtle}
                  multiline
                  style={{ flex: 1, fontSize: 15, lineHeight: 22, color: C.text, textAlignVertical: "top" }}
                />
                {canListen && (
                  <IconBtn
                    name={voice.listening ? "stop" : "mic"}
                    color={voice.listening ? "#fff" : C.red}
                    onPress={() => (voice.listening ? voice.stop() : voice.start(draft))}
                    style={{ alignSelf: "flex-end", backgroundColor: voice.listening ? C.red : C.surface }}
                  />
                )}
              </View>
            </>
          )}
        </ScrollView>
        <View style={[s.pad, { paddingVertical: 10 }]}>
          {shown ? (
            <RateButtons id={q.id} onRate={(r) => { updateProgress((x) => rate(x, q.id, r)); router.back(); }} />
          ) : (
            <Btn label={tr("Xem đáp án", "Show answer")} onPress={() => { voice.stop(); setShown(true); }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
