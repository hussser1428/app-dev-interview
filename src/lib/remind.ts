// Nhắc ôn 20:00, chỉ vào những ngày có thẻ đến hạn. Hẹn giờ ngay trên máy, không cần server push.
// ponytail: lên lịch trước 7 ngày, tính lại mỗi khi app vào nền; người bỏ app > 7 ngày sẽ không được nhắc nữa.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { byTrack } from "./data";
import { addDays, isDue, streak, today, tr } from "./shared";
import { prefs, progress } from "./store";

const CHANNEL = "review";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function askPermission() {
  if (Platform.OS === "android")
    // eslint-disable-next-line import/namespace -- có export (qua export * lồng nhau), plugin import không thấy
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: tr("Nhắc ôn", "Review reminders"), importance: Notifications.AndroidImportance.DEFAULT });
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

export async function reschedule() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const pf = prefs.read();
  if (!pf.remind || !(await Notifications.getPermissionsAsync()).granted) return;
  const p = progress.read();
  const ids = pf.tracks.flatMap((t) => byTrack(t).map((q) => q.id));
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const day = addDays(today(), i);
    const at = new Date(`${day}T20:00:00`);
    const n = ids.filter((id) => isDue(p.q[id], day)).length;
    if (at <= now || n === 0) continue;
    const s = streak(p.days);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: tr(`${n} thẻ cần ôn · ~${n} phút`, `${n} cards to review · ~${n} min`),
        body: s
          ? tr(`Ôn tối nay để giữ chuỗi ${s} ngày 🔥`, `Review tonight to keep your ${s}-day streak 🔥`)
          : tr("Ôn vài phút trước khi nghỉ để nhớ lâu hơn.", "A few minutes before bed makes it stick."),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}
