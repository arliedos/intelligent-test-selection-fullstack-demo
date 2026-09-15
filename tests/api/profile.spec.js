// @test-id T10
const { test, expect } = require('@playwright/test');

test.describe('T10 profile frontend/API (API half)', () => {
  test('GET /api/profile returns the seeded demo profile by default', async ({ request }) => {
    const response = await request.get('/api/profile');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      id: 'demo-customer',
      name: 'Jordan Rivera',
      email: 'jordan.rivera@example.com',
    });
  });

  test('GET /api/profile?id=unknown-id returns 404', async ({ request }) => {
    const response = await request.get('/api/profile?id=profile-that-does-not-exist');
    expect(response.status()).toBe(404);
  });

  test('PUT /api/profile?id=<unique> creates/updates a profile independent of other tests', async ({ request }) => {
    const id = 'profile-test-api-update-001';
    const putResponse = await request.put(`/api/profile?id=${id}`, {
      data: { name: 'Alex Chen', email: 'alex.chen@example.com' },
    });
    expect(putResponse.status()).toBe(200);
    const putBody = await putResponse.json();
    expect(putBody).toEqual({ id, name: 'Alex Chen', email: 'alex.chen@example.com' });

    const getResponse = await request.get(`/api/profile?id=${id}`);
    const getBody = await getResponse.json();
    expect(getBody).toEqual(putBody);
  });

  test('PUT /api/profile rejects an invalid email with 400', async ({ request }) => {
    const id = 'profile-test-api-invalid-email';
    const response = await request.put(`/api/profile?id=${id}`, {
      data: { name: 'Sam Lee', email: 'not-an-email' },
    });
    expect(response.status()).toBe(400);
  });

  test('PUT /api/profile rejects an empty name with 400', async ({ request }) => {
    const id = 'profile-test-api-empty-name';
    const response = await request.put(`/api/profile?id=${id}`, {
      data: { name: '', email: 'valid@example.com' },
    });
    expect(response.status()).toBe(400);
  });
});
