import { render, act } from "@testing-library/react";
import { AuthOtpPanel } from "./AuthOtpPanel";

jest.useFakeTimers();

test("auto-verifies after the sixth digit without a button click", () => {
  const onVerify = jest.fn();
  render(
    <AuthOtpPanel
      maskedEmail="a***@mail.com"
      otp="847291"
      onOtpChange={() => {}}
      onVerify={onVerify}
    />
  );

  expect(onVerify).not.toHaveBeenCalled();
  act(() => {
    jest.advanceTimersByTime(200);
  });
  expect(onVerify).toHaveBeenCalledTimes(1);
});

test("clears the OTP boxes after a wrong code", () => {
  const onOtpChange = jest.fn();
  const { rerender } = render(
    <AuthOtpPanel
      maskedEmail="a***@mail.com"
      otp="111111"
      onOtpChange={onOtpChange}
      onVerify={() => {}}
    />
  );

  rerender(
    <AuthOtpPanel
      maskedEmail="a***@mail.com"
      otp="111111"
      error="Invalid verification code. Please try again."
      onOtpChange={onOtpChange}
      onVerify={() => {}}
    />
  );

  expect(onOtpChange).toHaveBeenCalledWith("");
});
