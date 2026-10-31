// Bắt đầu: 1 màn chọn ngôn ngữ, sáng/tối, mảng, cấp độ, ngày phỏng vấn, nhắc ôn. Mở lại từ nút cài đặt ở tab Hôm nay để sửa.
// Ngôn ngữ + sáng/tối lưu ngay (cả app dựng lại theo), các mục còn lại lưu khi bấm nút dưới cùng.
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { askPermission, reschedule } from "@/lib/remind";
import { addDays as addDaysTo, bcp47, daysBetween, levels, localeNames, today, tr, trackName, tracks, type Level, type Locale, type Track } from "@/lib/shared";
import { prefs, updateProgress, usePrefs, useProgress } from "@/lib/store";
import { Btn, C, Card, Chip, Icon, s, Screen, Seg, tc, trackIco } from "@/ui/kit";

const levelShort: Record<Level, string> = { intern: "Intern", junior: "Junior", mid: "Mid", senior: "Senior" };
const fmtDay = (d: string) => new Date(`${d}T00:00`).toLocaleDateString(bcp47(), { weekday: "long", day: "numeric", month: "numeric" });
type Theme = "system" | "light" | "dark";

export default function Onboarding() {
  const pf = usePrefs();
  const p = useProgress();
  const [picked, setPicked] = useState<Track[]>(pf.onboarded ? pf.tracks : []);
  const [level, setLevel] = useState<Level>(pf.level);
  const [remind, setRemind] = useState(pf.remind);
  const [fallback] = useState(() => addDaysTo(today(), 14)); // gợi ý mặc định khi chưa chọn ngày
  const [date, setDate] = useState(p.interviewDate && p.interviewDate >= today() ? p.interviewDate : undefined);

  // Chọn tối đa 2 mảng: chọn mảng thứ 3 thì bỏ mảng chọn sớm nhất.
  const toggle = (t: Track) => setPicked((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t].slice(-2)));
  const asDate = (d?: string) => new Date(`${d ?? fallback}T00:00`);
  const onDate = (d?: Date) => d && setDate(today(d));
  const pickDate = () =>
    DateTimePickerAndroid.open({ value: asDate(date), mode: "date", minimumDate: new Date(), onChange: (_, d) => onDate(d) });

  async function start() {
    const on = remind && (await askPermission());
    prefs.update((x) => ({ ...x, onboarded: true, tracks: picked, level, remind: on }));
    updateProgress((x) => ({ ...x, interviewDate: date }));
    reschedule().catch(() => {});
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[s.pad, { gap: 20, paddingTop: 12, paddingBottom: 24 }]}>
        <View style={s.row}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}>
            <Icon name="code" color="#fff" width={2.4} />
          </View>
          <Text style={[s.h2, { flex: 1 }]}>DevInterview</Text>
          {pf.onboarded && (
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/today"))} hitSlop={8}>
              <Text style={s.sub}>{tr("Đóng", "Close")}</Text>
            </Pressable>
          )}
        </View>
        <View style={{ gap: 8 }}>
          <Seg
            options={(Object.keys(localeNames) as Locale[]).map((l) => ({ key: l, label: localeNames[l] }))}
            value={pf.lang ?? "vi"}
            onChange={(l) => prefs.update((x) => ({ ...x, lang: l }))}
          />
          <Seg<Theme>
            options={[
              { key: "light", label: tr("Sáng", "Light") },
              { key: "dark", label: tr("Tối", "Dark") },
              { key: "system", label: tr("Theo máy", "System") },
            ]}
            value={pf.theme ?? "light"}
            onChange={(t) => prefs.update((x) => ({ ...x, theme: t }))}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={s.h1}>{tr("Bạn sắp phỏng vấn vị trí nào?", "Which role are you interviewing for?")}</Text>
          <Text style={[s.sub, { fontSize: 15 }]}>{tr("Chọn 1–2 mảng. Đổi lại được bất cứ lúc nào.", "Pick 1–2 fields. You can change them any time.")}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {tracks.map((t) => (
            <Chip key={t} label={trackName[t]} icon={trackIco(t)} color={tc(t)} on={picked.includes(t)} onPress={() => toggle(t)} />
          ))}
        </View>
        <View style={{ gap: 8 }}>
          <Text style={s.b14}>{tr("Cấp độ", "Level")}</Text>
          <Seg options={levels.map((l) => ({ key: l, label: levelShort[l] }))} value={level} onChange={setLevel} />
        </View>
        <Card>
          <Pressable onPress={Platform.OS === "android" ? pickDate : undefined} style={[s.row, { padding: 14, gap: 12 }]}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="cal" size={18} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.b14}>{tr("Ngày phỏng vấn", "Interview date")}</Text>
              <Text style={s.xs}>{date ? `${fmtDay(date)} · ${tr(`còn ${daysBetween(today(), date)} ngày`, `${daysBetween(today(), date)} days left`)}` : tr("Chưa có lịch — chạm để chọn", "Not scheduled — tap to pick")}</Text>
            </View>
            {Platform.OS === "ios" ? (
              <DateTimePicker value={asDate(date)} mode="date" display="compact" minimumDate={new Date()} onChange={(_, d) => onDate(d)} />
            ) : (
              <Icon name="chev" color={C.subtle} />
            )}
          </Pressable>
          <View style={[s.row, s.sep, { padding: 14, gap: 12 }]}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.tip, alignItems: "center", justifyContent: "center" }}>
              <Icon name="bell" size={18} color={C.tipHead} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.b14}>{tr("Nhắc ôn mỗi tối", "Evening reminder")}</Text>
              <Text style={s.xs}>{tr("20:00 · chỉ khi có thẻ đến hạn", "8 PM · only when cards are due")}</Text>
            </View>
            <Switch value={remind} onValueChange={setRemind} trackColor={{ true: C.green }} />
          </View>
        </Card>
      </ScrollView>
      <View style={[s.pad, { paddingBottom: 12, gap: 10 }]}>
        <Btn label={pf.onboarded ? tr("Lưu", "Save") : tr("Bắt đầu · ~10 phút mỗi ngày", "Start · ~10 min a day")} onPress={start} disabled={!picked.length} />
        <Text style={[s.xs, { textAlign: "center" }]}>{tr("Không cần tài khoản. Tiến độ lưu trên máy.", "No account needed. Progress stays on your device.")}</Text>
      </View>
    </Screen>
  );
}
