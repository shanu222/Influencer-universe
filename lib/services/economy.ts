import type { Creator, CreatorStats, ContentType } from "@/lib/types/database";

export interface ViralityInput {
  creator: Creator;
  stats: CreatorStats;
  contentType: ContentType;
  trendMatchScore: number;
  trendRewardMultiplier?: number;
}

export interface ViralityResult {
  qualityScore: number;
  trendMatchScore: number;
  audienceMatchScore: number;
  viralityScore: number;
  engagementScore: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  followersGained: number;
  revenue: number;
  isTrending: boolean;
}

function diminishingReturns(value: number, cap: number): number {
  return cap * (1 - Math.exp(-value / cap));
}

function nicheAudienceFit(niche: string, contentType: ContentType): number {
  const fitMap: Record<string, Partial<Record<ContentType, number>>> = {
    singer: { music: 95, video: 80, short: 75, livestream: 70 },
    rapper: { music: 95, short: 85, video: 80, livestream: 65 },
    gamer: { gaming: 98, livestream: 95, video: 85, short: 70 },
    streamer: { livestream: 98, gaming: 90, video: 75, short: 65 },
    actor: { video: 90, short: 80, comedy: 75 },
    comedian: { comedy: 98, short: 90, video: 85, podcast: 80 },
    fashion: { fashion: 98, short: 85, video: 75 },
    fitness: { video: 90, short: 85, livestream: 80 },
    entrepreneur: { podcast: 90, video: 80, short: 70 },
  };
  return fitMap[niche]?.[contentType] ?? 60;
}

export function calculateContentQuality(stats: CreatorStats, creator: Creator): number {
  const raw =
    stats.creativity * 0.25 +
    stats.talent * 0.2 +
    stats.charisma * 0.15 +
    stats.discipline * 0.15 +
    stats.authenticity * 0.15 +
    stats.confidence * 0.1;

  const consistencyBonus = creator.consistency_score * 0.05;
  return Math.min(100, Math.round(raw + consistencyBonus));
}

export function calculateAudienceMatch(
  stats: CreatorStats,
  niche: string,
  contentType: ContentType
): number {
  const baseFit = nicheAudienceFit(niche, contentType);
  const personalityBonus = (stats.charisma + stats.authenticity) / 20;
  return Math.min(100, Math.round(baseFit * 0.7 + personalityBonus));
}

export function calculateViralityMultiplier(
  stats: CreatorStats,
  reputation: number,
  trendMatch: number
): number {
  const dramaBoost = stats.drama > 70 ? 1.15 : 1;
  const humorBoost = stats.humor > 75 ? 1.1 : 1;
  const repBoost = 1 + (reputation - 3) * 0.05;
  const trendBoost = 1 + trendMatch / 200;
  return dramaBoost * humorBoost * repBoost * trendBoost;
}

export function calculateFollowerGrowth(input: {
  creativity: number;
  trendScore: number;
  contentQuality: number;
  viralityMultiplier: number;
  currentFollowers: number;
  audienceFit: number;
  consistency: number;
  reputation: number;
}): number {
  const baseGrowth =
    input.creativity * 0.3 +
    input.trendScore * 0.25 +
    input.contentQuality * 0.25 +
    input.audienceFit * 0.1 +
    input.consistency * 0.1;

  const scaled = baseGrowth * input.viralityMultiplier;
  const diminished = diminishingReturns(scaled, 50000);
  const followerPenalty = 1 / (1 + Math.log10(Math.max(input.currentFollowers, 100)) / 3);

  return Math.max(1, Math.round(diminished * followerPenalty));
}

export function calculateVirality(input: ViralityInput): ViralityResult {
  const { creator, stats, contentType, trendMatchScore, trendRewardMultiplier = 1 } = input;

  const qualityScore = calculateContentQuality(stats, creator);
  const audienceMatchScore = calculateAudienceMatch(stats, creator.niche, contentType);
  const viralityMultiplier = calculateViralityMultiplier(stats, creator.reputation, trendMatchScore);

  const viralityScore = Math.min(
    100,
    Math.round(
      (qualityScore * 0.3 +
        trendMatchScore * 0.25 +
        audienceMatchScore * 0.25 +
        stats.charisma * 0.1 +
        stats.humor * 0.1) *
        (viralityMultiplier > 1.2 ? 1.05 : 1)
    )
  );

  const engagementScore = Math.min(
    100,
    Math.round(audienceMatchScore * 0.4 + stats.charisma * 0.3 + stats.authenticity * 0.3)
  );

  const followersGained = calculateFollowerGrowth({
    creativity: stats.creativity,
    trendScore: creator.trend_score,
    contentQuality: qualityScore,
    viralityMultiplier,
    currentFollowers: creator.followers,
    audienceFit: audienceMatchScore,
    consistency: creator.consistency_score,
    reputation: creator.reputation,
  });

  const trendBoost = 1 + trendMatchScore / 100;
  const baseViews = followersGained * (8 + viralityScore / 10) * trendBoost * trendRewardMultiplier;
  const views = Math.round(baseViews * (0.8 + Math.random() * 0.4));

  const likes = Math.round(views * (engagementScore / 1000) * (0.8 + Math.random() * 0.4));
  const comments = Math.round(likes * 0.03 * (0.8 + Math.random() * 0.4));
  const shares = Math.round(likes * 0.08 * (0.8 + Math.random() * 0.4));

  const revenue = Math.round(views * 0.002 * qualityScore * 0.01 * 100) / 100;
  const isTrending = viralityScore >= 75 && views > creator.followers * 0.5;

  return {
    qualityScore,
    trendMatchScore,
    audienceMatchScore,
    viralityScore,
    engagementScore,
    views,
    likes,
    comments,
    shares,
    followersGained: Math.round(followersGained * trendRewardMultiplier),
    revenue,
    isTrending,
  };
}

