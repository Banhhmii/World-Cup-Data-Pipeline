const loggingMiddleware = (req, res, next) => {
  console.log(`Request received: ${req.method},  ${req.url}`);
  next();
};

module.exports = { loggingMiddleware };