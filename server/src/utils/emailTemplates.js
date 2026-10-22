export const generateEmailTemplate = (full_name, verificationCode) => {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; padding: 0 4px;">
        <h2 style="margin: 0 0 12px 0; color: #111827;">Verify your email</h2>
        <p style="margin: 0 0 10px 0;">Hi ${full_name || "there"},</p>
        <p style="margin: 0 0 12px 0;">Use the one-time code below to verify your account:</p>
        <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px;">
          <p style="font-size: 32px; font-weight: 800; letter-spacing: 5px; margin: 0; color: #2563eb;">${verificationCode}</p>
        </div>
        <p style="margin: 12px 0 10px 0;">This code expires in <strong>5 minutes</strong>. Please do not share this code with anyone.</p>
        <p style="margin: 16px 0 0 0; font-size: 12px; color: #6b7280;">If you did not request this, you can safely ignore this email.</p>
      </body>
    </html>
  `;
};

export const generateClaimStatusTemplate = (full_name, claimStatus) => {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; padding: 0 4px;">
        <h2 style="margin: 0 0 12px 0; color: #111827;">Claim Status Update</h2>
        <p style="margin: 0 0 10px 0;">Hi ${full_name || "there"},</p>
        <p style="margin: 0 0 12px 0;">We wanted to inform you that the status of your claim has been updated to:</p>
        <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px;">
          <p style="font-size: 24px; font-weight: 600; margin: 0; color: #2563eb;">${claimStatus}</p>
        </div>
        <p style="margin: 16px 0 0 0; font-size: 12px; color: #6b7280;">If you have any questions regarding your claim, please contact our support team.</p>
      </body>
    </html>
  `;
};
