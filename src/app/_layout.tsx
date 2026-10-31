import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { AppState, useColorScheme } from "react-native";
import { reschedule } from "@/lib/remind";
import { setLang } from "@/lib/shared";
import { usePrefs } from "@/lib/store";
import { C, setTheme } from "@/ui/kit";

/** Áp ngôn ngữ + màu vào biến dùng chung, trả về key để dựng lại cây màn hình khi đổi. */
function look(lang: "vi" | "en", dark: boolean) {
  setLang(lang);
  setTheme(dark);
  return `${lang}-${dark ? "dark" : "light"}`;
}

export default function RootLayout() {
  const pf = usePrefs();
  const system = useColorScheme();
  // Mặc định sáng; "system" thì theo cài đặt sáng/tối của máy.
  const dark = pf.theme === "dark" || (pf.theme === "system" && system === "dark");
  // ponytail: đổi màu/ngôn ngữ = dựng lại toàn bộ màn hình (state trong màn mất, lịch sử điều hướng giữ nguyên);
  // chuyển sang context + style theo theme nếu cần đổi mượt.
  const key = look(pf.lang ?? "vi", dark);
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(C.bg).catch(() => {}); // nền gốc phía sau màn hình (lúc chuyển cảnh, bàn phím)
  }, [key]);

  // Mỗi lần rời app thì tính lại lịch nhắc theo tiến độ mới nhất.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "background") reschedule().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  return <Root key={key} dark={dark} />;
}

function Root({ dark }: { dark: boolean }) {
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="room" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
