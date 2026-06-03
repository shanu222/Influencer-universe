import type { SupabaseClient } from "@supabase/supabase-js";
import type { Creator, CreatorStats, ContentType } from "@/lib/types/database";
import { generateContentMetadata } from "./ai";
import {
  calculateVirality,
  calculateEnergyCost,
  calculateInfluence,
  calculateFameScore,
  calculateEngagementRate,
} from "./economy";
import { getAvatarGradient, getThumbnailGradient } from "@/lib/utils/format";

type Supabase = SupabaseClient;

export async function getActiveCreator(supabase: Supabase, userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select("active_creator_id")
    .eq("id", userId)
    .single();

  if (!user?.active_creator_id) return null;

  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("id", user.active_creator_id)
    .single();

  return creator as Creator | null;
}

export async function getCreatorWithStats(supabase: Supabase, creatorId: string) {
  const [{ data: creator }, { data: stats }] = await Promise.all([
    supabase.from("creators").select("*").eq("id", creatorId).single(),
    supabase.from("creator_stats").select("*").eq("creator_id", creatorId).single(),
  ]);

  if (!creator || !stats) return null;
  return { creator: creator as Creator, stats: stats as CreatorStats };
}

export async function createContent(
  supabase: Supabase,
  input: {
    creatorId: string;
    contentType: ContentType;
    trendId?: string;
    metadata?: { title: string; description: string; category: string; thumbnailPrompt: string };
  }
) {
  const data = await getCreatorWithStats(supabase, input.creatorId);
  if (!data) throw new Error("Creator not found");

  const { creator, stats } = data;

  if (creator.energy < calculateEnergyCost(input.contentType)) {
    throw new Error("Not enough energy. Rest and try again later.");
  }

  let trendMatchScore = 50;
  let trendRewardMultiplier = 1;

  if (input.trendId) {
    const { data: trend } = await supabase
      .from("trends")
      .select("*")
      .eq("id", input.trendId)
      .single();

    if (trend) {
      trendMatchScore = Math.min(100, trend.popularity + Math.floor(Math.random() * 20));
      trendRewardMultiplier = Number(trend.reward_multiplier);
    }
  }

  const metadata =
    input.metadata ??
    (await generateContentMetadata({
      creator,
      stats,
      contentType: input.contentType,
    }));

  const virality = calculateVirality({
    creator,
    stats,
    contentType: input.contentType,
    trendMatchScore,
    trendRewardMultiplier,
  });

  const { getCreatorDna, applyDnaModifiers } = await import("./dna");
  const dna = await getCreatorDna(supabase, input.creatorId, true);
  const adjusted = applyDnaModifiers(
    {
      followersGained: virality.followersGained,
      revenue: virality.revenue,
      viralityScore: virality.viralityScore,
      energyCost: calculateEnergyCost(input.contentType),
    },
    dna
  );
  virality.followersGained = adjusted.followersGained;
  virality.revenue = adjusted.revenue;
  virality.viralityScore = adjusted.viralityScore;
  virality.isTrending = virality.viralityScore >= 75 && virality.views > creator.followers * 0.5;

  const contentId = crypto.randomUUID();
  const thumbnailGradient = getThumbnailGradient(contentId, input.contentType);

  const { data: content, error } = await supabase
    .from("content")
    .insert({
      id: contentId,
      creator_id: input.creatorId,
      trend_id: input.trendId ?? null,
      type: input.contentType,
      title: metadata.title,
      description: metadata.description,
      category: metadata.category,
      thumbnail_prompt: metadata.thumbnailPrompt,
      thumbnail_gradient: thumbnailGradient,
      quality_score: virality.qualityScore,
      trend_match_score: virality.trendMatchScore,
      audience_match_score: virality.audienceMatchScore,
      virality_score: virality.viralityScore,
      engagement_score: virality.engagementScore,
      views: virality.views,
      likes: virality.likes,
      comments_count: virality.comments,
      shares: virality.shares,
      followers_gained: virality.followersGained,
      revenue: virality.revenue,
      is_trending: virality.isTrending,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const newFollowers = creator.followers + virality.followersGained;
  const newViews = creator.total_views + virality.views;
  const newNetWorth = Number(creator.net_worth) + virality.revenue;
  const newEngagement = calculateEngagementRate(newViews, virality.likes, newFollowers);
  const newConsistency = Math.min(100, creator.consistency_score + 2);
  const newEnergy = Math.max(0, creator.energy - calculateEnergyCost(input.contentType));

  const updatedCreator: Partial<Creator> = {
    followers: newFollowers,
    total_views: newViews,
    net_worth: newNetWorth,
    monthly_revenue: Number(creator.monthly_revenue) + virality.revenue,
    engagement_rate: newEngagement,
    consistency_score: newConsistency,
    energy: newEnergy,
    content_count: creator.content_count + 1,
    last_content_at: new Date().toISOString(),
    fame_score: 0,
    influence: 0,
  };

  updatedCreator.influence = calculateInfluence({ ...creator, ...updatedCreator } as Creator);
  updatedCreator.fame_score = calculateFameScore({ ...creator, ...updatedCreator } as Creator);

  await supabase.from("creators").update(updatedCreator).eq("id", input.creatorId);

  await supabase.from("transactions").insert({
    creator_id: input.creatorId,
    type: "content_revenue",
    amount: virality.revenue,
    description: `Revenue from: ${metadata.title}`,
    reference_id: contentId,
    reference_type: "content",
  });

  await recordAnalyticsSnapshot(supabase, input.creatorId);
  await checkAchievements(supabase, input.creatorId, creator.user_id, virality.isTrending);

  const { awardXp, awardSkillXp, xpFromContent } = await import("./xp");
  await awardXp(supabase, input.creatorId, xpFromContent(virality.viralityScore, virality.followersGained), "content");
  await awardSkillXp(supabase, input.creatorId, "content_mastery", Math.round(virality.viralityScore * 2));

  const { updatePersonalityGoals } = await import("./personality");
  await updatePersonalityGoals(supabase, input.creatorId, { ...creator, ...updatedCreator });

  if (creator.house_id) {
    const { contributeToHouseWar } = await import("./house-wars");
    await contributeToHouseWar(supabase, input.creatorId, creator.house_id, Math.round(virality.viralityScore / 5)).catch(() => {});
  }

  const { maybeSpawnLifeEvent } = await import("./life-events");
  await maybeSpawnLifeEvent(supabase, { ...creator, ...updatedCreator } as Creator, creator.user_id);

  if (virality.isTrending) {
    const { publishNews } = await import("./news");
    await publishNews(supabase, {
      headline: `${creator.name}'s "${metadata.title}" Goes Viral`,
      summary: metadata.description?.slice(0, 200) ?? "Breaking across the influencer universe.",
      category: "viral",
      relatedCreatorId: input.creatorId,
      controversyScore: virality.viralityScore > 90 ? 55 : 20,
      isTrending: true,
    });
  }

  if (virality.isTrending) {
    await createNotification(supabase, {
      userId: creator.user_id,
      creatorId: input.creatorId,
      type: "viral_content",
      title: "Your content went viral!",
      message: `"${metadata.title}" is trending with ${virality.views.toLocaleString()} views!`,
      data: { contentId, views: virality.views },
    });
  }

  const { createPostFromContent } = await import("./social");
  await createPostFromContent(
    supabase,
    input.creatorId,
    contentId,
    metadata.description ?? metadata.title,
    virality.isTrending
  ).catch(() => {});

  if (virality.followersGained >= 1000) {
    await createNotification(supabase, {
      userId: creator.user_id,
      creatorId: input.creatorId,
      type: "follower_milestone",
      title: "Follower surge!",
      message: `You gained ${virality.followersGained.toLocaleString()} followers from your latest content.`,
      data: { followersGained: virality.followersGained },
    });
  }

  return content;
}

export async function createSong(
  supabase: Supabase,
  input: { creatorId: string; genre: string; metadata?: { songName: string; albumName: string; lyricsConcept: string } }
) {
  const { generateSongMetadata } = await import("./ai");
  const { calculateSongPerformance, calculateEnergyCost } = await import("./economy");

  const data = await getCreatorWithStats(supabase, input.creatorId);
  if (!data) throw new Error("Creator not found");

  const { creator, stats } = data;
  const energyCost = calculateEnergyCost("music");

  if (creator.energy < energyCost) {
    throw new Error("Not enough energy to record a song.");
  }

  const metadata =
    input.metadata ?? (await generateSongMetadata({ creator, stats, genre: input.genre }));

  const performance = calculateSongPerformance({
    stats,
    creator,
    genre: input.genre,
    trendScore: creator.trend_score,
  });

  const contentId = crypto.randomUUID();
  const { data: content } = await supabase
    .from("content")
    .insert({
      id: contentId,
      creator_id: input.creatorId,
      type: "music",
      title: metadata.songName,
      description: metadata.lyricsConcept,
      category: input.genre,
      thumbnail_gradient: getThumbnailGradient(contentId, "music"),
      quality_score: performance.popularityScore,
      trend_match_score: performance.trendScore,
      audience_match_score: performance.popularityScore,
      virality_score: performance.successPrediction,
      engagement_score: performance.popularityScore,
      views: performance.streams,
      likes: Math.round(performance.streams * 0.08),
      shares: Math.round(performance.streams * 0.02),
      followers_gained: performance.followersGained,
      revenue: performance.revenue,
      is_trending: performance.successPrediction >= 80,
    })
    .select()
    .single();

  const { data: song, error } = await supabase
    .from("songs")
    .insert({
      creator_id: input.creatorId,
      content_id: contentId,
      song_name: metadata.songName,
      album_name: metadata.albumName,
      genre: input.genre,
      lyrics_concept: metadata.lyricsConcept,
      popularity_score: performance.popularityScore,
      trend_score: performance.trendScore,
      success_prediction: performance.successPrediction,
      streams: performance.streams,
      revenue: performance.revenue,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const newFollowers = creator.followers + performance.followersGained;
  await supabase
    .from("creators")
    .update({
      followers: newFollowers,
      total_views: creator.total_views + performance.streams,
      net_worth: Number(creator.net_worth) + performance.revenue,
      monthly_revenue: Number(creator.monthly_revenue) + performance.revenue,
      energy: Math.max(0, creator.energy - energyCost),
      content_count: creator.content_count + 1,
      fame_score: calculateFameScore({
        ...creator,
        followers: newFollowers,
        total_views: creator.total_views + performance.streams,
      }),
      influence: calculateInfluence({ ...creator, followers: newFollowers }),
    })
    .eq("id", input.creatorId);

  await supabase.from("transactions").insert({
    creator_id: input.creatorId,
    type: "content_revenue",
    amount: performance.revenue,
    description: `Song release: ${metadata.songName}`,
    reference_id: song?.id,
    reference_type: "song",
  });

  await recordAnalyticsSnapshot(supabase, input.creatorId);
  return { song, content };
}

export async function joinTrend(supabase: Supabase, creatorId: string, trendId: string) {
  const { data: existing } = await supabase
    .from("trend_participations")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("trend_id", trendId)
    .maybeSingle();

  if (existing) throw new Error("Already joined this trend");

  const { data: trend } = await supabase.from("trends").select("*").eq("id", trendId).single();
  if (!trend || !trend.is_active) throw new Error("Trend is not active");

  await supabase.from("trend_participations").insert({ trend_id: trendId, creator_id: creatorId });

  await supabase
    .from("trends")
    .update({ participant_count: trend.participant_count + 1 })
    .eq("id", trendId);

  const data = await getCreatorWithStats(supabase, creatorId);
  if (data) {
    await supabase
      .from("creators")
      .update({ trend_score: Math.min(100, data.creator.trend_score + 5) })
      .eq("id", creatorId);

    await createNotification(supabase, {
      userId: data.creator.user_id,
      creatorId,
      type: "trend_joined",
      title: "Joined a trend!",
      message: `You're now participating in "${trend.title}". Create content to boost your score!`,
      data: { trendId },
    });
  }

  return trend;
}

export async function updateRankings(supabase: Supabase) {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .single();

  if (!season) return;

  const { data: creators } = await supabase
    .from("creators")
    .select("id, followers, net_worth, influence, fame_score, level, nationality, niche")
    .order("followers", { ascending: false })
    .limit(100);

  if (!creators) return;

  const rankTypes = [
    { type: "global", sortKey: "followers" as const },
    { type: "influence", sortKey: "influence" as const },
    { type: "net_worth", sortKey: "net_worth" as const },
    { type: "fame", sortKey: "fame_score" as const },
  ];

  for (const { type, sortKey } of rankTypes) {
    const sorted = [...creators].sort(
      (a, b) => Number(b[sortKey]) - Number(a[sortKey])
    );

    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      const { data: existing } = await supabase
        .from("rankings")
        .select("rank_position")
        .eq("season_id", season.id)
        .eq("creator_id", c.id)
        .eq("rank_type", type)
        .maybeSingle();

      await supabase.from("rankings").upsert(
        {
          season_id: season.id,
          creator_id: c.id,
          rank_type: type,
          rank_position: i + 1,
          previous_position: existing?.rank_position ?? null,
          score: Number(c[sortKey]),
          country_code: c.nationality,
          niche: c.niche,
        },
        { onConflict: "season_id,creator_id,rank_type" }
      );
    }
  }

  const { updateAgencyRankings } = await import("./agency");
  await updateAgencyRankings(supabase, season.id);
}

async function recordAnalyticsSnapshot(supabase: Supabase, creatorId: string) {
  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("id", creatorId)
    .single();

  if (!creator) return;

  const today = new Date().toISOString().split("T")[0];
  const { data: yesterday } = await supabase
    .from("analytics")
    .select("followers")
    .eq("creator_id", creatorId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("analytics").upsert(
    {
      creator_id: creatorId,
      date: today,
      followers: creator.followers,
      followers_gained: creator.followers - (yesterday?.followers ?? 0),
      views: creator.total_views,
      revenue: creator.monthly_revenue,
      engagement_rate: creator.engagement_rate,
      trend_score: creator.trend_score,
      influence: creator.influence,
    },
    { onConflict: "creator_id,date" }
  );
}

async function checkAchievements(
  supabase: Supabase,
  creatorId: string,
  userId: string,
  hadViralContent = false
) {
  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("id", creatorId)
    .single();

  if (!creator) return;

  const { data: achievements } = await supabase.from("achievements").select("*");
  const { data: unlocked } = await supabase
    .from("creator_achievements")
    .select("achievement_id")
    .eq("creator_id", creatorId);

  const unlockedIds = new Set(unlocked?.map((u) => u.achievement_id) ?? []);

  for (const achievement of achievements ?? []) {
    if (unlockedIds.has(achievement.id)) continue;

    let met = false;
    switch (achievement.requirement_type) {
      case "followers":
        met = creator.followers >= achievement.requirement_value;
        break;
      case "views":
        met = creator.total_views >= achievement.requirement_value;
        break;
      case "viral_content":
        met = hadViralContent;
        break;
      default:
        break;
    }

    if (met) {
      await supabase.from("creator_achievements").insert({
        creator_id: creatorId,
        achievement_id: achievement.id,
      });

      await createNotification(supabase, {
        userId,
        creatorId,
        type: "achievement_unlocked",
        title: "Achievement Unlocked!",
        message: achievement.title,
        data: { achievementId: achievement.id },
      });
    }
  }
}

async function createNotification(
  supabase: Supabase,
  input: {
    userId: string;
    creatorId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }
) {
  await supabase.from("notifications").insert({
    user_id: input.userId,
    creator_id: input.creatorId,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data ?? {},
  });
}

export async function createCreator(
  supabase: Supabase,
  userId: string,
  input: {
    name: string;
    gender: string;
    age: number;
    nationality: string;
    niche: string;
    personality: string;
    stats: Record<string, number>;
  }
) {
  const { slugifyHandle, getAvatarGradient } = await import("@/lib/utils/format");
  const handle = slugifyHandle(input.name) + "_" + Date.now().toString(36).slice(-4);
  const creatorId = crypto.randomUUID();

  const { data: creator, error } = await supabase
    .from("creators")
    .insert({
      id: creatorId,
      user_id: userId,
      name: input.name,
      handle,
      gender: input.gender,
      age: input.age,
      nationality: input.nationality,
      niche: input.niche,
      personality: input.personality,
      avatar_gradient: getAvatarGradient(creatorId),
      followers: 100,
      subscribers: 10,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("creator_stats").insert({
    creator_id: creatorId,
    ...input.stats,
  });

  await supabase
    .from("users")
    .update({ active_creator_id: creatorId })
    .eq("id", userId);

  const { createCreatorDna } = await import("./dna");
  const { createCreatorPersonality } = await import("./personality");
  const { createAgencyForUser, addCreatorToAgency } = await import("./agency");

  await createCreatorDna(supabase, creatorId, input.niche);
  await createCreatorPersonality(supabase, creatorId, input.niche, input.personality);

  const { data: userProfile } = await supabase.from("users").select("username, agency_id").eq("id", userId).single();
  let agencyId = userProfile?.agency_id;
  if (!agencyId) {
    const agency = await createAgencyForUser(supabase, userId, userProfile?.username ?? "player");
    agencyId = agency?.id;
  }
  if (agencyId) {
    const { count } = await supabase
      .from("agency_creators")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId);
    await addCreatorToAgency(supabase, agencyId, creatorId, (count ?? 0) === 0);
  }

  await recordAnalyticsSnapshot(supabase, creatorId);
  return creator;
}
