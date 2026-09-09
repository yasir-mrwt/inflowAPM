SELECT 'CREATE DATABASE inflowapm_test'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'inflowapm_test'
)\gexec
