// Ngân hàng câu hỏi + thuật ngữ đóng gói sẵn trong app (học offline). Bản client của web/src/lib/questions.ts + glossary.ts.
import ai from "../../../web/src/data/questions/ai.json";
import backend from "../../../web/src/data/questions/backend.json";
import behavioral from "../../../web/src/data/questions/behavioral.json";
import cs from "../../../web/src/data/questions/cs.json";
import data from "../../../web/src/data/questions/data.json";
import devops from "../../../web/src/data/questions/devops.json";
import dsa from "../../../web/src/data/questions/dsa.json";
import frontend from "../../../web/src/data/questions/frontend.json";
import java from "../../../web/src/data/questions/java.json";
import mobile from "../../../web/src/data/questions/mobile.json";
import qa from "../../../web/src/data/questions/qa.json";
import systemDesign from "../../../web/src/data/questions/system-design.json";
import glossaryData from "../../../web/src/data/glossary.json";
import { annotate, lang, makeMatcher, pick, termIds, tracks, type Level, type Seg, type Track } from "./shared";

type Localized = Record<string, string>;
export type Question = {
  id: string; track: Track; level: Level; topic: string;
  q: Localized; a: Localized; code?: string; tip?: Localized; example?: Localized; followUps?: Localized[]; source?: string;
};
export type Term = {
  id: string; term: string; full?: Localized; match: string[]; def: Localized; example?: Localized;
  see?: string; related?: string[]; tracks?: Track[];
};

const files: Record<Track, unknown> = {
  frontend, backend, java, ai, devops, mobile, data, qa, cs, dsa, "system-design": systemDesign, behavioral,
};

/** Thứ tự trong file = thứ tự học (lộ trình). */
export const questions: Question[] = tracks.flatMap((track) =>
  (files[track] as Omit<Question, "track">[]).map((q) => ({ ...q, track })),
);
const qById = new Map(questions.map((q) => [q.id, q]));
export const getQuestion = (id: string) => qById.get(id);
export const byTrack = (track: Track) => questions.filter((q) => q.track === track);
export const title = (q: Question) => pick(q.q, lang());
export const SESSION = 10; // số thẻ tối đa mỗi phiên ôn hôm nay

/** Chủ đề của một mảng theo thứ tự xuất hiện lần đầu. */
export function roadmap(track: Track) {
  const topics = new Map<string, Question[]>();
  for (const q of byTrack(track)) topics.set(q.topic, [...(topics.get(q.topic) ?? []), q]);
  return [...topics].map(([topic, qs]) => ({ topic, questions: qs }));
}

export const glossary = (glossaryData as Term[]).slice().sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));
const tById = new Map(glossary.map((t) => [t.id, t]));
export const getTerm = (id: string) => tById.get(id);
const matcher = makeMatcher(glossary);

/** Tiêu đề + đáp án đã đánh dấu thuật ngữ (giống annotateQuestion bên web): mỗi thuật ngữ chỉ đánh dấu lần đầu. */
export function richQuestion(q: Question) {
  const [quick, ...rest] = pick(q.a, lang()).split(/\n\s*\n/);
  const ctx = { track: q.track, questionId: q.id };
  const answer = { ...ctx, seen: new Set<string>() };
  return {
    title: annotate(title(q), matcher, { ...ctx, seen: new Set() }),
    quick: annotate(quick, matcher, answer),
    example: q.example ? annotate(pick(q.example, lang()), matcher, answer) : undefined,
    rest: annotate(rest.join("\n\n"), matcher, answer),
  };
}

// Thuật ngữ → các câu có nhắc tới (theo ngôn ngữ đang dùng). Tính lần đầu cần (mở tab Thuật ngữ), không chặn lúc khởi động.
let appears: Map<string, Question[]> | null = null;
let appearsLang = "";
export function appearsIn(id: string): Question[] {
  if (!appears || appearsLang !== lang()) {
    appears = new Map();
    appearsLang = lang();
    for (const q of questions) {
      const s = richQuestion(q);
      for (const t of new Set(termIds(s.title, s.quick, s.example ?? [], s.rest))) appears.set(t, [...(appears.get(t) ?? []), q]);
    }
  }
  const t = getTerm(id);
  return (appears.get(id) ?? []).filter((q) => q.id !== t?.see);
}

/** Mảng của thuật ngữ: khai báo sẵn, không có thì suy từ câu giải thích + các câu nhắc tới. */
export function termTracks(id: string): Track[] {
  const t = getTerm(id)!;
  if (t.tracks) return t.tracks;
  const see = t.see ? getQuestion(t.see) : undefined;
  return [...new Set([...(see ? [see.track] : []), ...appearsIn(id).map((q) => q.track)])];
}

export type { Seg };
