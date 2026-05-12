const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

export class JwtUtil {
    static async createToken(userId: string){
        const secret = process.env.SECRET;
        const expiresIn = process.env.JWT_EXPIRES;

        const payload = { id: userId };

        const token = jwt.sign(payload, secret, { expiresIn });
        return token;
    }

    static async verifyToken(token: string){
        try {
            const secret = process.env.SECRET;
            const payload = jwt.verify(token, secret);
            return payload;
        } catch (error) {
            return null;
        }
    }

    static async createTempToken(userId: string, purpose: string) {
        const secret = process.env.SECRET;
        const expiresIn = "5m";
        const payload = { id: userId, purpose };
        return jwt.sign(payload, secret, { expiresIn });
    }

    static async verifyTempToken(token: string, expectedPurpose: string) {
        try {
            const secret = process.env.SECRET;
            const payload: any = jwt.verify(token, secret);
            if (payload.purpose !== expectedPurpose) return null;
            return payload;
        } catch {
            return null;
        }
    }
}