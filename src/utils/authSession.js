export function saveAuthSession(data = {}) {
  const { UserId, UserName, Email, Avatar, token } = data;
  if (UserId) {
    localStorage.setItem("user", JSON.stringify({ UserId, UserName, Email, Avatar }));
    localStorage.setItem("userid", UserId);
  }
  if (token) localStorage.setItem("token", token);
}
