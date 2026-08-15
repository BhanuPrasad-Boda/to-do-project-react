const { resolveOnboarding } = require("./onboarding");

function publicUser(user) {
  if (!user) return null;
  const onboarding = resolveOnboarding(user);
  return {
    UserId: user.UserId,
    UserName: user.UserName,
    Email: user.Email,
    Mobile: user.Mobile,
    Avatar: user.Avatar,
    emailVerified: user.emailVerified !== false,
    notificationPreferences: user.notificationPreferences || {},
    onboardingStatus: onboarding.onboardingStatus,
    currentTourStep: onboarding.currentTourStep,
    onboardingCompleted: onboarding.onboardingCompleted,
    onboardingSkipped: onboarding.onboardingSkipped,
  };
}

function validatePassword(password) {
  const value = String(password || "");
  const hasLetter = /[A-Za-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasLength = value.length >= 6;
  return hasLetter && hasNumber && hasLength;
}

function signToken(jwt, user) {
  return jwt.sign(
    {
      id: user._id,
      UserId: user.UserId,
      UserName: user.UserName,
      Email: user.Email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

module.exports = { publicUser, validatePassword, signToken };
