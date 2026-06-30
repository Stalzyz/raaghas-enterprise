const { PrismaClient } = require('../apps/api/generated-client');
const prisma = new PrismaClient();

async function runHealthAudit() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  RAAGHAS COMMERCE STATE AUDIT                               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Time: ${new Date().toISOString()}\n`);

  const results = {
    critical: [],
    warnings: [],
    stats: {}
  };

  try {
    // 1. STUCK ORDERS: PAYMENT_PENDING > 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    // Note: If this fails with PrismaClientValidationError, run 'npx prisma generate'
    const stuckOrders = await prisma.order.findMany({
      where: {
        status: 'PAYMENT_PENDING',
        createdAt: { lt: oneHourAgo }
      }
    });
    if (stuckOrders.length > 0) {
      results.warnings.push(`${stuckOrders.length} orders stuck in PAYMENT_PENDING for >1 hour.`);
    }
    results.stats.pendingOrders = stuckOrders.length;

    // 2. ORPHANED RESERVATIONS: Reservation exists but intent/order doesn't
    // (Checked against expired date)
    const expiredReservations = await prisma.stockReservation.findMany({
      where: { expiresAt: { lt: new Date() } }
    });
    if (expiredReservations.length > 0) {
      results.warnings.push(`${expiredReservations.length} expired reservations found in DB (Cron may be lagging).`);
    }
    results.stats.expiredReservations = expiredReservations.length;

    // 3. DLQ DEPTH: Webhook events in DEAD state
    const deadEvents = await prisma.webhookEvent.findMany({
      where: { status: 'DEAD' }
    });
    if (deadEvents.length > 0) {
      results.critical.push(`CRITICAL: ${deadEvents.length} events in DEAD LETTER QUEUE (Requires manual replay).`);
    }
    results.stats.deadEvents = deadEvents.length;

    // 4. NEGATIVE INVENTORY: This should be impossible
    const negativeInventory = await prisma.variant.findMany({
      where: { inventory: { lt: 0 } }
    });
    if (negativeInventory.length > 0) {
      results.critical.push(`CRITICAL: ${negativeInventory.length} variants found with negative inventory balance!`);
    }
    results.stats.negativeVariants = negativeInventory.length;

    // 5. WALLET DRIFT: Sum of transactions vs Wallet balance
    // (Sample check for top 10 wallets)
    const topWallets = await prisma.wallet.findMany({ take: 10 });
    for (const wallet of topWallets) {
      const txSum = await prisma.walletTransaction.aggregate({
        where: { walletId: wallet.id },
        _sum: { amount: true }
      });
      const balance = Number(wallet.balance);
      const calculated = Number(txSum._sum.amount || 0);
      if (Math.abs(balance - calculated) > 0.01) {
        results.warnings.push(`Wallet Drift: User ${wallet.userId} balance=${balance} vs Sum=${calculated}`);
      }
    }

    // PRINT REPORT
    console.log('--- STATS ---');
    console.table(results.stats);

    if (results.critical.length > 0) {
      console.log('\n--- 🔴 CRITICAL FAILURES ---');
      results.critical.forEach(err => console.log(`  - ${err}`));
    }

    if (results.warnings.length > 0) {
      console.log('\n--- 🟡 WARNINGS ---');
      results.warnings.forEach(warn => console.log(`  - ${warn}`));
    }

    if (results.critical.length === 0 && results.warnings.length === 0) {
      console.log('\n✅ System state is perfectly consistent.');
    }

    console.log('\n' + '═'.repeat(60));

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runHealthAudit();
