import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
});

export const sendPasswordResetEmail = async (toEmail, resetToken) => {
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to:      toEmail,
    subject: 'Reset Your Password — Grad-Ledger',
    html: `
      <p>A password reset was requested for your Grad-Ledger account.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request this, ignore this email.</p>
    `
  });
};

// ─── REGISTRATION RECEIVED (to Org Super Admin) ───────────────────────────────

export const sendRegistrationReceivedEmail = async (toEmail, orgName) => {
  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to:      toEmail,
    subject: 'Registration Received — Grad-Ledger',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a;">We've received your registration</h2>
          <p>Thank you for registering <strong>${orgName}</strong> on Grad-Ledger.</p>
          <p>Our team will review your submitted details and documents. You will receive an email once a decision has been made.</p>
          <p>This process typically takes 1–3 business days.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">
            If you did not submit this registration, please ignore this email.
          </p>
        </body>
      </html>
    `
  });
};

// ─── NEW REGISTRATION NOTIFICATION (to Super Admin) ──────────────────────────

export const sendNewRegistrationNotificationEmail = async () => {
  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to:      process.env.SUPER_ADMIN_EMAIL,
    subject: 'New Organisation Registration Pending — Grad-Ledger',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a;">New registration request</h2>
          <p>A new organisation has submitted a registration request on Grad-Ledger and is awaiting your review.</p>
          <div style="margin: 24px 0;">
            
              href="${process.env.CLIENT_URL}/super-admin/organisations/pending"
              style="
                background-color: #2563eb;
                color: #ffffff;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                display: inline-block;
              "
            >
              Review Pending Registrations
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">
            You are receiving this email because you are the Grad-Ledger platform administrator.
          </p>
        </body>
      </html>
    `
  });
};

// ─── ORGANISATION APPROVED (to Org Super Admin) ───────────────────────────────

export const sendOrgApprovedEmail = async (toEmail, orgName, loginEmail) => {
  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to:      toEmail,
    subject: 'Your Registration Has Been Approved — Grad-Ledger',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #16a34a;">Registration Approved ✓</h2>
          <p>Congratulations! <strong>${orgName}</strong> has been approved on Grad-Ledger.</p>
          <p>You can now log in and start issuing certificates using the credentials you set during registration.</p>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Login email:</strong> ${loginEmail}</p>
            <p style="margin: 0;"><strong>Password:</strong> The password you created during registration</p>
          </div>

          <div style="margin: 24px 0;">
            
              href="${process.env.CLIENT_URL}/org/login"
              style="
                background-color: #2563eb;
                color: #ffffff;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                display: inline-block;
              "
            >
              Log In to Grad-Ledger
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">
            If you have trouble logging in, use the "Forgot Password" link on the login page.
          </p>
        </body>
      </html>
    `
  });
};

// ─── ORGANISATION REJECTED (to Org Super Admin) ───────────────────────────────

export const sendOrgRejectedEmail = async (toEmail, orgName, reason) => {
  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to:      toEmail,
    subject: 'Your Registration Was Not Approved — Grad-Ledger',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #dc2626;">Registration Not Approved</h2>
          <p>Unfortunately, the registration request for <strong>${orgName}</strong> has not been approved at this time.</p>

          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-weight: bold;">Reason:</p>
            <p style="margin: 0;">${reason}</p>
          </div>

          <p>If you believe this decision was made in error or you would like to address the issues raised, please contact us at
            <a href="mailto:${process.env.SUPER_ADMIN_EMAIL}">${process.env.SUPER_ADMIN_EMAIL}</a>.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">
            This decision was made by the Grad-Ledger platform team.
          </p>
        </body>
      </html>
    `
  });
};

// ─── ORGANISATION DISABLED (to Org Super Admin) ───────────────────────────────

export const sendOrgDisabledEmail = async (toEmail, orgName) => {
  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to:      toEmail,
    subject: 'Your Organisation Has Been Suspended — Grad-Ledger',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #d97706;">Organisation Suspended</h2>
          <p><strong>${orgName}</strong> has been suspended on Grad-Ledger.</p>

          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0;">While suspended:</p>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
              <li>All admin accounts have been deactivated</li>
              <li>No new certificates can be issued</li>
              <li>All previously issued certificates remain valid and verifiable</li>
            </ul>
          </div>

          <p>
            To appeal this decision or request reactivation, please contact the Grad-Ledger team at
            <a href="mailto:${process.env.SUPER_ADMIN_EMAIL}">${process.env.SUPER_ADMIN_EMAIL}</a>.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">
            This action was taken by the Grad-Ledger platform team.
          </p>
        </body>
      </html>
    `
  });
};