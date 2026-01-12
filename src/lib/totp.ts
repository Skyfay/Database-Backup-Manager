import { TOTP, NobleCryptoPlugin, ScureBase32Plugin, generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';

const authenticator = new TOTP({
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
});

export const generateTotpSecret = () => {
    return generateSecret();
};

export const generateTotpQrCode = async (secret: string, email: string) => {
    const otpauth = generateURI({
        secret,
        label: email,
        issuer: 'DatabaseBackupManager',
        algorithm: 'sha1',
        digits: 6,
        period: 30
    });
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
