-- ============================================================
-- Haylan Water - Supabase Schema (PostgreSQL)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============ Profiles (linked to auth.users) ============
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  address TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ Products ============
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  size VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  description TEXT,
  description_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ Customers ============
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ Orders ============
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  customer_id INT NOT NULL REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_address TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processing', 'delivering', 'delivered')),
  total_amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  is_guest BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ Order Items ============
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  product_size VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ Notifications ============
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id),
  customer_phone VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ Auto-update updated_at ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============ Auto-create profile on signup ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, phone, address, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ Admin check function (SECURITY DEFINER to bypass RLS) ============
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;

-- ============ RLS Policies ============

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read own profile, admins can read all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

-- Products: everyone can read active products
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (public.is_admin());

-- Allow anonymous access to products (for guest users)
CREATE POLICY "Anon can view active products"
  ON products FOR SELECT
  TO anon
  USING (is_active = TRUE);

-- Customers: linked to orders
CREATE POLICY "Anyone can create customers"
  ON customers FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users can view own customer record"
  ON customers FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can manage customers"
  ON customers FOR ALL
  USING (public.is_admin());

-- Allow anonymous customer creation
CREATE POLICY "Anon can create customers"
  ON customers FOR INSERT
  TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Anon can view customers"
  ON customers FOR SELECT
  TO anon
  USING (TRUE);

-- Orders: users can view own orders, admins can manage all
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users can view own orders by phone"
  ON orders FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can manage orders"
  ON orders FOR ALL
  USING (public.is_admin());

-- Allow anonymous order creation and viewing
CREATE POLICY "Anon can create orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Anon can view orders"
  ON orders FOR SELECT
  TO anon
  USING (TRUE);

-- Order Items
CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Anyone can view order items"
  ON order_items FOR SELECT
  USING (TRUE);

CREATE POLICY "Anon can create order items"
  ON order_items FOR INSERT
  TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Anon can view order items"
  ON order_items FOR SELECT
  TO anon
  USING (TRUE);

-- Notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (TRUE);

CREATE POLICY "Anyone can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Anon can view notifications"
  ON notifications FOR SELECT
  TO anon
  USING (TRUE);

-- ============ Seed Products ============
INSERT INTO products (name, name_ar, size, price, image_url, description, description_ar, is_active, sort_order) VALUES
  ('Haylan Water 330ml', 'مياه هيلان 330 مل', '330ml', 150, 'https://files.manuscdn.com/user_upload_by_module/session_file/100988061/bSHeoDkWqPlwtqGy.png', 'Pure natural water, perfect for on-the-go hydration', 'مياه طبيعية نقية، مثالية للترطيب أثناء التنقل', TRUE, 1),
  ('Haylan Water 500ml', 'مياه هيلان 500 مل', '500ml', 200, 'https://files.manuscdn.com/user_upload_by_module/session_file/100988061/bSHeoDkWqPlwtqGy.png', 'Pure natural water, ideal daily companion', 'مياه طبيعية نقية، رفيقك اليومي المثالي', TRUE, 2),
  ('Haylan Water 750ml', 'مياه هيلان 750 مل', '750ml', 300, 'https://files.manuscdn.com/user_upload_by_module/session_file/100988061/bSHeoDkWqPlwtqGy.png', 'Pure natural water, great for sports and activities', 'مياه طبيعية نقية، مثالية للرياضة والأنشطة', TRUE, 3),
  ('Haylan Water 1.5L', 'مياه هيلان 1.5 لتر', '1.5L', 400, 'https://files.manuscdn.com/user_upload_by_module/session_file/100988061/bSHeoDkWqPlwtqGy.png', 'Pure natural water, family size for home use', 'مياه طبيعية نقية، حجم عائلي للاستخدام المنزلي', TRUE, 4)
ON CONFLICT DO NOTHING;

-- ============ Seed Admin User ============
-- Note: Create admin user through Supabase Auth, then update role:
-- After creating user with phone 700000000, run:
-- UPDATE profiles SET role = 'admin' WHERE phone = '700000000';

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_phone ON notifications(customer_phone);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
