const sendSuccess = (res, message, data = {}, meta = {}, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    meta
  });
};

const sendError = (res, message, status = 500, errors = []) => {
  const safeMessage = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : message;

  return res.status(status).json({
    success: false,
    message: safeMessage,
    errors
  });
};

module.exports = {
  sendSuccess,
  sendError
};
