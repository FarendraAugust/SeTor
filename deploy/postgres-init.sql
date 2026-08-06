-- Dijalankan sekali saat volume postgres pertama kali dibuat.
-- Membuat database local per-worker; shared DB dibuat oleh POSTGRES_DB.
CREATE DATABASE setor_local OWNER setor;
