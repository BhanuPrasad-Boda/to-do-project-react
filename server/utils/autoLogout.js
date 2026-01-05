export function startAutoLogout(navigate) {
  const expiry = localStorage.getItem("tokenExpiry");
  if (!expiry) return;

  const remainingTime = expiry - Date.now();

  if (remainingTime <= 0) {
    logout(navigate);
    return;
  }

  setTimeout(() => {
    logout(navigate);
  }, remainingTime);
}

function logout(navigate) {
  localStorage.clear();
  alert("Session expired. Please login again.");
  navigate("/login");
}
