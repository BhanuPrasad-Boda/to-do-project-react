import { canShowDevOtp, visibleDevCode } from "./canShowDevOtp";

test("shows a development OTP only on localhost", () => {
  expect(canShowDevOtp("localhost")).toBe(true);
  expect(canShowDevOtp("127.0.0.1")).toBe(true);
  expect(canShowDevOtp("to-do-project-react-one.vercel.app")).toBe(false);
  expect(visibleDevCode("847291", "localhost")).toBe("847291");
  expect(visibleDevCode("847291", "app.example.com")).toBe("");
});
