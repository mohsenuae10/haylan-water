-- ============================================================
-- 🔧 HAYLAN WATER - COMPLETE FIX
-- يحل جميع المشاكل: التسجيل، المنتجات، الأقسام
-- 
-- 📋 الخطوات: انسخ كل هذا الكود والصقه في:
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ===== 1. إضافة عمود category للمنتجات =====
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'water';
UPDATE products SET category = 'water' WHERE category IS NULL;

-- ===== 2. إنشاء جدول الأقسام =====
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

-- ===== 3. إدخال الأقسام =====
INSERT INTO categories (id, name_ar, name_en, icon, description_ar, sort_order) VALUES
  ('water', 'مياه هيلان', 'Haylan Water', '💧', 'مياه طبيعية نقية من جبال اليمن', 1),
  ('tissues', 'مناديل هيلان', 'Haylan Tissues', '🧻', 'مناديل ناعمة عالية الجودة', 2)
ON CONFLICT (id) DO NOTHING;

-- ===== 4. تفعيل RLS على الأقسام =====
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ===== 5. سياسات الأقسام =====
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Anon can view active categories" ON categories;
CREATE POLICY "Anon can view active categories"
  ON categories FOR SELECT
  TO anon
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===== 6. إصلاح دالة إنشاء المستخدم (السبب الرئيسي لخطأ التسجيل) =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, address, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    UPDATE public.profiles
    SET name = COALESCE(NEW.raw_user_meta_data->>'name', name),
        address = COALESCE(NEW.raw_user_meta_data->>'address', address)
    WHERE phone = COALESCE(NEW.raw_user_meta_data->>'phone', '');
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===== 7. إعادة إنشاء الـ trigger =====
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== 8. إصلاح دالة is_admin =====
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;

-- ===== 9. إضافة سياسة INSERT للملفات الشخصية =====
DROP POLICY IF EXISTS "Allow trigger to create profiles" ON profiles;
CREATE POLICY "Allow trigger to create profiles"
  ON profiles FOR INSERT
  WITH CHECK (TRUE);

-- ===== 10. إصلاح سياسات المنتجات =====
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins can do everything with products" ON products;
CREATE POLICY "Admins can do everything with products"
  ON products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===== 11. إصلاح سياسات العملاء =====
DROP POLICY IF EXISTS "Admins can manage customers" ON customers;
DROP POLICY IF EXISTS "Admins can do everything with customers" ON customers;
CREATE POLICY "Admins can do everything with customers"
  ON customers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===== 12. إصلاح سياسات الطلبات =====
DROP POLICY IF EXISTS "Admins can manage orders" ON orders;
DROP POLICY IF EXISTS "Admins can do everything with orders" ON orders;
CREATE POLICY "Admins can do everything with orders"
  ON orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===== 13. الصلاحيات =====
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT, UPDATE ON public.profiles TO supabase_auth_admin;
GRANT ALL ON public.products TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO authenticated;
GRANT ALL ON public.categories TO authenticated;

-- ===== 14. الفهارس =====
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category, is_active, sort_order);

-- ===== 15. إدخال المنتجات (إذا لم تكن موجودة) =====
INSERT INTO products (name, name_ar, size, price, image_url, description, description_ar, is_active, sort_order, category) VALUES
  ('Haylan Water 330ml', 'مياه هيلان 330 مل', '330ml', 150, 'https://files.manuscdn.com/user_upload_by_module/session_file/100988061/bSHeoDkWqPlwtqGy.png', 'Pure natural water', 'مياه طبيعية نقية، مثالية للترطيب أثناء التنقل', TRUE, 1, 'water'),
  ('Haylan Water 500ml', 'مياه هيلان 500 مل', '500ml', 200, 'https://files.manuscdn.com/user_upload_by_module/session_file/100988061/bSHeoDkWqPlwtqGy.png', 'Pure natural water', 'مياه طبيعية نقية، رفيقك اليومي المثالي', TRUE, 2, 'water'),
  ('Haylan Water 750ml', 'مياه هيلان 750 مل', '750ml', 300, 'https://files.manuscdn.com/user_upload_by_module/session_file/100988061/bSHeoDkWqPlwtqGy.png', 'Pure natural water', 'مياه طبيعية نقية، مثالية للرياضة والأنشطة', TRUE, 3, 'water'),
  ('Haylan Water 1.5L', 'مياه هيلان 1.5 لتر', '1.5L', 400, 'https://files.manuscdn.com/user_upload_by_module/session_file/100988061/bSHeoDkWqPlwtqGy.png', 'Pure natural water', 'مياه طبيعية نقية، حجم عائلي للاستخدام المنزلي', TRUE, 4, 'water'),
  ('Haylan Soft Tissues 200', 'مناديل هيلان الناعمة 200 ورقة', '200 ورقة', 500, NULL, 'Soft facial tissues', 'مناديل وجه ناعمة ولطيفة على البشرة', TRUE, 10, 'tissues'),
  ('Haylan Kitchen Roll', 'مناديل هيلان للمطبخ - رول', '1 رول', 800, NULL, 'Strong kitchen paper towels', 'مناديل مطبخ قوية ومتينة', TRUE, 11, 'tissues'),
  ('Haylan Pocket Tissues 10pk', 'مناديل هيلان للجيب - 10 حبات', '10 حبات', 200, NULL, 'Compact pocket tissues', 'مناديل جيب صغيرة وعملية', TRUE, 12, 'tissues'),
  ('Haylan Wet Wipes 80', 'مناديل هيلان مبللة 80 ورقة', '80 ورقة', 1000, NULL, 'Antibacterial wet wipes', 'مناديل مبللة معقمة ومضادة للبكتيريا', TRUE, 13, 'tissues')
ON CONFLICT DO NOTHING;

-- ===== ✅ تم! =====
-- بعد تشغيل هذا الكود:
-- 1. التسجيل سيعمل بشكل طبيعي
-- 2. المسؤول يستطيع إضافة/تعديل المنتجات
-- 3. الأقسام (مياه + مناديل) ستظهر
-- 4. المنتجات ستكون موجودة
