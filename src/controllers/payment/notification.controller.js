//file controllers/payment/notification.controller.js


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { core } = require('../../config/midtrans');

exports.handleNotification = async (req, res) => {
    try {
      console.log('Raw notification body:', req.body); // Debugging
      
      // Pastikan body tidak kosong
      if (!req.body || Object.keys(req.body).length === 0) {
        console.error('Empty notification body');
        return res.status(400).send('Bad Request');
      }
  
      // Verifikasi notifikasi
      let statusResponse;
      try {
        statusResponse = await core.transaction.notification(req.body);
        console.log('Verified notification:', statusResponse);
      } catch (verifyError) {
        console.error('Verification failed:', verifyError);
        return res.status(400).send('Invalid notification');
      }
  
      const { 
        order_id, 
        transaction_status, 
        fraud_status,
        gross_amount,
        payment_type,
        settlement_time
      } = statusResponse;
  
      // Debug log
      console.log(`Processing payment ${order_id}, status: ${transaction_status}`);
  
      // Cari payment di database
      const payment = await prisma.payment.findUnique({
        where: { midtransOrderId: order_id }
      });
  
      if (!payment) {
        console.error(`Payment not found: ${order_id}`);
        return res.status(404).send('Payment not found');
      }
  
      // Update status pembayaran
      let paymentStatus = payment.paymentStatus;
      let shouldCreateOrder = false;
  
      if (transaction_status === 'capture') {
        paymentStatus = fraud_status === 'challenge' ? 'CHALLENGE' : 'SUCCESS';
        if (paymentStatus === 'SUCCESS') shouldCreateOrder = true;
      } 
      else if (transaction_status === 'settlement') {
        paymentStatus = 'SUCCESS';
        shouldCreateOrder = true;
      }
      else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
        paymentStatus = 'FAILED';
      }
  
      // Update payment
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus,
          paymentMethod: payment_type,
          settlementTime: settlement_time ? new Date(settlement_time) : null,
          updatedAt: new Date()
        }
      });
  
      // Buat order jika sukses
      if (shouldCreateOrder && !payment.orderId) {
        try {
          await prisma.$transaction(async (tx) => {
            // Buat order
            const order = await tx.order.create({
              data: {
                orderCode: `ORD-${Date.now()}`,
                visitorName: payment.visitorName || 'Customer',
                visitDate: payment.visitDate || new Date(),
                userId: payment.userId,
                payment: { connect: { id: payment.id } }
              }
            });
  
            // Buat tiket
            await tx.ticket.create({
              data: {
                code: `TICKET-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                type: 'REGULAR',
                price: parseInt(gross_amount),
                orderId: order.id
              }
            });
  
            console.log(`Created order ${order.id} with ticket`);
          });
        } catch (orderError) {
          console.error('Order creation failed:', orderError);
          // Tidak perlu return error, karena payment sudah diupdate
        }
      }
  
      // Response ke Midtrans HARUS string 'OK'
      res.status(200).send('OK');
      
    } catch (error) {
      console.error('Notification processing error:', error);
      res.status(500).send('Internal Server Error');
    }
  };