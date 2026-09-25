const BASE_URL = 'http://127.0.0.1:3001';

async function main() {
  const stamp = Date.now();
  const randDigits = Math.floor(10000000 + Math.random() * 90000000);
  const email = `e2e_user_${stamp}@shega.test`;
  const username = `e2e_user_${stamp}`;
  const businessName = `E2E Shega Retail ${stamp}`;
  const phone = `+2519${randDigits}`;
  const password = 'Password123!';

  console.log('--- STARTING END-TO-END VERIFICATION FLOW ---');

  // 1. Signup
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      username,
      password,
      password2: password,
      business_name: businessName,
      phone,
    }),
  });
  const regData = await regRes.json();
  if (!regRes.ok) throw new Error(`Signup failed: ${JSON.stringify(regData)}`);
  const userToken = regData.access;
  console.log('1. Signup successful: user_id =', regData.user.id);

  // 2. Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  console.log('2. Login successful: token acquired');

  // 3. Start 7-Day Trial on Mobile + Desktop Plan (Plan ID 3)
  const authHeaders = {
    Authorization: `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  };
  const trialRes = await fetch(`${BASE_URL}/api/subscription/trial`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ plan_id: 3 }),
  });
  const trialData = await trialRes.json();
  if (!trialRes.ok) throw new Error(`Trial failed: ${JSON.stringify(trialData)}`);
  console.log('3. Started 7-day trial: Plan =', trialData.plan_name, ', License =', trialData.license_key);

  // 4. Check Status
  const statusRes = await fetch(`${BASE_URL}/api/subscription/status`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const statusData = await statusRes.json();
  console.log('4. Subscription status retrieved: Status =', statusData.status, ', Days =', statusData.trial_days_remaining);

  // 5. Submit Payment with Transaction ID
  const txnId = `TXN-E2E-${stamp}`;
  const payRes = await fetch(`${BASE_URL}/api/payments/create`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ plan_id: 3, transaction_id: txnId, payment_type: 'subscription' }),
  });
  const payData = await payRes.json();
  if (!payRes.ok) throw new Error(`Payment failed: ${JSON.stringify(payData)}`);
  const paymentId = payData.id;
  console.log('5. Payment submitted: ID =', paymentId, ', Txn =', txnId, ', Status =', payData.status);

  // 6. Admin Approval
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'qa_tester_e2e', password: 'Password123!' }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.access;

  const appRes = await fetch(`${BASE_URL}/api/admin/payments/${paymentId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin_notes: 'Approved in E2E Verification' }),
  });
  const appData = await appRes.json();
  if (!appRes.ok) throw new Error(`Approve failed: ${JSON.stringify(appData)}`);
  console.log('6. Admin approved payment ID', paymentId, ': Status =', appData.status, ', Invoice =', appData.invoice?.invoice_number);

  // 7. Verify Active Subscription Status
  const finalRes = await fetch(`${BASE_URL}/api/subscription/status`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const finalData = await finalRes.json();
  console.log('7. Final Subscription Status: Status =', finalData.status, ', Access =', finalData.access, ', Expires =', finalData.expires_at);

  console.log('\n--- FULL E2E VERIFICATION COMPLETED SUCCESSFULLY ---');
  console.log(JSON.stringify(finalData, null, 2));
}

main().catch((err) => {
  console.error('E2E TEST FAILED:', err);
});
