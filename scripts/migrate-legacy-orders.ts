import { PrismaClient } from '@raaghas/database';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Legacy Order Migration...');

  const orders = await prisma.order.findMany();
  console.log(`Found ${orders.length} orders to migrate.`);

  for (const order of orders) {
    try {
      // 1. Map core status to Shopify financial/fulfillment statuses
      const financialStatus = ['CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'].includes(order.status)
        ? 'paid'
        : order.status === 'CANCELLED' || order.status === 'RETURNED'
        ? 'refunded'
        : 'pending';

      const fulfillmentStatus = order.status === 'DELIVERED'
        ? 'fulfilled'
        : order.status === 'SHIPPED'
        ? 'partially_fulfilled'
        : order.status === 'CANCELLED' || order.status === 'RETURNED' || order.status === 'RTO'
        ? 'restocked'
        : 'unfulfilled';

      // 2. Extract Shipping Address from JSON
      let shippingAddressData = null;
      if (order.shippingAddress && typeof order.shippingAddress === 'object') {
        const sa: any = order.shippingAddress;
        shippingAddressData = {
          name: order.customerName || sa.name || 'Unknown',
          street: sa.address || sa.street || '',
          address1: sa.address || sa.address1 || '',
          city: sa.city || '',
          province: sa.state || sa.province || '',
          zip: sa.pincode || sa.zip || '000000',
          country: sa.country || 'India',
          phone: order.customerPhone || sa.phone || null
        };
      }

      // 3. Prepare updates
      await prisma.$transaction(async (tx) => {
        // Update Order
        await tx.order.update({
          where: { id: order.id },
          data: {
            financialStatus,
            fulfillmentStatus,
            subtotal: order.totalAmount,
            total: order.totalAmount,
            currency: 'INR',
            source: 'web',
            riskLevel: 'normal',
            paidAt: financialStatus === 'paid' ? order.createdAt : null,
            fulfilledAt: fulfillmentStatus === 'fulfilled' ? order.updatedAt : null,
            cancelledAt: order.status === 'CANCELLED' ? order.updatedAt : null,
            paymentReference: order.paymentId || undefined,
          }
        });

        // Migrate Shipping Address
        if (shippingAddressData) {
          const existingShipping = await tx.orderShippingAddress.findUnique({ where: { orderId: order.id } });
          if (!existingShipping) {
            await tx.orderShippingAddress.create({
              data: {
                orderId: order.id,
                ...shippingAddressData
              }
            });
          }

          // Duplicate as billing address for legacy mapping
          const existingBilling = await tx.orderBillingAddress.findUnique({ where: { orderId: order.id } });
          if (!existingBilling) {
            await tx.orderBillingAddress.create({
              data: {
                orderId: order.id,
                ...shippingAddressData
              }
            });
          }
        }

        // Migrate Payment
        if (order.paymentId) {
          const existingPayment = await tx.orderPayment.findUnique({ where: { paymentId: order.paymentId } });
          if (!existingPayment) {
             await tx.orderPayment.create({
               data: {
                 orderId: order.id,
                 paymentId: order.paymentId,
                 gateway: order.paymentMethod,
                 amount: order.totalAmount,
                 status: financialStatus === 'paid' ? 'successful' : 'pending',
                 createdAt: order.createdAt
               }
             });
          }
        }
      });

      console.log(`Migrated order ${order.id}`);
    } catch (e) {
      console.error(`Failed to migrate order ${order.id}:`, e);
    }
  }

  console.log('Migration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
