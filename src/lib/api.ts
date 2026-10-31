// Gọi API AI của web (key Gemini nằm trên server, không bao giờ trong app).
import { dict, lang, MAX_CONTEXT, tr, type Level, type Project, type Report, type Style, type Track } from "./shared";

export type Turn = { role: "user" | "model"; text: string };
/** project: tên project nếu là buổi Deep-dive (lưu kèm câu yếu), không gửi lên server. */
export type Setup = { track: Track; level: Level; style: Style; total: number; context?: string; project?: string };

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

async function post(path: string, body: object, errors: Record<string, string> = {}) {
  if (!BASE) throw new Error(tr("Chưa cấu hình EXPO_PUBLIC_API_URL (xem .env.example).", "EXPO_PUBLIC_API_URL is not set (see .env.example)."));
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lang: lang(), ...body }),
  }).catch(() => {
    throw new Error(tr("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.", "Can't reach the server. Check your connection and try again."));
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok)
    throw new Error(
      data.error === "missing_key" ? tr("Máy chủ chưa có GEMINI_API_KEY.", "The server has no GEMINI_API_KEY.")
      : (errors[data.error] ?? `${tr("Lỗi AI", "AI error")}: ${data.error}`),
    );
  return data;
}

const interview = (action: "chat" | "report", s: Setup, messages: Turn[]) =>
  post("/api/interview", { action, track: s.track, level: s.level, style: s.style, total: s.total, context: s.context, messages });

/** Project Deep-dive: AI đọc repo GitHub công khai và/hoặc CV (PDF base64) → điểm mạnh/rủi ro + câu hỏi sát project. */
export const analyzeProject = async (repo: string, cv: string): Promise<Project> =>
  (await post("/api/project", { repo, cv }, dict().project.errors)).project;

/** Tóm tắt project + câu hỏi dự kiến cho người phỏng vấn AI, câu được chọn đứng đầu (giống context() bên web). */
export function projectPlan(p: Project, first?: Project["questions"][number]) {
  const qs = first ? [first, ...p.questions.filter((q) => q !== first)] : p.questions;
  return [
    `${p.name}: ${p.summary}`,
    `Stack: ${p.stack.join(", ")}`,
    "Findings:",
    ...p.findings.map((f) => `- [${f.kind}] ${f.text}`),
    "Planned questions:",
    ...qs.map((q, i) => `${i + 1}. ${q.question}${q.file ? ` (${q.file} ${q.lines})` : ""}`),
  ]
    .join("\n")
    .slice(0, MAX_CONTEXT);
}

export const nextQuestion = async (s: Setup, msgs: Turn[]): Promise<string> => (await interview("chat", s, msgs)).text;
export const gradeInterview = async (s: Setup, msgs: Turn[]): Promise<Report> => (await interview("report", s, msgs)).report;

/** Kế hoạch buổi luyện lại câu yếu (giống retryPlan bên web/weak, cho nhiều câu). */
export const retryPlan = (ws: { question: string; feedback: string }[]) =>
  [
    "Retry session: the candidate answered these questions weakly in an earlier mock interview and wants to practise them again.",
    "Ask them in order (rephrase naturally), then use follow-ups to probe what was missing.",
    ...ws.map((w, i) => `${i + 1}. Question: ${w.question}\n   What was missing last time: ${w.feedback}`),
  ]
    .join("\n")
    .slice(0, MAX_CONTEXT);

// Cấu hình buổi phỏng vấn sắp mở: context có thể dài nên không nhét vào URL.
let pending: Setup | null = null;
export const setPending = (s: Setup) => {
  pending = s;
};
export const takePending = () => pending;
