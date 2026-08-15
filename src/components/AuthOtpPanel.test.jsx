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
