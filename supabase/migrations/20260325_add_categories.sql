-- ============================================================
-- Migration: Add Categories Support
-- Converts Haylan from water-only to multi-product (water + tissues)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add category column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'water';

-- 2. Update all existing products as water
UPDATE products SET category = 'water' WHERE category IS NULL;

-- 3. Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(50) PRIMARY KEY,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  icon VARCHAR(10) NOT NULL,
  image_url TEXT,
  description_ar TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Insert categories
INSERT INTO categories (id, name_ar, name_en, icon, description_ar, sort_order) VALUES
  ('water', 'مياه هيلان', 'Haylan Water', '💧', 'مياه طبيعية نقية من جبال اليمن', 1),
  ('tissues', 'مناديل هيلان', 'Haylan Tissues', '🧻', 'مناديل ناعمة عالية الجودة', 2)
ON CONFLICT (id) DO NOTHING;

-- 5. Add index for fast category filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category, is_active, sort_order);

-- 6. Enable RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for categories (everyone can read)
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Anon can view active categories"
  ON categories FOR SELECT
  TO anon
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (public.is_admin());

-- 8. Seed tissue products
INSERT INTO products (name, name_ar, size, price, image_url, description, description_ar, is_active, sort_order, category) VALUES
  ('Haylan Soft Tissues 200', 'مناديل هيلان الناعمة 200 ورقة', '200 ورقة', 500, NULL, 'Soft facial tissues, gentle on skin', 'مناديل وجه ناعمة ولطيفة على البشرة', TRUE, 10, 'tissues'),
  ('Haylan Kitchen Roll', 'مناديل هيلان للمطبخ - رول', '1 رول', 800, NULL, 'Strong kitchen paper towels', 'مناديل مطبخ قوية ومتينة', TRUE, 11, 'tissues'),
  ('Haylan Pocket Tissues 10pk', 'مناديل هيلان للجيب - 10 حبات', '10 حبات', 200, NULL, 'Compact pocket tissues', 'مناديل جيب صغيرة وعملية', TRUE, 12, 'tissues'),
  ('Haylan Wet Wipes 80', 'مناديل هيلان مبللة 80 ورقة', '80 ورقة', 1000, NULL, 'Antibacterial wet wipes', 'مناديل مبللة معقمة ومضادة للبكتيريا', TRUE, 13, 'tissues')
ON CONFLICT DO NOTHING;
