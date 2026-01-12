import { TOTP, NobleCryptoPlugin, ScureBase32Plugin, generateSecret } from 'otplib';
import QRCode from 'qrcode';

const authenticator = new TOTP({
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
});

export const generateTotpSecret = () => {
  return generateSecret();
};

export const generateTotpQrCode = async (secret: string, email: string) => {
  const otpauth = authenticator.keyuri(email, 'DatabaseBackupManager', secret);
  return await QRCode.toDataURL(otpauth);
};

export const verifyTotpToken = (token: string, secret: string) => {
  try {
      return authenticator.check(token, secret);
  } catch (err) {
      console.error("TOTP Check Error:", err);
      return false;
  }
};
