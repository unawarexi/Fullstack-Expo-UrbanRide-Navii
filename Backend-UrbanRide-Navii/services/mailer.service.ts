import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransporter({
  service: process.env.SMTP_SERVICE,
  host: process.env.SMTP_HOST,
  port: 587, // Correct port for Gmail with TLS
  secure: false, // Use `true` for port 465, `false` for port 587
  auth: {
    user: process.env.SMTP_USER_EMAIL, // Your Gmail email address
    pass: process.env.SMTP_USER_PASSWORD, // Your Gmail email password
  },
});


const sendMail = async (to: string, subject: string, htmlContent: string): Promise<void> => {
  const mailOptions = {
    from: process.env.SMTP_USER_EMAIL,
    to,
    subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
};

export { sendMail };
