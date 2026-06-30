#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║  RAAGHAS PRODUCTION REAL-TIME LOG MONITOR                   ║
# ║  Watches PM2 logs for critical commerce pipeline failures   ║
# ╚══════════════════════════════════════════════════════════════╝

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ Error: pm2 is not installed or not in PATH.${NC}"
    echo "If you are on your local Mac, run: npm install -g pm2"
    exit 1
fi

echo -e "${CYAN}🚀 Starting Raaghas Pipeline Monitor...${NC}"
echo -e "${BLUE}Watching for: ${RED}CRITICAL${BLUE}, ${YELLOW}Oversell${BLUE}, ${PURPLE}Webhook-Failures${BLUE}, ${GREEN}Order-Placed${NC}"
echo "----------------------------------------------------------------"

# Patterns to watch for (Mac compatible: removed stdbuf)
pm2 logs raaghas-api --lines 50 | sed -l \
  -e "s/\(.*CRITICAL.*\)/${RED}\1${NC}/g" \
  -e "s/\(.*Oversell Prevented.*\)/${YELLOW}\1${NC}/g" \
  -e "s/\(.*DEAD LETTER QUEUE.*\)/${RED}\1${NC}/g" \
  -e "s/\(.*Webhook \[.*\] failed.*\)/${PURPLE}\1${NC}/g" \
  -e "s/\(.*✅ Webhook .* processed.*\)/${GREEN}\1${NC}/g" \
  -e "s/\(.*🎉 Order .* confirmed.*\)/${GREEN}\1${NC}/g" \
  -e "s/\(.*pg_advisory_xact_lock.*\)/${CYAN}\1${NC}/g" \
  -e "s/\(.*TimeoutError.*\)/${RED}\1${NC}/g" \
  -e "s/\(.*Insufficient wallet balance.*\)/${YELLOW}\1${NC}/g" \
  -e "s/\(.*Released .* reservation(s).*\)/${BLUE}\1${NC}/g"
