import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log("Seeding Influencer Universe...");

  const startsAt = new Date();
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + 30);

  const { data: existingSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!existingSeason) {
    await supabase.from("seasons").insert({
      season_number: 1,
      name: "Season 1: Rise to Fame",
      theme: "Viral Velocity",
      description: "Compete for seasonal glory. Top creators earn exclusive rewards.",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      is_active: true,
      reward_tiers: [
        { rank: 1, label: "Season Champion", reward: "$100K + Hall of Fame entry" },
        { rank: 10, label: "Top 10", reward: "$10K + Trend boost" },
        { rank: 100, label: "Top 100", reward: "$2K bonus" },
      ],
    });
    console.log("Created Season 1");
  }

  const skills = [
    { slug: "content_mastery", name: "Content Mastery", description: "Boost content quality and virality", branch: "content", max_level: 10, xp_per_level: 400, sort_order: 1 },
    { slug: "social_momentum", name: "Social Momentum", description: "Grow followers faster", branch: "social", max_level: 10, xp_per_level: 400, sort_order: 2 },
    { slug: "business_acumen", name: "Business Acumen", description: "Increase revenue from all sources", branch: "business", max_level: 10, xp_per_level: 500, sort_order: 3 },
    { slug: "battle_prowess", name: "Battle Prowess", description: "Win more creator battles", branch: "battle", max_level: 10, xp_per_level: 450, sort_order: 4 },
  ];

  for (const s of skills) {
    await supabase.from("skill_definitions").upsert(s, { onConflict: "slug" });
  }
  console.log("Seeded skill trees");

  const perks = [
    { slug: "viral_boost", name: "Viral Boost", description: "+10% virality on all content", branch: "content", required_creator_level: 5, required_skill_slug: "content_mastery", required_skill_level: 2, effect: { virality: 1.1 } },
    { slug: "brand_deals", name: "Brand Magnet", description: "+15% sponsorship value", branch: "business", required_creator_level: 10, required_skill_slug: "business_acumen", required_skill_level: 3, effect: { revenue: 1.15 } },
    { slug: "fan_army", name: "Fan Army", description: "+20% follower growth", branch: "social", required_creator_level: 15, required_skill_slug: "social_momentum", required_skill_level: 4, effect: { followers: 1.2 } },
    { slug: "battle_champion", name: "Battle Champion", description: "+25% battle score", branch: "battle", required_creator_level: 20, required_skill_slug: "battle_prowess", required_skill_level: 5, effect: { battle: 1.25 } },
  ];

  for (const p of perks) {
    await supabase.from("perk_definitions").upsert(p as Record<string, unknown>, { onConflict: "slug" });
  }
  console.log("Seeded perks");

  const houses = [
    { name: "Neon Collective", description: "Trend-setters and viral innovators", fame_score: 500 },
    { name: "Golden Empire", description: "Luxury lifestyle and high fashion", fame_score: 450 },
    { name: "Pixel Legion", description: "Gamers and streamers united", fame_score: 420 },
    { name: "Sound Wave Syndicate", description: "Music and audio creators", fame_score: 380 },
  ];

  const { count: houseCount } = await supabase.from("creator_houses").select("*", { count: "exact", head: true });
  if ((houseCount ?? 0) === 0) {
    for (const h of houses) {
      await supabase.from("creator_houses").insert(h);
    }
    console.log("Seeded creator houses");
  }

  const legacyAchievements = [
    { slug: "hall_of_fame", title: "Hall of Famer", description: "Enter the Hall of Fame", icon: "trophy", requirement_type: "hall_of_fame", requirement_value: 1, xp_reward: 2000, is_legacy: true, is_hall_of_fame: true },
    { slug: "battle_legend", title: "Battle Legend", description: "Win 10 creator battles", icon: "zap", requirement_type: "battle_wins", requirement_value: 10, xp_reward: 800, is_legacy: true, is_hall_of_fame: false },
    { slug: "house_champion", title: "House Champion", description: "Win a weekly house war", icon: "award", requirement_type: "house_war_win", requirement_value: 1, xp_reward: 600, is_legacy: true, is_hall_of_fame: false },
  ];

  for (const a of legacyAchievements) {
    await supabase.from("achievements").upsert(a as Record<string, unknown>, { onConflict: "slug" });
  }

  const achievements = [
    { slug: "first_viral", title: "First Viral Video", description: "Get a trending piece of content", icon: "zap", requirement_type: "viral_content", requirement_value: 1, xp_reward: 200, is_legacy: false, is_hall_of_fame: false },
    { slug: "1m_followers", title: "1M Followers", description: "Reach one million followers", icon: "users", requirement_type: "followers", requirement_value: 1_000_000, xp_reward: 500, is_legacy: false, is_hall_of_fame: false },
    { slug: "10m_followers", title: "10M Followers", description: "Reach ten million followers", icon: "users", requirement_type: "followers", requirement_value: 10_000_000, xp_reward: 1000, is_legacy: false, is_hall_of_fame: false },
    { slug: "100m_views", title: "100M Views Club", description: "Accumulate 100 million total views", icon: "trophy", requirement_type: "views", requirement_value: 100_000_000, xp_reward: 750, is_legacy: false, is_hall_of_fame: false },
    { slug: "creator_of_month", title: "Creator of the Month", description: "Top 10 global ranking", icon: "award", requirement_type: "rank", requirement_value: 10, xp_reward: 300, is_legacy: false, is_hall_of_fame: false },
  ];

  for (const a of achievements) {
    await supabase.from("achievements").upsert(a as Record<string, unknown>, { onConflict: "slug" });
  }
  console.log("Seeded achievements");

  const trends = [
    { title: "Summer Dance Challenge", description: "Drop your best summer dance moves", category: "dance", popularity: 92, growth_rate: 45, competition: "very_high", duration_days: 7, participant_count: 0 },
    { title: "Gaming Marathon Stream", description: "24-hour gaming streams trending worldwide", category: "gaming", popularity: 88, growth_rate: 58, competition: "high", duration_days: 5, participant_count: 0 },
    { title: "Sustainable Fashion Week", description: "Eco-friendly fashion content", category: "fashion", popularity: 76, growth_rate: 32, competition: "low", duration_days: 10, participant_count: 0 },
    { title: "Indie Music Discovery", description: "Showcase underground artists", category: "music", popularity: 81, growth_rate: 41, competition: "medium", duration_days: 14, participant_count: 0 },
    { title: "AI Tech Reviews", description: "Review the latest AI tools", category: "tech", popularity: 79, growth_rate: 67, competition: "medium", duration_days: 7, participant_count: 0 },
  ];

  const { count } = await supabase.from("trends").select("*", { count: "exact", head: true });
  if ((count ?? 0) === 0) {
    for (const t of trends) {
      const end = new Date();
      end.setDate(end.getDate() + t.duration_days);
      await supabase.from("trends").insert({
        ...t,
        ends_at: end.toISOString(),
        reward_multiplier: 1.2,
        is_ai_generated: false,
      });
    }
    console.log("Seeded trends");
  }

  const sponsorshipTemplates = [
    { brand_name: "GameForce Pro", brand_type: "Gaming Brand", contract_value: 50000, min_followers: 10000, min_influence: 30 },
    { brand_name: "StyleVault", brand_type: "Fashion Brand", contract_value: 75000, min_followers: 50000, min_influence: 40 },
    { brand_name: "BeatWave Records", brand_type: "Music Brand", contract_value: 100000, min_followers: 100000, min_influence: 50 },
    { brand_name: "PowerUp Energy", brand_type: "Energy Drink", contract_value: 250000, min_followers: 500000, min_influence: 60 },
    { brand_name: "TechNova", brand_type: "Tech Company", contract_value: 500000, min_followers: 1000000, min_influence: 70 },
  ];

  const { count: sponsorCount } = await supabase.from("sponsorships").select("*", { count: "exact", head: true });
  if ((sponsorCount ?? 0) === 0) {
    for (const s of sponsorshipTemplates) {
      await supabase.from("sponsorships").insert({
        brand_name: s.brand_name,
        brand_type: s.brand_type,
        contract_value: s.contract_value,
        min_followers: s.min_followers,
        min_influence: s.min_influence,
        duration_days: 30,
        benefits: JSON.stringify(["Brand exposure", "Revenue boost", "Verified badge chance"]),
        status: "pending",
        creator_id: null,
      });
    }
    console.log("Seeded sponsorship templates");
  }

  const { count: newsCount } = await supabase.from("news_articles").select("*", { count: "exact", head: true });
  if ((newsCount ?? 0) === 0) {
    await supabase.from("news_articles").insert([
      {
        headline: "Influencer Universe Season 1 Kicks Off",
        summary: "Managers worldwide are competing to build the next generation of AI superstars.",
        category: "general",
        controversy_score: 10,
        is_trending: true,
        is_ai_generated: false,
      },
      {
        headline: "House Wars Begin This Week",
        summary: "Creator houses clash for exclusive rewards and bragging rights.",
        category: "house_war",
        controversy_score: 25,
        is_trending: true,
        is_ai_generated: false,
      },
    ]);
    console.log("Seeded news articles");
  }

  console.log("Seed complete!");
}

seed().catch(console.error);
