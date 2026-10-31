// Giải thích một thuật ngữ: dùng cho popup ở đáp án và tab Thuật ngữ (full = kèm câu nhắc tới + thuật ngữ liên quan).
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { appearsIn, getQuestion, getTerm, termTracks, title } from "@/lib/data";
import { lang, pick, toggleTerm, tr, trackName } from "@/lib/shared";
import { updateProgress, useProgress } from "@/lib/store";
import { Btn, C, Card, Chip, Icon, mono, s, Sheet, Tag, tc } from "./kit";

export function TermSheet({ id, setId, full }: { id: string | null; setId: (id: string | null) => void; full?: boolean }) {
  const p = useProgress();
  const t = id ? getTerm(id) : undefined;
  if (!t) return null;
  const known = !!p.terms?.[t.id];
  const tracks = termTracks(t.id);
  const see = t.see ? getQuestion(t.see) : undefined;
  const open = (qid: string) => {
    setId(null);
    router.push(`/q/${qid}`);
  };

  return (
    <Sheet visible onClose={() => setId(null)}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={{ fontFamily: mono, fontSize: 20, fontWeight: "700", color: C.text, flexShrink: 1 }}>{t.term}</Text>
        {tracks[0] && <Tag label={trackName[tracks[0]]} color={tc(tracks[0])} />}
      </View>
      {t.full && <Text style={s.sub}>{pick(t.full, lang())}</Text>}
      <Text style={{ fontSize: 15, lineHeight: 22, color: C.body }}>{pick(t.def, lang())}</Text>
      {t.example && (
        <View style={{ backgroundColor: C.ex, borderColor: C.exLine, borderWidth: 1, borderRadius: 14, padding: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.exHead, marginBottom: 4 }}>{tr("VÍ DỤ ĐỜI THƯỜNG", "EVERYDAY EXAMPLE")}</Text>
          <Text style={{ fontSize: 14, lineHeight: 21, color: C.exInk }}>{pick(t.example, lang())}</Text>
        </View>
      )}
      <View style={[s.row, { gap: 8 }]}>
        <Btn
          label={known ? tr("Bỏ đã hiểu", "Not yet") : tr("Đã hiểu", "Got it")}
          icon="check"
          ghost={known}
          onPress={() => updateProgress((p) => toggleTerm(p, t.id))}
          style={{ flex: 1, height: 44 }}
        />
        {see && <Btn label={tr("Câu giải thích", "Explainer")} ghost onPress={() => open(see.id)} style={{ flex: 1, height: 44 }} />}
      </View>
      {full && appearsIn(t.id).length > 0 && (
        <>
          <Text style={[s.xs, { marginTop: 4 }]}>{tr(`XUẤT HIỆN TRONG ${appearsIn(t.id).length} CÂU`, `APPEARS IN ${appearsIn(t.id).length} QUESTIONS`)}</Text>
          <Card>
            {appearsIn(t.id).slice(0, 6).map((q, i) => (
              <Pressable key={q.id} onPress={() => open(q.id)} style={[s.row, { padding: 12 }, i > 0 && s.sep]}>
                <Text style={[s.b14, { flex: 1, fontWeight: "600" }]} numberOfLines={2}>{title(q)}</Text>
                <Icon name="chev" size={16} color={C.subtle} />
              </Pressable>
            ))}
          </Card>
        </>
      )}
      {full && !!t.related?.length && (
        <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
          {t.related.map((r) => getTerm(r) && <Chip key={r} small label={getTerm(r)!.term} onPress={() => setId(r)} />)}
        </View>
      )}
    </Sheet>
  );
}
