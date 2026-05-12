import nodemailer from "nodemailer"
import fs from "fs/promises"
import path from "path"
import Handlebars from "handlebars"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import type { EmailTemplateData } from "../types/globals"

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  } as SMTPTransport.Options)
  

  static async sendEmail(mailOptions: SMTPTransport.Options) {
    return this.transporter.sendMail(mailOptions)
  }
//pour le momment brk
  static getWelcomeEmailTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      padding: 20px;
      background: #f9f9f9;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #777;
    }
    .credentials {
      background: white;
      padding: 15px;
      border-left: 4px solid #667eea;
      margin: 20px 0;
      border-radius: 3px;
    }
    .credentials-label {
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to CVE Tech Watch</h1>
    </div>
    <div class="content">
      <p>Hello {{firstName}} {{lastName}},</p>
      <p>Your account has been successfully created! We're excited to have you join us.</p>
      
      <div class="credentials">
        <div class="credentials-label">Login Credentials</div>
        <p><strong>Email:</strong> {{email}}</p>
        <p><strong>Temporary Password:</strong> {{password}}</p>
        <p style="color: #d9534f; font-size: 12px;">Please change your password after your first login.</p>
      </div>

      <p>You can now log in and start using CVE Tech Watch to monitor security vulnerabilities.</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      
      <p>Best regards,<br>The CVE Tech Watch Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 CVE Tech Watch. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  static async loadTemplate(templateName: string): Promise<string> {
    if (templateName === "index.html") {
      return this.getWelcomeEmailTemplate()
    }
    throw new Error(`Template ${templateName} not found`)
  }

  static async sendWelcomeEmail(
    to: string,
    templateData: EmailTemplateData
  ): Promise<boolean> {
    try {
      const templateSource = await this.loadTemplate("index.html")
      const template = Handlebars.compile(templateSource)
      const html = template(templateData)

      await this.sendEmail({
        from: `"CVE Tech Watch" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Your Account Has Been Created",
        html,
      })

      console.log(`Welcome email sent to ${to}`)
      return true
    } catch (error) {
      console.error("Error sending welcome email:", error)
      return false
    }
  }

  static async sendPasswordResetEmail(
    to: string,
    resetLink: string
  ): Promise<boolean> {
    try {
      const templatePath = path.join(process.cwd(), "src/templates/index.html");
      const templateSource = await fs.readFile(templatePath, "utf-8");

      const template = Handlebars.compile(templateSource);
      const html = template({ reset_link: resetLink });

      await this.sendEmail({
        from: `"CipherCloud" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Password Reset Request",
        html,
      });

      console.log(`Password reset email sent to ${to}`);
      return true;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      return false;
    }
  }

  static async sendVerificationEmail(
    to: string,
    verificationLink: string,
    expiryHours: number = 24
  ): Promise<boolean> {
    try {
      const templatePath = path.join(process.cwd(), "src/templates/verify-email.html");
      const templateSource = await fs.readFile(templatePath, "utf-8");

      const template = Handlebars.compile(templateSource);
      const html = template({
        verification_link: verificationLink,
        expiryHours,
        year: new Date().getFullYear(),
      });

      await this.sendEmail({
        from: `"CipherCloud" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Verify your CipherCloud email address",
        html,
      });

      console.log(`Verification email sent to ${to}`);
      return true;
    } catch (error) {
      console.error("Error sending verification email:", error);
      return false;
    }
  }

  static async sendOTPEmail(
    to: string,
    otpCode: string,
    expiryMinutes: number = 5
  ): Promise<boolean> {
    try {
      const templatePath = path.join(process.cwd(), "src/templates/otp.html");
      const templateSource = await fs.readFile(templatePath, "utf-8");

      const otpDigits = otpCode.split("");
      const template = Handlebars.compile(templateSource);
      const html = template({
        otpDigits,
        expiryMinutes,
        year: new Date().getFullYear(),
      });

      await this.sendEmail({
        from: `"CipherCloud" <${process.env.EMAIL_USER}>`,
        to,
        subject: `${otpCode} is your CipherCloud login code`,
        html,
      });

      console.log(`OTP email sent to ${to}`);
      return true;
    } catch (error) {
      console.error("Error sending OTP email:", error);
      return false;
    }
  }
}