import promClient from 'prom-client';

const register = new promClient.Registry();

// Default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const expenseSubmissionsTotal = new promClient.Counter({
  name: 'expense_submissions_total',
  help: 'Total number of expense submissions',
  labelNames: ['status']
});

const approvalActionsTotal = new promClient.Counter({
  name: 'approval_actions_total',
  help: 'Total number of approval actions',
  labelNames: ['action']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(expenseSubmissionsTotal);
register.registerMetric(approvalActionsTotal);

// Middleware to track metrics
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
    httpRequestTotal.labels(req.method, route, res.statusCode).inc();
  });

  next();
};

// Endpoint to expose metrics
export const metricsEndpoint = async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

// Helper functions to increment custom metrics
export const incrementExpenseSubmission = (status) => {
  expenseSubmissionsTotal.labels(status).inc();
};

export const incrementApprovalAction = (action) => {
  approvalActionsTotal.labels(action).inc();
};

export default {
  metricsMiddleware,
  metricsEndpoint,
  incrementExpenseSubmission,
  incrementApprovalAction
};
