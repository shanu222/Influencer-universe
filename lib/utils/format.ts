const GRADIENTS = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-indigo-500 to-purple-500",
  "from-yellow-500 to-orange-500",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-500",
  "from-cyan-500 to-blue-500",
  "from-primary to-accent",
  "from-emerald-500 to-teal-500",
];

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAvatarGradient(id: string): string {
  return GRADIENTS[hashString(id) % GRADIENTS.length];
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function formatTimeRemaining(endsAt: string): string {
  const end = new Date(endsAt);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return "Ended";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  return `${hours} hour${hours > 1 ? "s" : ""}`;
}

export function slugifyHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);
}

export function getCompetitionLabel(level: string): string {
  const map: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    very_high: "Very High",
  };
  return map[level] ?? level;
}

export function getRankChange(
  current: number,
  previous: number | null
): "up" | "down" | "same" {
  if (previous === null) return "same";
  if (current < previous) return "up";
  if (current > previous) return "down";
  return "same";
}

export function getThumbnailGradient(contentId: string, type: string): string {
  const typeGradients: Record<string, string[]> = {
    video: ["from-purple-500/40 to-pink-500/40", "from-blue-500/40 to-cyan-500/40"],
    music: ["from-cyan-500/40 via-blue-500/40 to-indigo-500/40"],
    short: ["from-orange-500/40 via-pink-500/40 to-purple-500/40"],
    gaming: ["from-emerald-500/40 via-green-500/40 to-teal-500/40"],
    livestream: ["from-red-500/40 to-orange-500/40"],
    podcast: ["from-amber-500/40 to-yellow-500/40"],
  };
  const options = typeGradients[type] ?? typeGradients.video;
  return options[hashString(contentId) % options.length];
}

export function getTrendGradient(category: string): string {
  const map: Record<string, string> = {
    dance: "from-orange-500/20 to-pink-500/20",
    gaming: "from-blue-500/20 to-cyan-500/20",
    fashion: "from-green-500/20 to-emerald-500/20",
    music: "from-pink-500/20 to-purple-500/20",
    tech: "from-purple-500/20 to-blue-500/20",
    food: "from-amber-500/20 to-orange-500/20",
    lifestyle: "from-cyan-500/20 to-teal-500/20",
    challenge: "from-red-500/20 to-orange-500/20",
  };
  return map[category] ?? "from-primary/20 to-accent/20";
}
