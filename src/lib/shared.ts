import en from "../../../web/src/dictionaries/en.json";
import vi from "../../../web/src/dictionaries/vi.json";
import type { Locale } from "../../../web/src/locales";

// Cửa duy nhất sang code dùng chung với web (../web/src, xem metro.config.js). Chỉ import file thuần (không Next.js, không DOM).
export * from "../../../web/src/lib/catalog";
export * from "../../../web/src/lib/srs";
export * from "../../../web/src/lib/glossary-match";
export * from "../../../web/src/lib/report";
export * from "../../../web/src/lib/project";
export { pick, fmt, localeNames, type Locale } from "../../../web/src/locales";
export { paths, trackIcon, type IconName } from "../../../web/src/lib/icon-paths";

// Ngôn ngữ đang dùng. Đổi qua setLang (root _layout gọi theo prefs.lang rồi dựng lại toàn bộ cây màn hình).
let current: Locale = "vi";
export const lang = () => current;
export const dict = () => (current === "en" ? en : vi);
/** Chữ giao diện riêng của app: tr("Câu hỏi", "Questions"). Chữ trùng web thì lấy từ dict(). */
export const tr = (v: string, e: string) => (current === "en" ? e : v);
/** Mã vùng cho ngày tháng + giọng nói. */
export const bcp47 = () => dict().meta.speechLang;

export const trackName = { ...vi.tracks };
export const levelName = { ...vi.levels };
export const styleName = { ...vi.interview.styles };
export const ratingName = { ...vi.ratings };

export function setLang(l: Locale) {
  current = l;
  const d = dict();
  Object.assign(trackName, d.tracks);
  Object.assign(levelName, d.levels);
  Object.assign(styleName, d.interview.styles);
  Object.assign(ratingName, d.ratings);
}
