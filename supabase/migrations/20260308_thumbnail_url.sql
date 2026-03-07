-- Add thumbnail_url column to recipes table
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
