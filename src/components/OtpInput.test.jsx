import { render, fireEvent } from '@testing-library/react';
import { OtpInput } from './OtpInput';
import { useState } from 'react';

function Harness() {
  const [value, setValue] = useState('');
  return (
    <div>
      <OtpInput value={value} onChange={setValue} />
      <div data-testid="otp-value">{value}</div>
    </div>
  );
}

test('otp input accepts a pasted 6-digit code', () => {
  const { container, getByTestId } = render(<Harness />);
  const first = container.querySelector('input');
  fireEvent.change(first, { target: { value: '847291' } });
  expect(getByTestId('otp-value').textContent).toBe('847291');
});
