import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tr } from "@/lib/shared";
import { usePrefs, useProgress } from "@/lib/store";
import { C, Icon, type Name } from "@/ui/kit";

const tab = (title: string, icon: Name, badge?: number) => ({
  title,
  tabBarIcon: ({ color }: { color: unknown }) => <Icon name={icon} size={24} color={String(color)} />,
  tabBarBadge: badge || undefined,
});

export default function TabLayout() {
  const p = useProgress();
  const { bottom } = useSafeAreaInsets();
  if (!usePrefs().onboarded) return <Redirect href="/onboarding" />;
  const weak = p.weak?.filter((w) => !w.done).length ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.subtle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", lineHeight: 15 },
        tabBarStyle: { height: 64 + bottom, borderTopColor: C.line, backgroundColor: C.tabBar },
        tabBarBadgeStyle: { backgroundColor: C.red, fontSize: 10.5, fontWeight: "700" },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={tab(tr("Câu hỏi", "Questions"), "list")} />
      <Tabs.Screen name="today" options={tab(tr("Hôm nay", "Today"), "home")} />
      <Tabs.Screen name="practice" options={tab(tr("Luyện", "Practice"), "book", weak)} />
      <Tabs.Screen name="glossary" options={tab(tr("Thuật ngữ", "Glossary"), "gloss")} />
      <Tabs.Screen name="interview" options={tab(tr("Phỏng vấn", "Interview"), "mic")} />
    </Tabs>
  );
}
