/**
 * K6 Load Test - Staging Environment
 * 
 * Tests the application under various load conditions:
 * - Ramp up to 50 users (baseline)
 * - Scale to 200 users (normal traffic)
 * - Peak at 500 users (high traffic)
 * - Ramp down gracefully
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const invoiceCreationDuration = new Trend('invoice_creation_duration');

// Test configuration matching roadmap
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to baseline
    { duration: '5m', target: 200 },  // Scale to normal traffic
    { duration: '3m', target: 500 },  // Peak load
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.01'],    // Error rate must be below 1%
    errors: ['rate<0.05'],             // Custom error rate below 5%
  },
};

// Base URL from environment variable
const BASE_URL = __ENV.BASE_URL || 'https://staging.sierra-painting.com';

export default function () {
  // Test 1: Home page load
  let res = http.get(`${BASE_URL}/`);
  check(res, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loaded quickly': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Login flow (simulation)
  const loginStart = Date.now();
  res = http.get(`${BASE_URL}/login`);
  check(res, {
    'login page status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  loginDuration.add(Date.now() - loginStart);

  sleep(2);

  // Test 3: Dashboard load (authenticated simulation)
  res = http.get(`${BASE_URL}/dashboard`);
  check(res, {
    'dashboard accessible': (r) => r.status === 200 || r.status === 302,
  }) || errorRate.add(1);

  sleep(1);

  // Test 4: Invoices page
  const invoiceStart = Date.now();
  res = http.get(`${BASE_URL}/invoices`);
  check(res, {
    'invoices page loads': (r) => r.status === 200 || r.status === 302,
  }) || errorRate.add(1);
  invoiceCreationDuration.add(Date.now() - invoiceStart);

  sleep(3);
}

// Setup and teardown
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log('Stages: 50 → 200 → 500 → 0 users over 15 minutes');
}

export function teardown(data) {
  console.log('Load test completed');
}
