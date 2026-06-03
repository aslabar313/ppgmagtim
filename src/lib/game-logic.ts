import { supabase } from "@/integrations/supabase/client";
import { BADGES } from "./pintar";

export async function checkAndAwardBadges(childId: string) {
  // 1. Get current stats
  const { data: sessions } = await supabase
    .from("game_sessions")
    .select("category")
    .eq("child_id", childId);

  if (!sessions) return [];

  const countByCategory = sessions.reduce((acc: any, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});

  const totalGames = sessions.length;
  const newBadges: string[] = [];

  // Check logic for each badge
  const criteria: any = {
    "first_steps": totalGames >= 10,
    "math_expert": (countByCategory["math"] || 0) >= 20,
    "bookworm": (countByCategory["reading"] || 0) >= 20,
    "explorer": (countByCategory["science"] || 0) >= 20,
    "artist": (countByCategory["creative"] || 0) >= 10,
    "english_star": (countByCategory["english"] || 0) >= 20,
    "singer": (countByCategory["music"] || 0) >= 20,
    "fifty_games": totalGames >= 50,
  };

  // 2. Get already earned badges
  const { data: earned } = await supabase
    .from("badges_earned")
    .select("badge_key")
    .eq("child_id", childId);
  
  const earnedKeys = new Set(earned?.map(e => e.badge_key) || []);

  // 3. Award new ones
  for (const [key, isMet] of Object.entries(criteria)) {
    if (isMet && !earnedKeys.has(key)) {
      const { error } = await supabase.from("badges_earned").insert({
        child_id: childId,
        badge_key: key
      });
      if (!error) newBadges.push(key);
    }
  }

  return newBadges;
}

export async function updateStreak(childId: string) {
  const { data: prog } = await supabase
    .from("child_progress")
    .select("*")
    .eq("child_id", childId)
    .single();

  if (!prog) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const lastActiveStr = prog.last_active_date ? new Date(prog.last_active_date).toISOString().split('T')[0] : null;

  if (todayStr === lastActiveStr) return; // Already updated today

  let newStreak = 1;
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastActiveStr === yesterdayStr) {
    newStreak = (prog.current_streak || 0) + 1;
  }

  const updates: any = {
    current_streak: newStreak,
    last_active_date: now.toISOString(),
  };

  if (newStreak > (prog.longest_streak || 0)) {
    updates.longest_streak = newStreak;
  }

  await supabase.from("child_progress").update(updates).eq("child_id", childId);
  
  // Check streak badges
  if (newStreak === 3) awardBadge(childId, "streak_3");
  if (newStreak === 7) awardBadge(childId, "streak_7");
  if (newStreak === 30) awardBadge(childId, "streak_30");
}

async function awardBadge(childId: string, badgeKey: string) {
  await supabase.from("badges_earned").insert({ child_id: childId, badge_key: badgeKey }).select().single();
}
