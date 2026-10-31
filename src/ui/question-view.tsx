// Nội dung một câu hỏi: trả lời 30 giây, ví dụ, mẹo, rồi đáp án đầy đủ + code + follow-up. Dùng ở màn chi tiết và mặt sau flashcard.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { richQuestion, type Question } from "@/lib/data";
import { lang, levelName, pick, toggleSave, tr, trackName } from "@/lib/shared";
import { updateProgress, useProgress } from "@/lib/store";
import { speak } from "@/lib/voice";
import { C, Code, Icon, lc, Rich, s, Tag, tc } from "./kit";
import { TermSheet } from "./term-sheet";

function Box({ kind, icon, label, children }: { kind: "key" | "ex" | "tip"; icon: "clock" | "bulb" | "target"; label: string; children: React.ReactNode }) {
  const k = {
    key: [C.brandSoft, C.brandLine, C.brand],
    ex: [C.ex, C.exLine, C.exHead],
    tip: [C.tip, C.tipLine, C.tipHead],
  }[kind];
  return (
    <View style={{ backgroundColor: k[0], borderColor: k[1], borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 }}>
      <View style={[s.row, { gap: 6 }]}>
        <Icon name={icon} size={15} color={k[2]} />
        <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.6, color: k[2] }}>{label}</Text>
      </View>
      {children}
    </View>
  );
}


export function QuestionView({ q, expanded = false }: { q: Question; expanded?: boolean }) {
  const p = useProgress();
  const [more, setMore] = useState(expanded);
  const [term, setTerm] = useState<string | null>(null);
  const r = richQuestion(q);
  const saved = !!p.q[q.id]?.saved;
  const follow = q.followUps?.map((f) => pick(f, lang())) ?? [];
  const para = { fontSize: 15, lineHeight: 23, color: C.body };

  return (
    <View style={{ gap: 12 }}>
      <View style={[s.row, { gap: 6 }]}>
        <Tag label={trackName[q.track]} color={tc(q.track)} />
        <Tag label={levelName[q.level]} color={lc(q.level)} />
        <View style={{ flex: 1 }} />
        <Pressable hitSlop={8} onPress={() => speak(`${pick(q.q, lang())}. ${pick(q.a, lang()).split(/\n\s*\n/)[0]}`)}>
          <Icon name="volume" color={C.subtle} />
        </Pressable>
        <Pressable hitSlop={8} onPress={() => updateProgress((p) => toggleSave(p, q.id))}>
          <Icon name="star" color={saved ? C.amber : C.subtle} fill={saved ? C.amber : "none"} />
        </Pressable>
      </View>
      <Rich segs={r.title} onTerm={setTerm} style={{ fontSize: 19, lineHeight: 26, fontWeight: "700", color: C.text }} />
      <Box kind="key" icon="clock" label={tr("TRẢ LỜI 30 GIÂY", "30-SECOND ANSWER")}>
        <Rich segs={r.quick} onTerm={setTerm} style={[para, { color: C.brandInk }]} />
      </Box>
      {r.example && (
        <Box kind="ex" icon="bulb" label={tr("VÍ DỤ ĐỜI THƯỜNG", "EVERYDAY EXAMPLE")}>
          <Rich segs={r.example} onTerm={setTerm} style={[para, { color: C.exInk }]} />
        </Box>
      )}
      {q.tip && (
        <Box kind="tip" icon="target" label={tr("MẸO GHI ĐIỂM", "SCORING TIP")}>
          <Text style={[para, { color: C.tipInk }]}>{pick(q.tip, lang())}</Text>
        </Box>
      )}
      {more ? (
        <>
          {r.rest.length > 0 && <Rich segs={r.rest} onTerm={setTerm} style={para} />}
          {q.code && <Code code={q.code} />}
          {follow.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={s.xs}>{tr("HỌ CÓ THỂ HỎI TIẾP", "LIKELY FOLLOW-UPS")}</Text>
              {follow.map((f) => (
                <View key={f} style={[s.row, { alignItems: "flex-start", gap: 8 }]}>
                  <Icon name="chev" size={16} color={C.brand} />
                  <Text style={[para, { flex: 1 }]}>{f}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        (r.rest.length > 0 || q.code || follow.length > 0) && (
          <Pressable onPress={() => setMore(true)} style={[s.row, { justifyContent: "center", gap: 4, paddingVertical: 6 }]}>
            <Text style={{ color: C.brand, fontWeight: "700", fontSize: 14 }}>
              {tr("Xem đáp án đầy đủ", "Full answer")}{q.code ? " + code" : ""}{follow.length ? ` + ${follow.length} ${tr("câu hỏi tiếp", "follow-ups")}` : ""}
            </Text>
            <Icon name="chev" size={16} color={C.brand} />
          </Pressable>
        )
      )}
      <TermSheet id={term} setId={setTerm} />
    </View>
  );
}
