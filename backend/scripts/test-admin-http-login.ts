async function main() {
  console.log('[Test] Attempting HTTP login with admin credentials...');
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'kuchbhi0804@gmail.com',
      password: '123456'
    })
  });

  const json = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Response Success:', json.success);
  if (json.success) {
    console.log('Logged in user:', {
      id: json.data?.user?.id,
      email: json.data?.user?.email,
      fullName: json.data?.user?.fullName,
      role: json.data?.user?.primaryRole
    });
    console.log('Access token received:', !!json.data?.accessToken);
  } else {
    console.error('Login failed:', json.error);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
