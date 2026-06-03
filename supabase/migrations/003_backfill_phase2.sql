-- Backfill Phase 2 data for creators created before migration 002

-- Ensure users have agencies
INSERT INTO agencies (owner_user_id, name, tagline)
SELECT u.id, COALESCE(u.username, 'Player') || ' Agency', 'Building the next generation of stars'
FROM users u
WHERE u.agency_id IS NULL
ON CONFLICT DO NOTHING;

UPDATE users u
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = u.id
  AND u.agency_id IS NULL;

-- Link creators to agencies
INSERT INTO agency_creators (agency_id, creator_id, is_primary, slot_order)
SELECT u.agency_id, c.id, true, 0
FROM creators c
JOIN users u ON u.id = c.user_id
WHERE u.agency_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM agency_creators ac WHERE ac.creator_id = c.id
  );

-- Set active creator for users missing one
UPDATE users u
SET active_creator_id = c.id
FROM creators c
WHERE c.user_id = u.id
  AND u.active_creator_id IS NULL
  AND c.id = (
    SELECT c2.id FROM creators c2
    WHERE c2.user_id = u.id
    ORDER BY c2.created_at ASC
    LIMIT 1
  );

-- Generate DNA for creators without it
INSERT INTO creator_dna (creator_id, traits, strengths, weaknesses, growth_modifiers, hidden_trait, is_partially_revealed)
SELECT
  c.id,
  jsonb_build_object(
    'ambitious', floor(random() * 40 + 30)::int,
    'charismatic', floor(random() * 40 + 30)::int,
    'innovative', floor(random() * 40 + 30)::int
  ),
  ARRAY(SELECT unnest(ARRAY['Viral Instinct','Brand Magnetism','Trend Surfer','Loyal Fanbase','Studio Grinder']) ORDER BY random() LIMIT 2),
  ARRAY(SELECT unnest(ARRAY['Scandal Prone','Burnout Risk','One-Hit Wonder','Niche Locked','Energy Drain']) ORDER BY random() LIMIT 1),
  jsonb_build_object(
    'followers', 0.95 + random() * 0.1,
    'revenue', 0.95 + random() * 0.1,
    'virality', 0.95 + random() * 0.1,
    'energy', 0.95 + random() * 0.1
  ),
  (ARRAY['The Visionary','The Rebel','The Entertainer','The Strategist','The Wildcard'])[floor(random() * 5 + 1)::int],
  false
FROM creators c
WHERE NOT EXISTS (SELECT 1 FROM creator_dna d WHERE d.creator_id = c.id);

-- Generate personality for creators without it
INSERT INTO creator_personality (creator_id, goals, memory, preferences, decision_style, risk_tolerance)
SELECT
  c.id,
  jsonb_build_array(
    jsonb_build_object('type', 'followers', 'target', 100000, 'progress', LEAST(c.followers, 100000), 'label', 'Reach 100K followers'),
    jsonb_build_object('type', 'influence', 'target', 50, 'progress', LEAST(c.influence, 50), 'label', 'Hit 50 influence')
  ),
  '[]'::jsonb,
  jsonb_build_object('content_style', c.niche, 'preferred_platform', 'short_form'),
  (ARRAY['aggressive','balanced','cautious'])[floor(random() * 3 + 1)::int],
  floor(random() * 60 + 20)::int
FROM creators c
WHERE NOT EXISTS (SELECT 1 FROM creator_personality p WHERE p.creator_id = c.id);

-- Initialize skill progress for existing creators
INSERT INTO creator_skills (creator_id, skill_id, level, xp_in_skill)
SELECT c.id, sd.id, 1, 0
FROM creators c
CROSS JOIN skill_definitions sd
WHERE NOT EXISTS (
  SELECT 1 FROM creator_skills cs
  WHERE cs.creator_id = c.id AND cs.skill_id = sd.id
);
