// Thành phần giao diện dùng chung. Màu sáng = :root của mockup app/v3/mobile.html, màu tối = html.dark của web.
import type { ReactNode } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { levelColor, paths, trackColor, trackIcon, type IconName, type Level, type Seg as Segs, type Track } from "@/lib/shared";

const light = {
  bg: "#f5f6fa", surface: "#fff", raised: "#fff", hover: "#f1f3f8", line: "#e7e9f0", line2: "#d9dce6",
  text: "#0f172a", body: "#334155", muted: "#475569", subtle: "#64748b",
  brand: "#6d28d9", brandSoft: "#f3efff", brandLine: "#ddd3fe", brandInk: "#1e1b4b",
  green: "#059669", amber: "#d97706", red: "#dc2626", track: "#eceef4", code: "#0f172a",
  tip: "#fff7ed", tipLine: "#fed7aa", tipInk: "#431407", tipHead: "#c2410c",
  ex: "#f0f9ff", exLine: "#bae6fd", exInk: "#0c4a6e", exHead: "#0369a1",
  redSoft: "#fef2f2", redLine: "#fecaca", amberSoft: "#fffbeb", amberLine: "#fde68a",
  greenSoft: "#ecfdf5", greenLine: "#a7f3d0", greenInk: "#065f46", tabBar: "rgba(255,255,255,.96)",
};
const dark: typeof light = {
  bg: "#0b0d16", surface: "#131624", raised: "#2a3048", hover: "#20253a", line: "rgba(255,255,255,.08)", line2: "rgba(255,255,255,.13)",
  text: "#e6e8f2", body: "#c3c9db", muted: "#a3abc2", subtle: "#8f98b0",
  brand: "#8b5cf6", brandSoft: "rgba(124,58,237,.16)", brandLine: "rgba(139,92,246,.38)", brandInk: "#ddd6fe",
  green: "#10b981", amber: "#f59e0b", red: "#ef4444", track: "rgba(255,255,255,.08)", code: "#080a12",
  tip: "rgba(249,115,22,.1)", tipLine: "rgba(249,115,22,.3)", tipInk: "#fed7aa", tipHead: "#fb923c",
  ex: "rgba(14,165,233,.1)", exLine: "rgba(14,165,233,.3)", exInk: "#bae6fd", exHead: "#38bdf8",
  redSoft: "rgba(239,68,68,.14)", redLine: "rgba(239,68,68,.35)", amberSoft: "rgba(245,158,11,.14)", amberLine: "rgba(245,158,11,.35)",
  greenSoft: "rgba(16,185,129,.14)", greenLine: "rgba(16,185,129,.35)", greenInk: "#a7f3d0", tabBar: "rgba(19,22,36,.96)",
};
/** Bảng màu đang dùng. Đổi tại chỗ qua setTheme (root _layout dựng lại toàn bộ cây màn hình sau khi đổi). */
export const C = { ...light };
let isDark = false;
export const mono = Platform.select({ ios: "Menlo", default: "monospace" });
/** Màu mảng/level chọn cho nền trắng; trên nền tối pha 48% trắng cho dễ đọc (như html.dark của web). */
const ink = (hex: string) =>
  isDark ? "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.52 + 255 * 0.48).toString(16).padStart(2, "0")).join("") : hex;
export const tc = (t: Track) => ink(trackColor[t][0]);
export const lc = (l: Level) => ink(levelColor[l][0]);
/** Màu nhạt từ màu đậm (giống color-mix 10% với trắng trong mockup). */
export const tint = (hex: string, a = 0.1) => hex + Math.round(a * 255).toString(16).padStart(2, "0");

// Icon riêng của mobile, chưa có trong bộ của web.
const extra: Record<string, string> = {
  volume: "M11 5 6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14",
  skip: "M5 4l10 8-10 8zM19 5v14",
  hand: "M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
  keyboard: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M8 15h8",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  gear: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  back: "m15 18-6-6 6-6",
  stop: "M6 6h12v12H6z",
};
export type Name = IconName | keyof typeof extra;
export const trackIco = (t: Track) => trackIcon[t] as Name;