export function calculateSongPerformance(input: {
  stats: CreatorStats;
  creator: Creator;
  genre: string;
  trendScore: number;
}): {
  popularityScore: number;
  trendScore: number;
  successPrediction: number;
  streams: number;
  revenue: number;
  followersGained: number;
} {
  const genreFit: Record<string, number> = {
    pop: input.stats.creativity * 0.9,
    hip_hop: input.stats.talent * 0.95,
    rap: input.stats.talent * 0.95,
    r_and_b: input.stats.charisma * 0.9,
    rock: input.stats.talent * 0.85,
    electronic: input.stats.creativity * 0.85,
    country: input.stats.authenticity * 0.9,
    indie: input.stats.authenticity * 0.95,
  };

  const fit = genreFit[input.genre] ?? input.stats.talent * 0.8;
  const popularityScore = Math.min(100, Math.round(fit * 0.6 + input.stats.confidence * 0.2 + input.creator.fame_score * 0.2));
  const trendScore = Math.min(100, Math.round((input.trendScore + popularityScore) / 2));
  const successPrediction = Math.min(
    100,
    Math.round(popularityScore * 0.5 + trendScore * 0.3 + input.stats.discipline * 0.2)
  );

  const streams = Math.round(
    diminishingReturns(successPrediction * 1000 * (1 + input.creator.followers / 100000), 5000000) *
      (0.8 + Math.random() * 0.4)
  );
  const revenue = Math.round(streams * 0.004 * 100) / 100;
  const followersGained = calculateFollowerGrowth({
    creativity: input.stats.creativity,
    trendScore: trendScore,
    contentQuality: popularityScore,
    viralityMultiplier: 1 + successPrediction / 200,
    currentFollowers: input.creator.followers,
    audienceFit: fit,
    consistency: input.creator.consistency_score,
    reputation: input.creator.reputation,
  });

  return { popularityScore, trendScore, successPrediction, streams, revenue, followersGained };
}

export function calculateInfluence(creator: Creator): number {
  const followerScore = Math.min(40, Math.log10(Math.max(creator.followers, 1)) * 8);
  const fameScore = creator.fame_score * 0.3;
  const repScore = creator.reputation * 4;
  const engagementScore = Math.min(20, creator.engagement_rate * 2);
  return Math.min(100, Math.round(followerScore + fameScore + repScore + engagementScore));
}

export function calculateFameScore(creator: Creator): number {
  const viewsScore = Math.min(30, Math.log10(Math.max(creator.total_views, 1)) * 5);
  const followerScore = Math.min(30, Math.log10(Math.max(creator.followers, 1)) * 6);
  const influenceScore = creator.influence * 0.4;
  return Math.min(100, Math.round(viewsScore + followerScore + influenceScore));
}

export function calculateEngagementRate(totalViews: number, totalLikes: number, followers: number): number {
  if (followers === 0) return 0;
  const rate = ((totalLikes / Math.max(totalViews, 1)) * 100 + (totalLikes / followers) * 10) / 2;
  return Math.min(100, Math.round(rate * 100) / 100);
}

export function calculateEnergyCost(contentType: ContentType): number {
  const costs: Record<ContentType, number> = {
    video: 15,
    short: 8,
    music: 20,
    podcast: 12,
    livestream: 25,
    comedy: 10,
    fashion: 12,
    gaming: 18,
  };
  return costs[contentType] ?? 10;
}

export function calculateBusinessDailyRevenue(
  type: string,
  level: number,
  fameScore: number,
  followers: number
): number {
  const baseRates: Record<string, number> = {
    clothing_brand: 500,
    music_label: 800,
    restaurant: 400,
    tech_startup: 1200,
    fitness_brand: 600,
  };
  const base = baseRates[type] ?? 300;
  const levelMultiplier = 1 + (level - 1) * 0.25;
  const fameMultiplier = 1 + fameScore / 100;
  const followerMultiplier = 1 + Math.log10(Math.max(followers, 100)) / 10;
  return Math.round(base * levelMultiplier * fameMultiplier * followerMultiplier * 100) / 100;
}

/** Server-side preview metrics for studio UI — display only, not authoritative. */
export function computePreviewMetrics(creator: Creator, stats: CreatorStats) {
  return {
    quality: Math.min(100, Math.round((stats.creativity + stats.talent + stats.discipline) / 3)),
    viral: Math.min(100, Math.round((stats.charisma + stats.humor + creator.trend_score) / 3)),
    engagement: Math.min(100, Math.round((stats.authenticity + stats.charisma) / 2)),
  };
}
