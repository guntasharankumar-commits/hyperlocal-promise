
-- Customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  persona TEXT NOT NULL DEFAULT 'new',
  historical_tes NUMERIC NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers are readable by everyone" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Customers are insertable by everyone" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers are updatable by everyone" ON public.customers FOR UPDATE USING (true);

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  hex_id INTEGER NOT NULL,
  persona TEXT NOT NULL DEFAULT 'new',
  promise_minutes NUMERIC,
  actual_minutes NUMERIC,
  tes_score NUMERIC,
  rider_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  delays JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders are readable by everyone" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Orders are insertable by everyone" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Orders are updatable by everyone" ON public.orders FOR UPDATE USING (true);

-- Store health table
CREATE TABLE public.store_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT NOT NULL DEFAULT 'Bengaluru Dark Store',
  picking_sla NUMERIC NOT NULL DEFAULT 3,
  packing_sla NUMERIC NOT NULL DEFAULT 2,
  picking_variance NUMERIC NOT NULL DEFAULT 1.0,
  packer_congestion NUMERIC NOT NULL DEFAULT 30,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store health is readable by everyone" ON public.store_health FOR SELECT USING (true);
CREATE POLICY "Store health is updatable by everyone" ON public.store_health FOR UPDATE USING (true);
CREATE POLICY "Store health is insertable by everyone" ON public.store_health FOR INSERT WITH CHECK (true);

-- Riders table
CREATE TABLE public.riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  archetype TEXT NOT NULL,
  rating NUMERIC NOT NULL DEFAULT 4.0,
  speed_factor NUMERIC NOT NULL DEFAULT 1.0,
  locality_awareness INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'idle',
  hex_position INTEGER NOT NULL DEFAULT 0,
  orders_per_hex JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders are readable by everyone" ON public.riders FOR SELECT USING (true);
CREATE POLICY "Riders are updatable by everyone" ON public.riders FOR UPDATE USING (true);
CREATE POLICY "Riders are insertable by everyone" ON public.riders FOR INSERT WITH CHECK (true);

-- Store locations table
CREATE TABLE public.store_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Bengaluru Dark Store',
  lat NUMERIC NOT NULL DEFAULT 12.9352,
  lng NUMERIC NOT NULL DEFAULT 77.6120,
  hex_id INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store locations are readable by everyone" ON public.store_locations FOR SELECT USING (true);
CREATE POLICY "Store locations are insertable by everyone" ON public.store_locations FOR INSERT WITH CHECK (true);

-- Seed store health
INSERT INTO public.store_health (store_name, picking_sla, packing_sla, picking_variance, packer_congestion)
VALUES ('Bengaluru Dark Store', 3, 2, 1.0, 30);

-- Seed store location
INSERT INTO public.store_locations (name, lat, lng, hex_id)
VALUES ('Bengaluru Dark Store', 12.9352, 77.6120, 0);

-- Seed riders
INSERT INTO public.riders (rider_id, name, archetype, rating, speed_factor, locality_awareness, status, hex_position, orders_per_hex) VALUES
('R1', 'Arjun', 'The Pro', 4.8, 1.0, 9, 'idle', 2, '{"H0":45,"H1":32,"H2":28,"H3":15,"H4":50,"H5":22,"H6":10}'),
('R2', 'Vikram', 'The Speedster', 3.6, 1.4, 6, 'idle', 5, '{"H0":12,"H1":8,"H2":55,"H3":3,"H4":20,"H5":60,"H6":18}'),
('R3', 'Priya', 'The Rookie', 3.2, 0.8, 3, 'idle', 8, '{"H0":2,"H1":1,"H2":3,"H3":0,"H4":5,"H5":2,"H6":8}'),
('R4', 'Rahul', 'The Veteran', 4.5, 0.95, 8, 'idle', 4, '{"H0":38,"H1":42,"H2":35,"H3":30,"H4":55,"H5":28,"H6":20}'),
('R5', 'Meera', 'The Navigator', 4.2, 1.1, 10, 'idle', 1, '{"H0":25,"H1":50,"H2":15,"H3":40,"H4":35,"H5":30,"H6":45}');

-- Seed customers
INSERT INTO public.customers (name, persona, historical_tes, order_count) VALUES
('Ravi Kumar', 'high_tes', 280, 45),
('Ananya Singh', 'med_tes', 150, 22),
('Karthik Reddy', 'low_tes', 50, 8),
('Sneha Patel', 'new', 0, 0);

-- Timestamp update trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_health_updated_at BEFORE UPDATE ON public.store_health FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON public.riders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