export function Icon({ name, size = 20, color = C.text, fill = "none", width = 1.8 }: { name: Name; size?: number; color?: string; fill?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={(paths as Record<string, string>)[name] ?? extra[name]} />
    </Svg>
  );
}

export function Tag({ label, color, style }: { label: string; color: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.tag, { backgroundColor: tint(color), borderColor: tint(color, 0.22) }, style]}>
      <Text style={[s.tagT, { color }]}>{label}</Text>
    </View>
  );
}

export function Chip({ label, icon, color, on, count, onPress, small, style }: {
  label: string; icon?: Name; color?: string; on?: boolean; count?: number; onPress?: () => void; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} style={[s.chip, small && { height: 34, paddingHorizontal: 12 }, on && s.chipOn, style]}>
      {icon && <Icon name={icon} size={16} color={color ?? C.subtle} />}
      <Text style={[s.chipT, small && { fontSize: 13 }, on && { color: C.brandInk }]}>{label}</Text>
      {count !== undefined && <Text style={s.chipN}>{count}</Text>}
    </Pressable>
  );
}

export const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[s.card, style]}>{children}</View>;

export const Bar = ({ value, color = C.brand, style }: { value: number; color?: string; style?: StyleProp<ViewStyle> }) => (
  <View style={[s.bar, style]}>
    <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height: "100%", backgroundColor: color, borderRadius: 99 }} />
  </View>
);

export function Seg<K extends string>({ options, value, onChange }: { options: { key: K; label: string; n?: number }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => onChange(o.key)} style={[s.segI, o.key === value && s.segOn]}>
          <Text style={[s.segT, o.key === value && { color: C.text }]}>{o.label}</Text>
          {o.n !== undefined && <Text style={s.segN}>{o.n}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

export function Btn({ label, icon, onPress, ghost, disabled, style }: { label: string; icon?: Name; onPress?: () => void; ghost?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const color = ghost ? C.text : "#fff";
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.btn, ghost ? s.btnGhost : s.btnPrimary, disabled && { opacity: 0.5 }, style]}>
      {icon && <Icon name={icon} size={18} color={color} />}
      <Text style={[s.btnT, { color }]}>{label}</Text>
    </Pressable>
  );
}

export const IconBtn = ({ name, onPress, color, size = 40, style }: { name: Name; onPress?: () => void; color?: string; size?: number; style?: StyleProp<ViewStyle> }) => (
  <Pressable onPress={onPress} hitSlop={6} style={[s.iconBtn, { width: size, height: size }, style]}>
    <Icon name={name} size={20} color={color} />
  </Pressable>
);

/** Thanh trên của màn con: nút đóng/quay lại + tiêu đề / thanh tiến độ ở giữa + nút phải. */
export function TopNav({ left = "x", onLeft, center, right }: { left?: Name; onLeft: () => void; center?: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.topnav}>
      <IconBtn name={left} onPress={onLeft} />
      <View style={{ flex: 1 }}>{center}</View>
      {right ?? <View style={{ width: 40 }} />}
    </View>
  );
}

/** Nền + lề an toàn phía trên. Tab đã có thanh dưới nên chỉ chừa phía trên. */
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { top, bottom } = useSafeAreaInsets();
  return <View style={[{ flex: 1, backgroundColor: C.bg, paddingTop: top, paddingBottom: bottom }, style]}>{children}</View>;
}

