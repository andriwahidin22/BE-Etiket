const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { core } = require('../../config/midtrans');

exports.handlePaymentNotification = async (req, res) => {
  try {
    // 1. Terima dan validasi notifikasi
    const notification = req.body;
    console.log('Received Midtrans Notification:', notification);

    if (!notification.order_id || !notification.transaction_status) {
      return res.status(400).json({ error: 'Invalid notification format' });
    }

    // 2. Verifikasi notifikasi dengan Midtrans API
    const verifiedNotif = await core.transaction.notification(notification);
    const { 
      order_id, 
      transaction_status, 
      fraud_status,
      gross_amount 
    } = verifiedNotif;

    // 3. Cari payment terkait
    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: order_id },
      include: { order: true }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // 4. Tentukan status pembayaran
    let newPaymentStatus = payment.paymentStatus;
    let shouldCreateOrder = false;

    if (transaction_status === 'capture') {
      if (fraud_status === 'challenge') {
        newPaymentStatus = 'CHALLENGE';
      } else if (fraud_status === 'accept') {
        newPaymentStatus = 'SUCCESS';
        shouldCreateOrder = true;
      }
    } 
    else if (transaction_status === 'settlement') {
      newPaymentStatus = 'SUCCESS';
      shouldCreateOrder = true;
    }
    else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      newPaymentStatus = 'FAILED';
    }

    // 5. Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: newPaymentStatus,
        settlementTime: transaction_status === 'settlement' ? new Date() : null
      }
    });

    // 6. Jika pembayaran sukses dan belum ada order, buat order
    if (shouldCreateOrder && !payment.order) {
      await prisma.$transaction(async (tx) => {
        // Buat order
        const order = await tx.order.create({
          data: {
            orderCode: `ORD-${Date.now()}`,
            visitorName: 'Customer Name', // Ambil dari payment data
            visitDate: new Date(),         // Sesuaikan
            userId: payment.userId,
            payment: { connect: { id: payment.id } }
          }
        });

        // Buat tiket
        await tx.ticket.create({
          data: {
            code: `TICKET-${Math.random().toString(36).substring(2, 10)}`,
            type: 'REGULAR',
            price: parseInt(gross_amount),
            orderId: order.id
          }
        });

        console.log(`Order ${order.id} dan tiket berhasil dibuat`);
      });
    }

    // 7. Beri response ke Midtrans
    res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Error processing notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};