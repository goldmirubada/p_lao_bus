
import CryptoJS from 'crypto-js';

// TODO: Production 환경에서는 반드시 환경변수로 분리해야 합니다.
// WASM 단계: 클라이언트에서는 이 하드코딩된 키가 제거되거나 빈 문자열이 되어야 함
// Server-side fallback only to prevent leaking to client
const SECRET_KEY = process.env.MAP_DATA_KEY || (typeof window === 'undefined' ? 'p_lao_bus_secure_map_key_2025_safe' : '');

export const encryptData = (data: any): string => {
    try {
        const jsonString = JSON.stringify(data);
        return CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
    } catch (error) {
        console.error('Encryption Failed:', error);
        return '';
    }
};

export const decryptData = (ciphertext: string, key?: string): any => {
    try {
        const secret = key || SECRET_KEY;
        if (!secret) throw new Error('Decryption Key missing');

        const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedData) return null;
        return JSON.parse(decryptedData);
    } catch (error) {
        console.error('Decryption Failed:', error);
        return null;
    }
};
