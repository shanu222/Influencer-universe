"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, Play, User, TrendingUp, BarChart3 } from "lucide-react";
import { motion } from "motion/react";

interface BottomNavProps {
  active: "home" | "feed" | "studio" | "trends" | "rankings" | "profile";
}

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { id: "home", icon: Home, label: "Home", path: "/home" },
    { id: "feed", icon: Play, label: "Feed", path: "/feed" },
    { id: "trends", icon: TrendingUp, label: "Trends", path: "/trends" },
    { id: "rankings", icon: BarChart3, label: "Rankings", path: "/rankings" },
    { id: "profile", icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-glass-bg backdrop-blur-2xl border-t border-glass-border">
      <div className="flex items-center justify-around px-4 py-2 safe-bottom">
        {navItems.map((item) => {
          const isActive = active === item.id || pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors group"
            >
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-primary/10 rounded-lg"
                  layoutId="activeTab"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <item.icon
                className={`size-6 relative z-10 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <span
                className={`text-xs relative z-10 transition-colors ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
