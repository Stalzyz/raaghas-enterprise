#!/bin/bash
VPS_IP="72.61.231.187"
echo "📡 Fetching Storefront logs from VPS..."
ssh -o StrictHostKeyChecking=no root@$VPS_IP "pm2 logs raaghas-storefront --lines 100 --nostream"
