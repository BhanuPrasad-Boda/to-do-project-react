import { saveAuthSession } from "./authSession";

test("stores the signed-in user and token after OTP verification", () => {
  localStorage.clear();
  saveAuthSession({
    UserId: "alex",
    UserName: "Alex",
    Email: "alex@example.com",
    Avatar: "pic",
    token: "jwt-token",
  });

  expect(localStorage.getItem("userid")).toBe("alex");
  expect(localStorage.getItem("token")).toBe("jwt-token");
  expect(JSON.parse(localStorage.getItem("user")).Email).toBe("alex@example.com");
  localStorage.clear();
});
