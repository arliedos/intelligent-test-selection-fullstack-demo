// In-memory profile store. Seeded with one deterministic demo profile.
// Tests that mutate state use their own unique id (via ?id=) so runs stay
// independent and parallel-safe without needing a shared reset endpoint.
const profiles = new Map([
  ['demo-customer', { id: 'demo-customer', name: 'Jordan Rivera', email: 'jordan.rivera@example.com' }],
]);

const DEFAULT_PROFILE_ID = 'demo-customer';

function getProfile(id) {
  return profiles.get(id);
}

function upsertProfile(id, { name, email }) {
  const profile = { id, name, email };
  profiles.set(id, profile);
  return profile;
}

module.exports = { getProfile, upsertProfile, DEFAULT_PROFILE_ID };
