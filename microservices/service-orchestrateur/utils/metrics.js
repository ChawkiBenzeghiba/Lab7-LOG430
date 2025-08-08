const client = require('prom-client');

// Use the default global registry
client.collectDefaultMetrics();

// Histogram for overall saga duration (in seconds)
const sagaDuration = new client.Histogram({
  name: 'saga_duration_seconds',
  help: 'Durée des sagas en secondes',
  labelNames: ['etat_final'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30]
});

// Counter for total sagas completed, labeled by final state
const sagaTotal = new client.Counter({
  name: 'saga_total',
  help: 'Nombre total de sagas terminées',
  labelNames: ['etat_final']
});

// Histogram for per-step durations (optional)
const sagaStepDuration = new client.Histogram({
  name: 'saga_step_duration_seconds',
  help: 'Durée des étapes de saga en secondes',
  labelNames: ['etape']
});

// Counter for compensations executed
const compensationTotal = new client.Counter({
  name: 'compensation_total',
  help: 'Nombre total de compensations exécutées',
  labelNames: ['type']
});

module.exports = {
  register: client.register,
  sagaDuration,
  sagaTotal,
  sagaStepDuration,
  compensationTotal
};
