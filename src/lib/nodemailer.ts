import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: process.env.USER_EMAIL_ID,
    pass: process.env.USER_EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(
  firstName: string,
  email: string,
  otp: string
): Promise<any> {
  try {
    const response = await transporter.sendMail({
      from: process.env.USER_EMAIL_ID,
      to: email,
      subject: "ReadCycle User Verification",
      text: `Hello ${firstName},\n\nYour verification code for ReadCycle is: ${otp}.\nPlease enter this code to verify your account.\n\nThank you,\nReadCycle Team`, // plain text body
      html: `
        <div style="font-family: Arial, sans-serif; color: #333333; background-color: #FDF6EC; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #FF6700; border-radius: 10px;">
          <h2 style="text-align: center; color: #FF6700; border-bottom: 2px solid #FF6700; padding-bottom: 10px;">Welcome to ReadCycle, ${firstName}!</h2>
          <p style="color: #333333;">Thank you for signing up with ReadCycle. To complete your account verification, please use the verification code below:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; color: #D62828; border: 1px solid #D62828; padding: 10px; display: inline-block; border-radius: 5px;">${otp}</span>
          </div>
          <p style="color: #333333;">If you did not initiate this request, please ignore this email or contact our support team immediately.</p>
          <p style="color: #333333;">Thank you,<br>ReadCycle Team</p>
        </div>
      `,
    });

    if (response.accepted.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Something went wrong while sending verification email",
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Verification email sent successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while sending verification email: ", error);
    return Response.json(
      {
        success: false,
        message: "Failed to send verification email",
      },
      { status: 500 }
    );
  }
}

export async function sendRequestApprovalEmail(
  firstName: string,
  email: string,
  otp: string,
  deliverTo: string,
  title: string
): Promise<any> {
  try {
    const response = await transporter.sendMail({
      from: process.env.USER_EMAIL_ID,
      to: email,
      subject: "ReadCycle | Book Request Approved",
      text: `Dear ${firstName},\n\nWe are pleased to inform you that your request for the book "${title}" has been approved. It will be delivered to the following address:\n\n${deliverTo}\n\nTo confirm your order, please use the OTP below:\n\n${otp}\n\nEnter this OTP to complete the process.\n\nIf you did not request this book, please ignore this email.\n\nBest regards,\nThe ReadCycle Team`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333333; background-color: #FDF6EC; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #FF6700; border-radius: 10px;">
          <h2 style="text-align: center; color: #FF6700; border-bottom: 2px solid #FF6700; padding-bottom: 10px;">Book Request Approved</h2>
          <p style="color: #333333;">Dear <strong>${firstName}</strong>,</p>
          <p style="color: #333333;">We are pleased to inform you that your request for the book "<strong>${title}</strong>" has been approved.</p>
          <p style="color: #333333;">Your book will be delivered to the following address:</p>
          <p style="font-size: 16px; font-weight: bold; color: #D62828;">${deliverTo}</p>
          <p style="color: #333333;">To confirm your order, please enter the OTP below:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; color: #D62828; border: 1px solid #D62828; padding: 10px; display: inline-block; border-radius: 5px;">${otp}</span>
          </div>
          <p style="color: #333333;">If you did not request this book, please disregard this email.</p>
          <p style="color: #333333;">Best regards,<br>The ReadCycle Team</p>
        </div>
      `,
    });

    if (response.accepted.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Something went wrong while sending the approval email.",
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Approval email sent successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while sending approval email: ", error);
    return Response.json(
      {
        success: false,
        message: "Failed to send approval email.",
      },
      { status: 500 }
    );
  }
}

export async function sendBuyerRequestConfirmationEmail(
  firstName: string,
  buyerName: string,
  buyerId: string,
  deliverTo: string,
  bookTitle: string,
  email: string
): Promise<any> {
  try {
    const response = await transporter.sendMail({
      from: process.env.USER_EMAIL_ID,
      to: email,
      subject: "ReadCycle | Your Book Has Been Ordered!",
      text: `Dear ${firstName},\n\nGood news! Your book "${bookTitle}" has been requested by ${buyerName}.\n\nThe book is to be delivered to:\n${deliverTo}\n\nPlease coordinate with the buyer to arrange the delivery.\n\nIf you have any concerns, feel free to reach out.\n\nBest regards,\nThe ReadCycle Team`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333333; background-color: #FDF6EC; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #FF6700; border-radius: 10px;">
          <h2 style="text-align: center; color: #FF6700; border-bottom: 2px solid #FF6700; padding-bottom: 10px;">Your Book Has Been Ordered!</h2>
          <p>Dear <strong>${firstName}</strong>,</p>
          <p>Good news! Your book "<strong>${bookTitle}</strong>" has been requested by <a href=${
        process.env.FRONTEND_URL + "/user/" + buyerId
      } target="_blank"><strong>${buyerName}</strong></a>.</p>
          <p>The book is to be delivered to:</p>
          <p style="font-size: 16px; font-weight: bold; color: #D62828;">${deliverTo}</p>
          <p>Please coordinate with the buyer to arrange the delivery.</p>
          <p>If you have any concerns, feel free to reach out.</p>
          <p>Best regards,<br><strong>The ReadCycle Team</strong></p>
        </div>
      `,
    });

    if (response.accepted.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Something went wrong while sending the email.",
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Email sent successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while sending email: ", error);
    return Response.json(
      {
        success: false,
        message: "Failed to send email.",
      },
      { status: 500 }
    );
  }
}
