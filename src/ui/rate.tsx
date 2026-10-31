// Tự chấm Khó / Vừa / Dễ, ghi rõ lần ôn tới (srs.nextInterval).
import { Pressable, Text, View } from "react-native";
import { nextInterval, ratingName, tr, type Rating } from "@/lib/shared";
import { useProgress } from "@/lib/store";
import { C } from "./kit";

export function RateButtons({ id, onRate }: { id: string; onRate: (r: Rating) => void }) {
  const prev = useProgress().q[id]?.interval;
  const kinds: { r: Rating; label: string; c: string; bg: string; line: string }[] = [
    { r: 1, label: ratingName.hard, c: C.red, bg: C.redSoft, line: C.redLine },
    { r: 2, label: ratingName.medium, c: C.amber, bg: C.amberSoft, line: C.amberLine },
    { r: 3, label: ratingName.easy, c: C.green, bg: C.greenSoft, line: C.greenLine },
  ];
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {kinds.map((k) => {
        const n = nextInterval(prev, k.r);
        return (
          <Pressable
            key={k.r}
            onPress={() => onRate(k.r)}
            style={{ flex: 1, height: 62, borderRadius: 16, borderWidth: 1.5, borderColor: k.line, backgroundColor: k.bg, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: k.c, fontWeight: "800", fontSize: 15 }}>{k.label}</Text>
            <Text style={{ color: k.c, fontWeight: "600", fontSize: 12, opacity: 0.8 }}>{n === 1 ? tr("ôn lại mai", "tomorrow") : tr(`${n} ngày`, `${n} days`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
