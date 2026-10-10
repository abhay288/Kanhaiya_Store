import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('GET /api/v1/health', () => {
  it('should return 200 OK with health status and timestamp', async () => {
    const res = await request(app).get('/api/v1/health');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('should return 404 for unknown endpoints with structured error', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');
    
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
