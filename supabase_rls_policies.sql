-- =====================================================================
-- SUPABASE SECURITY AUDIT & RLS POLICIES (PintarYuk SIM Kelompok)
-- =====================================================================

-- 1. AKTIFKAN ROW LEVEL SECURITY (RLS) DI SEMUA TABEL
ALTER TABLE tpq_kelompok ENABLE ROW LEVEL SECURITY;
ALTER TABLE generus ENABLE ROW LEVEL SECURITY;
ALTER TABLE mubaligh_setempat ENABLE ROW LEVEL SECURITY;
ALTER TABLE mubaligh_tugasan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengurus_internal ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE raport ENABLE ROW LEVEL SECURITY;
ALTER TABLE sarpras ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. KEBIJAKAN AKSES UNTUK TABEL: tpq_kelompok
-- Super Admin & Admin Daerah memiliki akses penuh.
-- Admin Desa & Admin Kelompok hanya bisa melihat kelompok binaannya.
CREATE POLICY "tpq_kelompok_auth_policy" ON tpq_kelompok
FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
  OR id::text = auth.jwt() ->> 'tpq_id'
);

-- 3. KEBIJAKAN AKSES UNTUK TABEL: generus
-- Hanya dapat diakses oleh user terautentikasi sesuai penugasan kelompoknya atau admin daerah.
CREATE POLICY "generus_auth_policy" ON generus
FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
  OR tpq_id::text = auth.jwt() ->> 'tpq_id'
);

-- 4. KEBIJAKAN AKSES UNTUK TABEL: mubaligh_setempat
CREATE POLICY "mubaligh_setempat_auth_policy" ON mubaligh_setempat
FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
  OR tpq_id::text = auth.jwt() ->> 'tpq_id'
);

-- 5. KEBIJAKAN AKSES UNTUK TABEL: mubaligh_tugasan
CREATE POLICY "mubaligh_tugasan_auth_policy" ON mubaligh_tugasan
FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
  OR tpq_id::text = auth.jwt() ->> 'tpq_id'
);

-- 6. KEBIJAKAN AKSES UNTUK TABEL: pengurus_internal
CREATE POLICY "pengurus_internal_auth_policy" ON pengurus_internal
FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
  OR tpq_id::text = auth.jwt() ->> 'tpq_id'
);

-- 7. KEBIJAKAN AKSES UNTUK TABEL: presensi
CREATE POLICY "presensi_auth_policy" ON presensi
FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
  OR tpq_id::text = auth.jwt() ->> 'tpq_id'
);

-- 8. KEBIJAKAN AKSES UNTUK TABEL: raport
CREATE POLICY "raport_auth_policy" ON raport
FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
  OR (
    SELECT tpq_id FROM generus WHERE generus.id = raport.generus_id
  )::text = auth.jwt() ->> 'tpq_id'
);

-- 9. KEBIJAKAN AKSES UNTUK TABEL: sarpras
CREATE POLICY "sarpras_auth_policy" ON sarpras
FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
  OR tpq_id::text = auth.jwt() ->> 'tpq_id'
);

-- 10. KEBIJAKAN AKSES UNTUK TABEL: audit_logs
-- Setiap pengguna terautentikasi dapat mencatat aktivitas mereka sendiri.
-- Hanya Super Admin yang dapat meninjau semua berkas log audit.
CREATE POLICY "audit_logs_insert_policy" ON audit_logs
FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid());

CREATE POLICY "audit_logs_select_policy" ON audit_logs
FOR SELECT TO authenticated
USING (auth.jwt() ->> 'role' = 'Super Admin');
