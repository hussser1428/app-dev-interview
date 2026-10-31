// Tiến độ + cài đặt lưu trên máy (SQLite key-value, đọc đồng bộ) — bản mobile của web/src/lib/progress.ts.
// ponytail: chỉ lưu trên 1 máy; thêm đăng nhập + database khi cần đồng bộ nhiều thiết bị.
import { useSyncExternalStore } from "react";
import Storage from "./kv";
import { emptyProgress, migrate, type Level, type Locale, type Progress, type Project, type Report, type Style, type Track } from "./shared";

function store<T>(key: string, empty: T, fix: (v: T) => T = (v) => v) {
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } = { raw: null, value: empty };
  const read = (): T => {
    const raw = Storage.getItemSync(key);
    if (raw !== cache.raw) {
      let value = empty;
      try {
        if (raw) value = fix({ ...empty, ...JSON.parse(raw) });
      } catch {
        // dữ liệu hỏng -> coi như chưa có
      }
      cache = { raw, value };
    }
    return cache.value;
  };
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  };
  return {
    read,
    useValue: () => useSyncExternalStore(subscribe, read),
    update(fn: (v: T) => T) {
      Storage.setItemSync(key, JSON.stringify(fn(read())));
      listeners.forEach((l) => l());
    },
  };
}

/** Giống key của web để sau này dễ đồng bộ/xuất nhập. */
export const progress = store<Progress>("devinterview:progress:v1", emptyProgress, migrate);
export const useProgress = progress.useValue;
export const updateProgress = progress.update;

/** Chọn ở màn Bắt đầu. Ngày phỏng vấn nằm trong Progress.interviewDate (như web). theme không đặt = sáng. */
export type Prefs = { onboarded?: boolean; tracks: Track[]; level: Level; remind: boolean; style: Style; theme?: "light" | "dark" | "system"; lang?: Locale };
export const prefs = store<Prefs>("devinterview:prefs:v1", { tracks: ["backend"], level: "junior", remind: true, style: "product" });
export const usePrefs = prefs.useValue;

/** Buổi phỏng vấn vừa chấm, để màn Kết quả mở lại được. */
export type LastReport = { report: Report; track: Track; level: Level; style: Style; weak: number; related: number };
export const lastReport = store<{ v?: LastReport }>("devinterview:report:v1", {});
export const useLastReport = lastReport.useValue;

/** Phiên flashcard đang ôn dở (danh sách thẻ + vị trí), để tab Hôm nay cho ôn tiếp khi người dùng thoát giữa chừng. */
// ponytail: chỉ giữ 1 phiên; mở phiên mới thì phiên dở cũ bị thay.
export type Session = { ids: string[]; i: number; kind: "today" | "track" | "topic"; track?: Track; topic?: string; date: string };
export const session = store<{ v?: Session }>("devinterview:session:v1", {});
export const useSession = session.useValue;

/** Project Deep-dive phân tích gần nhất. */
// ponytail: chỉ nhớ 1 project; nhiều project thì đổi thành danh sách.
export const project = store<{ v?: Project }>("devinterview:project:v1", {});
export const useProject = project.useValue;
