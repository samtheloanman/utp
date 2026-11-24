import { initBotId } from 'botid/client/core';

// Paths must match the routes that call guardRequest() (src/lib/edgeGuard.ts).
initBotId({
  protect: [
    { path: '/api/vote', method: 'POST' },
    { path: '/api/propose', method: 'POST' },
    { path: '/api/oauth/decision', method: 'POST' },
  ],
});
