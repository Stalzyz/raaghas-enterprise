#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — DATABASE CREDENTIAL VALIDATOR
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
TEST_PASS="Raaghas@Prod2024"

echo "🔍 Validating Database Credentials on VPS..."

ssh -o StrictHostKeyChecking=no root@$VPS_IP << REMOTE
  echo "--- Testing direct psql login ---"
  # Attempt to login using PGPASSWORD to avoid interactive prompt
  if PGPASSWORD='$TEST_PASS' psql -h 127.0.0.1 -U raaghas_user -d raaghas_db -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ SUCCESS: Credentials are valid at 127.0.0.1"
  else
    echo "❌ FAILED: Credentials rejected at 127.0.0.1"
  fi

  if PGPASSWORD='$TEST_PASS' psql -h localhost -U raaghas_user -d raaghas_db -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ SUCCESS: Credentials are valid at localhost"
  else
    echo "❌ FAILED: Credentials rejected at localhost"
  fi

  echo ""
  echo "--- Checking pg_hba.conf ---"
  grep -v "^#" /etc/postgresql/*/main/pg_hba.conf | grep -v "^$"
REMOTE
