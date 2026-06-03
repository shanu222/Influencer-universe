import OpenAI from "openai";
import type { ContentType, Creator, CreatorStats } from "@/lib/types/database";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

export interface GeneratedContent {
  title: string;
  description: string;
  category: string;
  thumbnailPrompt: string;
}

export interface GeneratedSong {
  songName: string;
  albumName: string;
  lyricsConcept: string;
}

export interface GeneratedTrend {
  title: string;
  description: string;
  category: string;
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

export async function generateContentMetadata(input: {
  creator: Creator;
  stats: CreatorStats;
  contentType: ContentType;
  activeTrends?: string[];
}): Promise<GeneratedContent> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.8,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate viral social media content metadata for an influencer simulation game. Return JSON only with keys: title, description, category, thumbnailPrompt. Keep titles catchy and under 80 chars. Descriptions under 200 chars with hashtags.",
      },
      {
        role: "user",
        content: JSON.stringify({
          creatorName: input.creator.name,
          niche: input.creator.niche,
          personality: input.creator.personality,
          mood: input.creator.mood,
          contentType: input.contentType,
          stats: {
            creativity: input.stats.creativity,
            humor: input.stats.humor,
            charisma: input.stats.charisma,
          },
          activeTrends: input.activeTrends ?? [],
        }),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI content generation failed");
  return parseJson<GeneratedContent>(content);
}

export async function generateContentSuggestions(input: {
  creator: Creator;
  stats: CreatorStats;
  contentType: ContentType;
  count?: number;
}): Promise<(GeneratedContent & { viralChance: number; audienceMatch: number })[]> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.9,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Generate ${input.count ?? 3} content suggestions. Return JSON: { "suggestions": [{ "title", "description", "category", "thumbnailPrompt", "viralChance" (1-100), "audienceMatch" (1-100) }] }`,
      },
      {
        role: "user",
        content: JSON.stringify({
          creatorName: input.creator.name,
          niche: input.creator.niche,
          contentType: input.contentType,
          fameScore: input.creator.fame_score,
        }),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI suggestions generation failed");
  const parsed = parseJson<{ suggestions: (GeneratedContent & { viralChance: number; audienceMatch: number })[] }>(content);
  return parsed.suggestions;
}

export async function generateSongMetadata(input: {
  creator: Creator;
  stats: CreatorStats;
  genre: string;
}): Promise<GeneratedSong> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.85,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Generate song metadata for an influencer music release. Return JSON: { songName, albumName, lyricsConcept }. lyricsConcept is a 2-sentence theme description, NOT full lyrics.",
      },
      {
        role: "user",
        content: JSON.stringify({
          creatorName: input.creator.name,
          niche: input.creator.niche,
          genre: input.genre,
          personality: input.creator.personality,
        }),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI song generation failed");
  return parseJson<GeneratedSong>(content);
}

export async function generateTrend(input?: { category?: string }): Promise<GeneratedTrend> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.9,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Generate a viral social media trend. Return JSON: { title, description, category } where category is one of: dance, gaming, fashion, music, tech, food, lifestyle, challenge.',
      },
      {
        role: "user",
        content: input?.category
          ? `Generate a ${input.category} trend for creators to join.`
          : "Generate a trending challenge for content creators.",
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI trend generation failed");
  return parseJson<GeneratedTrend>(content);
}

export async function generateCreatorDecision(input: {
  creator: Creator;
  situation: string;
  options: string[];
}): Promise<{ choice: string; reasoning: string }> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an AI creator making decisions based on their personality. Return JSON: { choice (one of the provided options), reasoning (1 sentence) }.",
      },
      {
        role: "user",
        content: JSON.stringify({
          name: input.creator.name,
          personality: input.creator.personality,
          niche: input.creator.niche,
          mood: input.creator.mood,
          situation: input.situation,
          options: input.options,
        }),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI decision generation failed");
  return parseJson<{ choice: string; reasoning: string }>(content);
}

export async function generateNewsHeadline(input: {
  topCreators: { name: string; niche: string; followers: number; fame_score: number }[];
  context?: string;
}): Promise<{ headline: string; summary: string; category: string; controversyScore: number }> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.85,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Generate breaking news for an influencer simulation game. Return JSON: { headline, summary, category (viral|scandal|award|battle|house_war|trend|agency|general), controversyScore (0-100) }',
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("News generation failed");
  return parseJson(content);
}
