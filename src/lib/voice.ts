// Nói → chữ (expo-speech-recognition, chạy trên máy, vi-VN / en-US theo ngôn ngữ app) và chữ → giọng đọc (expo-speech).
// Expo Go không có module nhận giọng nói: canListen = false, giao diện tự chuyển sang gõ phím.
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { requireOptionalNativeModule } from "expo";
import * as Speech from "expo-speech";
import { bcp47 } from "./shared";

type Sub = { remove(): void };
type Rec = {
  addListener(e: string, cb: (ev: any) => void): Sub;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  start(o: object): void;
  stop(): void;
};
const rec = requireOptionalNativeModule<Rec>("ExpoSpeechRecognition");
export const canListen = !!rec;

export const speak = (text: string, slow = false) => {
  Speech.stop();
  Speech.speak(text.replace(/```[\s\S]*?```/g, ""), { language: bcp47(), rate: slow ? 0.8 : 1 });
};
export const stopSpeaking = () => Speech.stop();

/** Nghe liên tục; onText nhận toàn bộ chữ từ lúc bấm nghe (prefix + đã nói). */
export function useVoice(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const emit = useEffectEvent(onText);
  const done = useRef(""); // các đoạn đã chốt (Android chia phiên nghe liên tục thành nhiều đoạn)

  useEffect(() => {
    if (!rec) return;
    const subs = [
      rec.addListener("start", () => setListening(true)),
      rec.addListener("end", () => setListening(false)),
      rec.addListener("error", () => setListening(false)),
      rec.addListener("result", (e: { results: { transcript: string }[]; isFinal: boolean }) => {
        const t = e.results[0]?.transcript ?? "";
        if (e.isFinal) done.current += t + " ";
        emit((e.isFinal ? done.current : done.current + t).trim());
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  return {
    listening,
    async start(prefix = "") {
      if (!rec) return;
      Speech.stop();
      if (!(await rec.requestPermissionsAsync()).granted) return;
      done.current = prefix ? prefix + " " : "";
      rec.start({ lang: bcp47(), interimResults: true, continuous: true });
    },
    stop: () => rec?.stop(),
  };
}
