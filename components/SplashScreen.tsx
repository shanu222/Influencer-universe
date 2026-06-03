"use client";

import { motion } from "motion/react";
import { Sparkles, Globe, Instagram, Music, Video, TrendingUp } from "lucide-react";

export default function SplashScreen() {
  return (
    <div className="size-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0a0a12] via-[#1a0a2e] to-[#0a0a12]">
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-20 left-20 size-64 bg-primary/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-20 size-96 bg-accent/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 1, ease: "easeOut" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
            <div className="relative">
              <Globe className="size-24 text-primary" strokeWidth={1.5} />
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="size-8 text-gold" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div className="flex flex-col items-center gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Influencer Universe
          </h1>
          <motion.p className="text-xl text-muted-foreground italic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }}>
            Build Legends. Create Fame. Rule The Internet.
          </motion.p>
        </motion.div>

        <motion.div className="flex gap-2 mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1 }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="size-3 rounded-full bg-primary"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
