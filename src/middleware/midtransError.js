module.exports = (err, req, res, next) => {
    if (err.message.includes('Midtrans')) {
      console.error('Midtrans Error:', err);
      return res.status(502).json({
        status: "error",
        message: "Payment gateway error",
        error: err.message
      });
    }
    next(err);
  };