#!/usr/bin/env node
/**
 * Production Smoke Test Suite for Kanhaiya General Store API
 *
 * Usage:
 *   node backend/scripts/smoke-test.mjs [BASE_URL]
 *
 * Example:
 *   node backend/scripts/smoke-test.mjs https://api.kanhaiyastore.com
 *   node backend/scripts/smoke-test.mjs http://localhost:5000
 */

const targetUrl = (process.argv[2] || process.env.API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

console.log(`\n======================================================`);
console.log(`🔍 Kanhaiya General Store — Production Smoke Tests`);
console.log(`🎯 Target API URL: ${targetUrl}`);
console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
console.log(`======================================================\n`);

let passedCount = 0;
let failedCount = 0;

async function runTest(name, fn) {
  process.stdout.write(`• Testing: ${name}... `);
  try {
    await fn();
    console.log(`✅ PASS`);
    passedCount++;
  } catch (err) {
    console.log(`❌ FAIL`);
    console.error(`  Error: ${err.message}`);
    failedCount++;
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  // Test 1: Health endpoint responds with 200 OK
  await runTest('Health Check (/api/v1/health)', async () => {
    const res = await fetchWithTimeout(`${targetUrl}/api/v1/health`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, received HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.success || data.data?.status !== 'ok') {
      throw new Error(`Invalid health response payload: ${JSON.stringify(data)}`);
    }
    // Verify no secret leak
    const payloadStr = JSON.stringify(data);
    if (payloadStr.includes('mongodb+srv') || payloadStr.includes('privateKey') || payloadStr.includes('password')) {
      throw new Error('CRITICAL: Health endpoint leaked credentials or connection string!');
    }
  });

  // Test 2: Root /health endpoint alias
  await runTest('Root Health Alias (/health)', async () => {
    const res = await fetchWithTimeout(`${targetUrl}/health`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, received HTTP ${res.status}`);
    }
  });

  // Test 3: Public Category Listing
  await runTest('Public Categories API (/api/v1/categories)', async () => {
    const res = await fetchWithTimeout(`${targetUrl}/api/v1/categories`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, received HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Categories response format invalid (expected { success: true, data: [...] })');
    }
  });

  // Test 4: Public Product Catalog Listing
  await runTest('Public Products API (/api/v1/products)', async () => {
    const res = await fetchWithTimeout(`${targetUrl}/api/v1/products`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, received HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Products response format invalid (expected { success: true, data: [...] })');
    }
  });

  // Test 5: Unauthorized Admin Endpoint Rejection
  await runTest('Admin Security Barrier (/api/v1/admin/analytics/overview)', async () => {
    const res = await fetchWithTimeout(`${targetUrl}/api/v1/admin/analytics/overview`);
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`Expected HTTP 401/403 for unauthorized admin call, received HTTP ${res.status}`);
    }
  });

  // Test 6: Invoice IDOR Protection
  await runTest('Invoice IDOR Security (/api/v1/orders/ORD-NONEXISTENT/invoice)', async () => {
    const res = await fetchWithTimeout(`${targetUrl}/api/v1/orders/ORD-NONEXISTENT/invoice`);
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`Expected HTTP 401/403 for anonymous invoice access, received HTTP ${res.status}`);
    }
  });

  // Test 7: Security Headers (Helmet, nosniff, correlation ID)
  await runTest('Security Headers & Correlation ID', async () => {
    const res = await fetchWithTimeout(`${targetUrl}/api/v1/health`);
    const nosniff = res.headers.get('x-content-type-options');
    const correlationId = res.headers.get('x-request-id');
    if (nosniff !== 'nosniff') {
      throw new Error(`Missing or invalid X-Content-Type-Options header: ${nosniff}`);
    }
    if (!correlationId) {
      throw new Error('Missing X-Request-Id correlation tracking header in response');
    }
  });

  // Summary
  console.log(`\n======================================================`);
  console.log(`🏁 Smoke Test Summary:`);
  console.log(`   Passed: ${passedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`   Total:  ${passedCount + failedCount}`);
  console.log(`======================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`\n💥 Fatal smoke test runner failure:`, err);
  process.exit(1);
});
