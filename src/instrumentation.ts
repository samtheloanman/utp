import { registerOTel, OTLPHttpJsonTraceExporter } from '@vercel/otel';

/**
 * Traces go to Vercel's tracing on deploys. Set OTEL_EXPORTER_OTLP_ENDPOINT
 * (e.g. the local collector, http://<host>:4318) to also ship them to our stack.
 */
export function register() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  registerOTel({
    serviceName: 'utp',
    ...(endpoint ? { traceExporter: new OTLPHttpJsonTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces` }) } : {}),
  });
}
