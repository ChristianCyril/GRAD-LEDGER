import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (toEmail, resetToken) => {
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: toEmail,
    subject: 'Reset Your Password — Grad-Ledger',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">

          <h2 style="color: #2563eb;">Password Reset Request</h2>

          <p>Dear User,</p>

          <p>
            We received a request to reset the password for your
            <strong>Grad-Ledger</strong> account. Click the button below
            to choose a new password.
          </p>

          <div style="
            background-color: #eff6ff;
            border:           1px solid #bfdbfe;
            border-left:      4px solid #2563eb;
            border-radius:    8px;
            padding:          16px;
            margin:           24px 0;
          ">
            <p style="margin: 0; font-weight: bold; color: #2563eb;">
              🔒 This link expires in 1 hour
            </p>
            <p style="margin: 8px 0 0 0; font-size: 14px;">
              For your security, this password reset link can only be used once
              and will expire after 1 hour.
            </p>
          </div>

          <div style="margin: 24px 0;">
            
              href="${resetLink}"
              style="
                background-color: #2563eb;
                color:            #ffffff;
                padding:          12px 24px;
                text-decoration:  none;
                border-radius:    6px;
                font-weight:      bold;
                display:          inline-block;
              "
            >
              Reset My Password
            </a>
          </div>

          <p>
            If the button above does not work, copy and paste the link below
            into your browser:
          </p>
          <p style="
            word-break:       break-all;
            font-size:        13px;
            color:            #2563eb;
            background-color: #f8fafc;
            padding:          10px;
            border-radius:    6px;
          ">
            ${resetLink}
          </p>

          <p>
            If you did not request a password reset, you can safely ignore this
            email. Your password will remain unchanged.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

          <p style="font-size: 12px; color: #999;">
            This is an automated notification from Grad-Ledger. Please do not
            reply to this email directly. If you need help, contact us at
            <a href="mailto:${process.env.SUPER_ADMIN_EMAIL}">
              ${process.env.SUPER_ADMIN_EMAIL}
            </a>.
          </p>

        </body>
      </html>
    `,
  });
};

// ─── REGISTRATION RECEIVED (to Org Super Admin) ───────────────────────────────

export const sendRegistrationReceivedEmail = async (toEmail, orgName) => {
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: toEmail,
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
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: process.env.SUPER_ADMIN_EMAIL,
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
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: toEmail,
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
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: toEmail,
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
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: toEmail,
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

export const sendAdminCreatedEmail = async (toEmail, adminName, orgName, tempPassword) => {
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: toEmail,
    subject: `Your Admin Account — ${orgName} on Block-Ledger`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a;">Welcome to Block-Ledger, ${adminName}</h2>
          <p>An admin account has been created for you under <strong>${orgName}</strong> on Block-Ledger.</p>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Login email:</strong> ${toEmail}</p>
            <p style="margin: 0;"><strong>Temporary password:</strong> ${tempPassword}</p>
          </div>

          <p>For security, please change your password immediately after your first login.</p>

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
              Log In to Block-Ledger
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">
            If you were not expecting this email, please contact your organisation administrator immediately.
          </p>
        </body>
      </html>
    `
  });
};

export const sendCertificateIssuedEmail = async (
  toEmail, studentName, certId, cloudinaryUrl
) => {
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: toEmail,
    subject: 'Your Certificate is Ready Grad-Ledger',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #16a34a;">Your Certificate is Ready</h2>
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>Your certificate has been issued successfully.</p>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Verification Code:</strong></p>
            <p style="margin: 0; font-family: monospace; font-size: 14px; word-break: break-all;">${certId}</p>
          </div>

          <p>Use this code to verify your certificate at any time:</p>
          <div style="margin: 16px 0;">
            <a
              href="${process.env.CLIENT_URL}/verify/${certId}"
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
              Verify Certificate
            </a>
          </div>

          <p style="margin-top: 24px;">
            <a href="${cloudinaryUrl}">Download your certificate PDF</a>
          </p>

          <p style="font-size: 12px; color: #999; margin-top: 8px;">
            The QR code attached to this email also links directly to your verification page.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">
            Keep this email safe. Your verification code and QR code are the proof of your credential.
          </p>
        </body>
      </html>
    `
  });
};

export const sendRevocationEmail = async (toEmail, studentName, orgName) => {
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: toEmail,
    subject: 'Certificate Revocation Notice — Block-Ledger',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">

          <h2 style="color: #dc2626;">Certificate Revocation Notice</h2>

          <p>Dear <strong>${studentName}</strong>,</p>

          <p>
            We are writing to inform you that a certificate previously issued to you by
            <strong>${orgName}</strong> on the Block-Ledger platform has been revoked.
          </p>

          <div style="
            background-color: #fef2f2;
            border:           1px solid #fecaca;
            border-left:      4px solid #dc2626;
            border-radius:    8px;
            padding:          16px;
            margin:           24px 0;
          ">
            <p style="margin: 0; font-weight: bold; color: #dc2626;">
              ⚠ This certificate is no longer valid
            </p>
            <p style="margin: 8px 0 0 0; font-size: 14px;">
              Any verification attempt on this certificate will now return a
              <strong>Revoked</strong> status.
            </p>
          </div>

          <p>
            If you believe this revocation was made in error or you would like
            more information about the reason, please contact
            <strong>${orgName}</strong> directly.
          </p>

          <p>
            You can also reach the Block-Ledger support team at
            <a href="mailto:${process.env.SUPER_ADMIN_EMAIL}">
              ${process.env.SUPER_ADMIN_EMAIL}
            </a>
            if you need further assistance.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

          <p style="font-size: 12px; color: #999;">
            This is an automated notification from Block-Ledger. Please do not reply
            to this email directly.
          </p>

        </body>
      </html>
    `
  });
};

export const sendCertificateUnrevokedEmail = async (toEmail, studentName, orgName) => {
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: toEmail,
    subject: 'Certificate Reinstated — Block-Ledger',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">

          <h2 style="color: #16a34a;">Certificate Reinstated</h2>

          <p>Dear <strong>${studentName}</strong>,</p>

          <p>
            We are writing to inform you that a certificate previously revoked by
            <strong>${orgName}</strong> on the Block-Ledger platform has been reinstated
            and is now valid again.
          </p>

          <div style="
            background-color: #f0fdf4;
            border:           1px solid #bbf7d0;
            border-left:      4px solid #16a34a;
            border-radius:    8px;
            padding:          16px;
            margin:           24px 0;
          ">
            <p style="margin: 0; font-weight: bold; color: #16a34a;">
              ✓ This certificate is now valid
            </p>
            <p style="margin: 8px 0 0 0; font-size: 14px;">
              Any verification attempt on this certificate will now return a
              <strong>Valid</strong> status.
            </p>
          </div>

          <p>
            If you have any questions about the reinstatement of your certificate,
            please contact <strong>${orgName}</strong> directly.
          </p>

          <p>
            You can also reach the Block-Ledger support team at
            <a href="mailto:${process.env.SUPER_ADMIN_EMAIL}">
              ${process.env.SUPER_ADMIN_EMAIL}
            </a>
            if you need further assistance.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

          <p style="font-size: 12px; color: #999;">
            This is an automated notification from Block-Ledger. Please do not reply
            to this email directly.
          </p>

        </body>
      </html>
    `,
  });
};