// @test-id T01
const { test, expect } = require('@playwright/test');
const { startServer } = require('../../server/index');

test.describe('T01 backend health smoke', () => {
  test('GET /api/health returns ok status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });

  test('server binds to the loopback address (127.0.0.1) by default, not the wildcard address', async () => {
    const savedHost = process.env.HOST;
    delete process.env.HOST;
    const server = startServer({ port: 0 });
    try {
      await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
      });
      expect(server.address().address).toBe('127.0.0.1');
    } finally {
      await new Promise((resolve) => server.close(resolve));
      if (savedHost === undefined) {
        delete process.env.HOST;
      } else {
        process.env.HOST = savedHost;
      }
    }
  });

  test('server honors an explicit HOST override', async () => {
    const server = startServer({ port: 0, host: '127.0.0.1' });
    try {
      await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
      });
      expect(server.address().address).toBe('127.0.0.1');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
