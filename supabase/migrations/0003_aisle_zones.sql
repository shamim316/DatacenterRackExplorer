-- ============================================================
-- RackDoc v2.1 — Hot/cold aisle zones on floor plans
-- Zones are rectangles on the tile grid stored as JSON:
--   [{ "id": "…", "kind": "hot" | "cold", "x": 0, "y": 0, "w": 4, "h": 1 }]
-- Editing rights follow the existing floors RLS policies.
-- Run after 0002_floors.sql.
-- ============================================================

alter table public.floors
  add column zones jsonb not null default '[]'::jsonb;