/** Bảng trượt từ dưới lên. */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: bottom + 16 }]}>
        <View style={s.grab} />
        <ScrollView bounces={false} contentContainerStyle={{ gap: 12 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

/** Chọn 1 giá trị trong danh sách (thay cho dropdown). */
export function PickerSheet<K extends string>({ visible, title, options, value, onPick, onClose }: {
  visible: boolean; title: string; options: { key: K; label: string; icon?: Name; color?: string }[]; value: K; onPick: (k: K) => void; onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={s.h2}>{title}</Text>
      <Card>
        {options.map((o, i) => (
          <Pressable key={o.key} onPress={() => { onPick(o.key); onClose(); }} style={[s.row, s.pickRow, i > 0 && s.sep]}>
            {o.icon && <Icon name={o.icon} size={18} color={o.color ?? C.subtle} />}
            <Text style={[s.b15, { flex: 1 }]}>{o.label}</Text>
            {o.key === value && <Icon name="check" size={18} color={C.brand} width={2.4} />}
          </Pressable>
        ))}
      </Card>
    </Sheet>
  );
}

/** Đoạn văn có thuật ngữ gạch chân, chạm để mở giải thích. **x** in đậm như web. */
export function Rich({ segs, onTerm, style }: { segs: Segs[]; onTerm: (id: string) => void; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={style}>
      {segs.map((x, i) =>
        typeof x === "string" ? (
          x.split(/(\*\*[^*\n]+\*\*)/).map((p, j) => (p.startsWith("**") && p.endsWith("**") ? <Text key={`${i}-${j}`} style={{ fontWeight: "700" }}>{p.slice(2, -2)}</Text> : p))
        ) : x.self ? (
          <Text key={i} style={{ fontWeight: "700" }}>{x.t}</Text>
        ) : (
          <Text key={i} onPress={() => onTerm(x.g)} style={s.term}>{x.t}</Text>
        ),
      )}
    </Text>
  );
}

export const Code = ({ code }: { code: string }) => (
  <ScrollView horizontal style={s.code} contentContainerStyle={{ padding: 14 }}>
    <Text style={{ fontFamily: mono, fontSize: 12.5, lineHeight: 19, color: "#e2e8f0" }}>{code}</Text>
  </ScrollView>
);

const makeStyles = () => StyleSheet.create({
  h1: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6, color: C.text },
  h2: { fontSize: 17, fontWeight: "700", color: C.text },
  b15: { fontSize: 15, fontWeight: "600", color: C.text },
  b14: { fontSize: 14, fontWeight: "700", color: C.text },
  sub: { fontSize: 13, color: C.muted },
  xs: { fontSize: 12, color: C.subtle, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  sep: { borderTopWidth: 1, borderTopColor: C.line },
  pad: { paddingHorizontal: 20 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 18 },
  tag: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 2, alignSelf: "flex-start" },
  tagT: { fontSize: 12, fontWeight: "700" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: C.line2, backgroundColor: C.surface },
  chipOn: { borderColor: C.brand, backgroundColor: C.brandSoft, borderWidth: 2, paddingHorizontal: 13 },
  chipT: { fontSize: 14, fontWeight: "600", color: C.muted },
  chipN: { fontSize: 12, fontWeight: "600", color: C.subtle },
  bar: { height: 6, borderRadius: 99, backgroundColor: C.track, overflow: "hidden" },
  seg: { flexDirection: "row", backgroundColor: C.hover, borderRadius: 12, padding: 3, gap: 3 },
  segI: { flex: 1, height: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 10 },
  segOn: { backgroundColor: C.raised, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segT: { fontSize: 14, fontWeight: "600", color: C.muted },
  segN: { fontSize: 12, fontWeight: "600", color: C.subtle },
  btn: { height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20 },
  btnPrimary: { backgroundColor: C.brand, shadowColor: C.brand, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  btnGhost: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line2 },
  btnT: { fontSize: 16, fontWeight: "700" },
  iconBtn: { borderRadius: 99, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  topnav: { height: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20 },
  scrim: { flex: 1, backgroundColor: "rgba(15,23,42,.35)" },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 10, maxHeight: "85%" },
  grab: { alignSelf: "center", width: 40, height: 5, borderRadius: 99, backgroundColor: C.line2, marginBottom: 12 },
  pickRow: { paddingHorizontal: 16, paddingVertical: 14 },
  term: { color: C.brandInk, fontWeight: "600", textDecorationLine: "underline", textDecorationStyle: "dotted", textDecorationColor: C.brand },
  code: { backgroundColor: C.code, borderRadius: 14 },
  search: { height: 46, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
  searchT: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 0 },
});
// Bản sao thường (không đóng băng) để setTheme ghi đè tại chỗ.
export const s = { ...makeStyles() };

export function setTheme(d: boolean) {
  isDark = d;
  Object.assign(C, d ? dark : light);
  Object.assign(s, makeStyles());
}
