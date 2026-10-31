// Project Deep-dive (bản mobile của web/[lang]/project): dán link repo GitHub hoặc chọn CV (PDF) → AI phân tích
// stack, điểm mạnh / rủi ro, câu hỏi sát từng file code → luyện từng câu hoặc phỏng vấn cả buổi về project.
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { analyzeProject, projectPlan, setPending } from "@/lib/api";
import { categories, dict, fmt, ratingName, trackName, type Category, type ProjectQuestion } from "@/lib/shared";
import { project, usePrefs, useProject } from "@/lib/store";
import { Btn, C, Card, Chip, Icon, mono, s, Screen, Tag, tc, TopNav } from "@/ui/kit";

const MAX_CV_BYTES = 3_000_000; // giống web: base64 ≈ 4 MB, giới hạn của /api/project

/** Đọc file đã chọn thành base64 (fetch + FileReader chạy được cả trên máy lẫn web). */
async function toBase64(uri: string) {
  const blob = await (await fetch(uri)).blob();
  return new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.onerror = fail;
    r.readAsDataURL(blob);
  });
}

export default function ProjectScreen() {
  const t = dict().project;
  const pf = usePrefs();
  const p = useProject().v;
  const [repo, setRepo] = useState("");
  const [cv, setCv] = useState<{ name: string; uri: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Category | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const kind = { strength: C.green, likely: C.amber, risk: C.red };
  const diff = { easy: C.subtle, medium: C.amber, hard: C.red };

  async function pickCv() {
    setError("");
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    const f = r.assets?.[0];
    if (r.canceled || !f) return;
    if ((f.size ?? 0) > MAX_CV_BYTES) return setError(t.tooBig);
    setCv({ name: f.name, uri: f.uri });
  }

  async function analyze() {
    if (busy) return;
    if (!repo.trim() && !cv) return setError(t.needInput);
    setBusy(true);
    setError("");
    try {
      const v = await analyzeProject(repo.trim(), cv ? await toBase64(cv.uri) : "");
      project.update(() => ({ v }));
      setFilter("all");
      setOpen(null);
      setRepo("");
      setCv(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  /** Một câu: buổi 3 câu bắt đầu từ câu đó. Không truyền: buổi 5 câu theo cả danh sách. */
  const practise = (q?: ProjectQuestion) => {
    if (!p) return;
    setPending({ track: p.track, level: pf.level, style: pf.style, total: q ? 3 : 5, context: projectPlan(p, q), project: p.name });
    router.push("/room");
  };

  const present = categories.filter((c) => p?.questions.some((q) => q.category === c));
  const shown = p?.questions.filter((q) => filter === "all" || q.category === filter) ?? [];

  return (
    <Screen>
      <TopNav left="back" onLeft={router.back} center={<Text style={[s.h2, { textAlign: "center" }]}>{t.title}</Text>} />
      <ScrollView contentContainerStyle={[s.pad, { gap: 14, paddingTop: 4, paddingBottom: 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={[s.sub, { fontSize: 15 }]}>{t.subtitle}</Text>

        <Card style={{ padding: 14, gap: 10 }}>
          <View style={s.search}>
            <Icon name="git" color={C.subtle} />
            <TextInput
              value={repo}
              onChangeText={setRepo}
              onSubmitEditing={analyze}
              placeholder={t.repo}
              placeholderTextColor={C.subtle}
              style={s.searchT}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
            />
          </View>
          <View style={[s.row, { gap: 8 }]}>
            <Text style={s.xs}>{t.or}</Text>
            <Btn ghost label={cv ? `📄 ${cv.name}` : t.cv} onPress={pickCv} style={{ flex: 1, height: 44, paddingHorizontal: 12 }} />
          </View>
          <Btn label={t.analyze} icon="spark" onPress={analyze} disabled={busy} style={{ height: 46 }} />
        </Card>

        {busy && (
          <View style={[s.row, { gap: 8 }]}>
            <ActivityIndicator color={C.brand} />
            <Text style={[s.sub, { flex: 1 }]}>{t.analyzing}</Text>
          </View>
        )}
        {!!error && (
          <View style={{ backgroundColor: C.redSoft, borderColor: C.redLine, borderWidth: 1, borderRadius: 14, padding: 12 }}>
            <Text style={{ color: C.red, fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {!p ? (
          !busy && <Text style={[s.sub, { textAlign: "center", marginTop: 12, lineHeight: 19 }]}>{t.empty}</Text>
        ) : (
          <>
            <Card style={{ padding: 16, gap: 8 }}>
              <View style={[s.row, { gap: 8 }]}>
                <Text style={[s.h2, { flex: 1 }]}>
                  📦{" "}
                  <Text style={p.repo ? { textDecorationLine: "underline" } : undefined} onPress={p.repo ? () => Linking.openURL(p.repo!) : undefined}>
                    {p.name}
                  </Text>
                </Text>
                <Tag label={t.analyzed} color={C.green} />
              </View>
              <Text style={s.sub}>
                {p.summary}
                {p.files ? ` · ${fmt(t.files, { n: p.files })}` : ""}
              </Text>
              <View style={[s.row, { flexWrap: "wrap", gap: 6 }]}>
                <Tag label={trackName[p.track]} color={tc(p.track)} />
                {p.stack.map((x) => <Tag key={x} label={x} color={C.brand} />)}
              </View>
            </Card>

            <Card style={{ padding: 16, gap: 12 }}>
              <Text style={s.h2}>{t.findings}</Text>
              {p.findings.map((f, i) => (
                <View key={i} style={{ gap: 4 }}>
                  <Tag label={t.kinds[f.kind]} color={kind[f.kind]} />
                  <Text style={{ fontSize: 14, lineHeight: 20, color: C.body }}>{f.text}</Text>
                </View>
              ))}
            </Card>

            <Text style={s.h2}>{fmt(t.questions, { n: p.questions.length })}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
              {(["all", ...present] as const).map((c) => (
                <Chip key={c} small label={c === "all" ? t.all : t.categories[c]} on={filter === c} onPress={() => setFilter(c)} />
              ))}
            </ScrollView>
            <Card>
              {shown.map((q, i) => {
                const isOpen = open === q.question;
                return (
                  <View key={q.question} style={i > 0 ? s.sep : undefined}>
                    <Pressable onPress={() => setOpen(isOpen ? null : q.question)} style={{ padding: 14, gap: 6 }}>
                      <Text style={[s.b14, { fontWeight: "600", lineHeight: 20 }]}>{q.question}</Text>
                      <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
                        <Tag label={ratingName[q.difficulty]} color={diff[q.difficulty]} />
                        <Text style={s.xs}>{t.categories[q.category]}</Text>
                        {!!q.file && (
                          <Text style={[s.xs, { fontFamily: mono, flexShrink: 1 }]} numberOfLines={1}>
                            {q.file}{q.lines ? ` · ${fmt(t.lines, { n: q.lines })}` : ""}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                    {isOpen && (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 6 }}>
                        <Text style={[s.xs, { color: C.brand, letterSpacing: 0.6 }]}>{t.points.toUpperCase()}</Text>
                        {q.points.map((x, j) => (
                          <Text key={j} style={{ fontSize: 14, lineHeight: 20, color: C.body }}>• {x}</Text>
                        ))}
                        <Btn ghost label={t.practice} icon="mic" onPress={() => practise(q)} style={{ height: 42, marginTop: 6 }} />
                      </View>
                    )}
                  </View>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>
      {p && (
        <View style={[s.pad, { paddingVertical: 10 }]}>
          <Btn label={t.interviewAll.replace(/^▶\s*/, "")} icon="mic" onPress={() => practise()} />
        </View>
      )}
    </Screen>
  );
}
