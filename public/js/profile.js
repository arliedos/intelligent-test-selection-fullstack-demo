function currentProfileId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || 'demo-customer';
}

function showError(message) {
  const errorEl = document.getElementById('profile-error');
  errorEl.textContent = message;
  errorEl.hidden = false;
  document.getElementById('profile-confirmation').hidden = true;
}

function hideMessages() {
  document.getElementById('profile-error').hidden = true;
  document.getElementById('profile-confirmation').hidden = true;
}

async function loadProfile() {
  const id = currentProfileId();
  const { ok, status, body } = await fetchJson(`/api/profile?id=${encodeURIComponent(id)}`);
  if (ok && body) {
    document.getElementById('profile-name').value = body.name;
    document.getElementById('profile-email').value = body.email;
    return;
  }
  if (status === 404) {
    // Expected for a not-yet-created profile; leave the form blank so the
    // user can create one.
    return;
  }
  showError('Unable to load profile right now.');
}

async function handleSubmit(event) {
  event.preventDefault();
  hideMessages();

  const id = currentProfileId();
  const name = document.getElementById('profile-name').value;
  const email = document.getElementById('profile-email').value;

  const { ok, body } = await fetchJson(`/api/profile?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email }),
  });

  if (!ok || !body) {
    showError((body && body.error) || 'Unable to save profile.');
    return;
  }

  const confirmationEl = document.getElementById('profile-confirmation');
  confirmationEl.textContent = 'Profile saved.';
  confirmationEl.hidden = false;
}

document.getElementById('profile-form').addEventListener('submit', handleSubmit);
loadProfile();
