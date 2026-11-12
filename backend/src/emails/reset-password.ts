import transporter from './mail';

export const sendPasswordResetEmail = async (
  email: string,
  resetUrl: string,
) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your SyncSpace password",
    html: `
      <h2>Password Reset</h2>
      <p>We received a request to reset your SyncSpace password.</p>
      <p>
        <a href="${resetUrl}">Reset Password</a>
      </p>
      <p>This link expires in 15 minutes.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  });
};
