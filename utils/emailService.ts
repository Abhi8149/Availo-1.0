// Simple email sending function for verification codes
import { Resend } from 'resend';

const resend = new Resend('re_VhteabPa_5xc3tcYZSK2GJEBp9Kd5d1UN');
// const senderEmail = 'piyushraj7308305@gmail.com';

export async function sendVerificationEmail(email: string, code: string) {
   try {
	   const response = await resend.emails.send({
		   from: 'no-reply@shopstatus.dev',
		   to: email,
		   subject: 'Your ShopStatus Verification Code',
		   text: `Your verification code is: ${code}`,
	   });
	   console.log('Resend email response:', response);
	   if (response.error) {
		   console.error('Resend email error:', response.error);
	   }
   } catch (err) {
	   console.error('Error sending verification email:', err);
   }
}
