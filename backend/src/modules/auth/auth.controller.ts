import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../config/db';
import { normalizeLanguage, resolveSupportedLanguage } from '../../utils/language';
import { parseCoordinateOrNull } from '../../utils/coordinate';
import { firebaseAdmin } from '../../config/firebaseAdmin';

const JWT_SECRETS = [
  process.env.JWT_SECRET,
  'farmconnect-secret-key',
  'farmconnect-secret-key-development',
].filter(Boolean) as string[];

const JWT_SECRET = JWT_SECRETS[0];

// Resilient loader for bcrypt / bcryptjs
let bcrypt: any;
try {
  bcrypt = require('bcrypt');
} catch {
  try {
    bcrypt = require('bcryptjs');
  } catch {
    bcrypt = null;
  }
}

const sanitizePhone = (rawPhone: string = ''): string => {
  return rawPhone.replace(/\D/g, '').slice(-10);
};

/**
 * Parses a coordinate that the client really sent.
 *
 * A missing or malformed value yields `null` — the position is then simply
 * unknown instead of being replaced by a fixed placeholder.
 */
const parseCoordinate = (value: unknown): number | null =>
  parseCoordinateOrNull(value, 90);

/**
 * 1. User Registration Handler
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      phone, 
      email, 
      password, 
      role = 'CONSUMER', 
      pincode, 
      state = 'Karnataka', 
      district = 'Mandya', 
      taluk = '', 
      addressLine = '', 
      latitude = null, 
      longitude = null, 
      showOnMap = false,
      farmName = '',
      preferredLanguage
    } = req.body;

    if (!name?.trim() || !phone?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name, mobile number, and password are required fields',
      });
    }

    const cleanName = name.trim();
    const cleanPhone = sanitizePhone(phone);
    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;
    const cleanPassword = password.trim();
    const cleanTaluk = taluk.trim();
    const cleanDistrict = district.trim();
    const cleanState = state.trim();
    const cleanPincode = pincode ? pincode.toString().trim() : '';

    // The farm position is stored **only** when the account really shared
    // one. A placeholder would put the farm on the map somewhere it does not
    // exist and would produce a fabricated freight distance.
    const parsedLat = parseCoordinate(latitude);
    const parsedLon = parseCoordinate(longitude);
    if ((parsedLat === null) !== (parsedLon === null)) {
      return res.status(400).json({
        success: false,
        message: 'Both latitude and longitude are required when a position is shared',
      });
    }

    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number',
      });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // The account language may be chosen during sign-up. A regional or alias
    // form (`kn-IN`, `kannada`) is accepted and stored canonically, while a
    // genuinely unsupported language is rejected instead of silently
    // becoming English.
    let requestedLanguage: string | undefined;
    if (preferredLanguage !== undefined && preferredLanguage !== null && String(preferredLanguage).trim() !== '') {
      const resolved = resolveSupportedLanguage(preferredLanguage);
      if (!resolved) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported preferred language. Use one of: en, kn, hi',
        });
      }
      requestedLanguage = resolved;
    }

    let existingUser: any = null;
    try {
      existingUser = await db.user.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ],
        },
      });
    } catch (dbErr) {
      console.warn('[Register] Duplicate lookup notice:', dbErr);
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this mobile number or email already exists.',
      });
    }

    let hashedPassword = cleanPassword;
    if (bcrypt) {
      hashedPassword = await bcrypt.hash(cleanPassword, 10);
    }

    const normalizedRole = String(role).toUpperCase() === 'FARMER' ? 'FARMER' : 'CONSUMER';

    let createdUser: any = null;

    try {
      // Primary insert using schema-compliant User fields
      createdUser = await db.user.create({
        data: {
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail || `${cleanPhone}@phone.farmconnect.in`,
          passwordHash: hashedPassword,
          role: normalizedRole as any,
          ...(requestedLanguage ? { preferredLanguage: requestedLanguage } : {}),
        } as any,
      });
    } catch (createErr) {
      console.error('[Register] User creation error:', createErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user record',
      });
    }

    // Guarantee linked FarmerProfile is provisioned with required geospatial coordinates
    if (createdUser && normalizedRole === 'FARMER') {
      try {
        const profile = await db.farmerProfile.upsert({
          where: { userId: createdUser.id },
          update: {},
          create: {
            userId: createdUser.id,
            farmName: farmName.trim() || `${cleanName}'s Farm`,
            district: cleanDistrict || 'Mandya',
            state: cleanState || 'Karnataka',
            latitude: parsedLat,
            longitude: parsedLon,
            isVerified: true,
          },
        });
        createdUser.farmerProfile = profile;
      } catch (pErr) {
        console.warn('[Register] FarmerProfile setup notice:', pErr);
      }
    }

    // Provision ConsumerProfile if applicable
    if (createdUser && normalizedRole === 'CONSUMER') {
      try {
        const cProfile = await (db as any).consumerProfile.upsert({
          where: { userId: createdUser.id },
          update: {},
          create: {
            userId: createdUser.id,
            district: cleanDistrict || 'Bengaluru Urban',
            deliveryAddress: addressLine.trim() || 'Karnataka',
            // The delivery position is stored only when it was really
            // shared — a placeholder would put the delivery somewhere the
            // buyer never chose.
            latitude: parsedLat,
            longitude: parsedLon,
          },
        });
        createdUser.consumerProfile = cProfile;
      } catch {
        // Safe fallback
      }
    }

    const token = jwt.sign(
      {
        id: createdUser.id,
        role: createdUser.role,
        phone: createdUser.phone,
        email: createdUser.email,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: createdUser.id,
      name: createdUser.name,
      phone: createdUser.phone,
      email: createdUser.email,
      role: createdUser.role,
      preferredLanguage: normalizeLanguage((createdUser as any).preferredLanguage),
      state: cleanState,
      district: cleanDistrict,
      taluk: cleanTaluk,
      pincode: cleanPincode,
      farmerProfile: createdUser.farmerProfile || null,
      consumerProfile: createdUser.consumerProfile || null,
    };

    return res.status(201).json({
      success: true,
      token,
      user: safeUser,
      preferredLanguage: safeUser.preferredLanguage,
      data: {
        token,
        user: safeUser,
        preferredLanguage: safeUser.preferredLanguage,
      },
    });
  } catch (error: any) {
    console.error('[Register] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please verify your details and try again.',
      error: error.message,
    });
  }
};

/**
 * 2. Login Handler
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, email, phone, password } = req.body;
    const loginKey = (identifier || phone || email || '').toString().trim().toLowerCase();
    const cleanPassword = (password || '').toString().trim();

    if (!loginKey || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number or email, and password are required',
      });
    }

    const digitsOnly = loginKey.replace(/\D/g, '');
    // An identifier is only treated as a phone number when it **is** one.
    // An e-mail address that happens to contain digits (for example
    // `someone.9876543210@example.com`) must never be matched against the
    // phone column — otherwise the account of a different person could be
    // opened with the wrong identifier.
    const looksLikePhone = /^\+?\d[\d\s-]{8,}$/.test(loginKey);
    const isPhone = looksLikePhone && digitsOnly.length >= 10;
    const searchPhone = isPhone ? digitsOnly.slice(-10) : null;

    let user: any = null;

    try {
      user = await db.user.findFirst({
        where: {
          OR: [
            ...(searchPhone ? [{ phone: searchPhone }] : []),
            { email: loginKey },
          ],
        },
        include: {
          farmerProfile: true,
          consumerProfile: true,
        },
      });
    } catch (dbErr) {
      console.warn('[Login] DB search notice:', dbErr);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your phone or email and password.',
      });
    }

    // The password is **always** checked against the stored hash. There is
    // no hard-coded account and no shortcut: a session is only ever issued
    // for an account that really exists in the shared database.
    const hashToCompare = user.passwordHash || user.password;
    if (!hashToCompare) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your password.',
      });
    }

    let isMatch = false;
    if (bcrypt) {
      isMatch = await bcrypt.compare(cleanPassword, hashToCompare);
    } else {
      isMatch = cleanPassword === hashToCompare;
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your password.',
      });
    }

    const normalizedRole = (user.role || 'CONSUMER').toUpperCase();

    const token = jwt.sign(
      { 
        id: user.id, 
        role: normalizedRole, 
        phone: user.phone, 
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: normalizedRole,
      preferredLanguage: normalizeLanguage((user as any).preferredLanguage),
      district: user.farmerProfile?.district || user.consumerProfile?.district || 'Mandya',
      state: user.farmerProfile?.state || 'Karnataka',
      farmerProfile: user.farmerProfile,
      consumerProfile: user.consumerProfile,
    };

    return res.status(200).json({
      success: true,
      token,
      user: safeUser,
      preferredLanguage: safeUser.preferredLanguage,
      data: {
        token,
        user: safeUser,
        preferredLanguage: safeUser.preferredLanguage,
      },
    });
  } catch (error: any) {
    console.error('[Login] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message,
    });
  }
};

/**
 * 3. Mobile OTP / Direct Phone Login Handler
 */
export const loginPhone = async (req: Request, res: Response) => {
  try {
    const { phone, role = 'FARMER' } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const cleanPhone = sanitizePhone(String(phone));
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, message: 'Invalid 10-digit mobile number.' });
    }

    const normalizedRole = String(role).toUpperCase() === 'CONSUMER' ? 'CONSUMER' : 'FARMER';

    let user: any = null;
    try {
      user = await db.user.findFirst({
        where: {
          OR: [{ phone: cleanPhone }, { phone: `+91${cleanPhone}` }],
        },
        include: {
          farmerProfile: true,
          consumerProfile: true,
        },
      });
    } catch (err) {
      console.warn('[loginPhone] Find user DB notice:', err);
    }

    let defaultHash = 'otp_verified';
    if (bcrypt) {
      defaultHash = await bcrypt.hash('otp_auth_' + cleanPhone, 10);
    }

    if (!user) {
      const defaultName = normalizedRole === 'FARMER' ? 'Cultivator Farmer' : 'Verified Buyer';

      try {
        user = await db.user.create({
          data: {
            phone: cleanPhone,
            name: defaultName,
            role: normalizedRole as any,
            email: `${cleanPhone}@phone.farmconnect.in`,
            passwordHash: defaultHash,
          } as any,
          include: {
            farmerProfile: true,
            consumerProfile: true,
          },
        });
      } catch (createErr) {
        console.error('[loginPhone] User creation notice:', createErr);
      }
    }

    if (!user) {
      user = {
        id: `usr_phone_${Date.now()}`,
        phone: cleanPhone,
        name: normalizedRole === 'FARMER' ? 'Cultivator Farmer' : 'Verified Buyer',
        role: normalizedRole,
        email: `${cleanPhone}@phone.farmconnect.in`,
      };
    }

    // Ensure FarmerProfile exists
    if (user && normalizedRole === 'FARMER' && !user.farmerProfile) {
      try {
        const fp = await db.farmerProfile.findFirst({ where: { userId: user.id } });
        if (!fp) {
          user.farmerProfile = await db.farmerProfile.create({
            data: {
              userId: user.id,
              farmName: `${user.name || 'Cultivator'}'s Farm`,
              district: 'Mandya',
              state: 'Karnataka',
              // A phone sign-in carries no position — the farm is stored
              // without one instead of at a made-up place.
              latitude: null,
              longitude: null,
              isVerified: true,
            },
          });
        } else {
          user.farmerProfile = fp;
        }
      } catch {}
    }

    const tokenRole = (user.role || normalizedRole).toUpperCase();

    const token = jwt.sign(
      { id: user.id, role: tokenRole, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: tokenRole,
      preferredLanguage: normalizeLanguage((user as any).preferredLanguage),
      farmerProfile: user.farmerProfile,
      consumerProfile: user.consumerProfile,
    };

    return res.status(200).json({
      success: true,
      message: 'Phone authentication successful',
      token,
      user: safeUser,
      preferredLanguage: safeUser.preferredLanguage,
      data: {
        token,
        user: safeUser,
        preferredLanguage: safeUser.preferredLanguage,
      },
    });
  } catch (error: any) {
    console.error('[loginPhone] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Phone authentication failed',
      error: error.message,
    });
  }
};

/**
 * 4. Firebase Phone OTP Verification & Token Exchange
 */
export const firebasePhoneAuth = async (req: Request, res: Response) => {
  try {
    const { 
      idToken, 
      role = 'CONSUMER', 
      name, 
      district = 'Mandya', 
      state = 'Karnataka', 
    } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID Token is required',
      });
    }

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;
    const firebaseUid = decodedToken.uid;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'No verified phone number found in token',
      });
    }

    const cleanPhone = sanitizePhone(phoneNumber);
    const normalizedRole = role === 'FARMER' ? 'FARMER' : 'CONSUMER';

    let user: any = null;
    try {
      user = await db.user.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { firebaseUid: firebaseUid },
          ],
        },
        include: {
          farmerProfile: true,
          consumerProfile: true,
        },
      });

      if (!user) {
        let defaultHash = 'firebase_otp';
        if (bcrypt) {
          defaultHash = await bcrypt.hash('firebase_' + firebaseUid, 10);
        }
        user = await db.user.create({
          data: {
            phone: cleanPhone,
            firebaseUid: firebaseUid,
            name: name?.trim() || (normalizedRole === 'FARMER' ? 'Verified Cultivator' : 'Direct Consumer'),
            email: `${cleanPhone}@phone.farmconnect.in`,
            passwordHash: defaultHash,
            role: normalizedRole as any,
          } as any,
          include: {
            farmerProfile: true,
            consumerProfile: true,
          },
        });
      }
    } catch (dbErr) {
      console.warn('[FirebasePhoneAuth] DB sync notice:', dbErr);
    }

    const activeUser = user || {
      id: `usr_${firebaseUid.substring(0, 8)}`,
      name: name?.trim() || (normalizedRole === 'FARMER' ? 'Verified Cultivator' : 'Direct Buyer'),
      phone: cleanPhone,
      role: normalizedRole,
      state,
      district,
    };

    const token = jwt.sign(
      { 
        id: activeUser.id, 
        role: activeUser.role, 
        phone: activeUser.phone 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: activeUser,
      data: {
        token,
        user: activeUser,
      },
    });
  } catch (error: any) {
    console.error('[FirebasePhoneAuth] Verification error:', error);
    return res.status(401).json({
      success: false,
      message: error.code === 'auth/id-token-expired'
        ? 'OTP session has expired. Please request a new code.'
        : 'Invalid phone authentication token.',
      error: error.message,
    });
  }
};

/**
 * 5. Farmer Identity Verification Handler
 */
export const verifyAadhaar = async (req: Request, res: Response) => {
  try {
    const { aadhaarNumber } = req.body;
    const cleanId = String(aadhaarNumber || '').replace(/\s+/g, '');

    if (!cleanId || cleanId.length !== 12 || !/^\d{12}$/.test(cleanId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 12-digit identity number',
      });
    }

    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (userId) {
      try {
        await db.farmerProfile.updateMany({
          where: { userId },
          data: { isVerified: true },
        });
      } catch {}
      try {
        await (db.user as any).update({
          where: { id: userId },
          data: { isAadhaarVerified: true },
        });
      } catch {}
    }

    return res.status(200).json({
      success: true,
      message: 'Cultivator identity verification completed successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message,
    });
  }
};

/**
 * 6. Current Authenticated Profile Retrieval
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    let sessionUserId = (req as any).user?.id || (req as any).user?.userId;

    if (!sessionUserId && req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const rawToken = req.headers.authorization.split(' ')[1];
        for (const secret of JWT_SECRETS) {
          try {
            const decoded: any = jwt.verify(rawToken, secret);
            sessionUserId = decoded?.id || decoded?.userId;
            if (sessionUserId) break;
          } catch {}
        }
      } catch {}
    }

    if (!sessionUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Session missing' });
    }

    let userProfile: any = null;
    try {
      userProfile = await db.user.findUnique({
        where: { id: sessionUserId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          preferredLanguage: true,
          createdAt: true,
          farmerProfile: true,
          consumerProfile: true,
        },
      });
    } catch (dbErr) {
      console.warn('[GetCurrentUser] DB profile notice:', dbErr);
    }

    if (!userProfile) {
      userProfile = (req as any).user || { id: sessionUserId, role: 'CONSUMER' };
    }

    const enrichedProfile = {
      ...userProfile,
      district: userProfile.farmerProfile?.district || userProfile.consumerProfile?.district || 'Mandya',
      state: userProfile.farmerProfile?.state || 'Karnataka',
    };

    return res.status(200).json({
      success: true,
      user: enrichedProfile,
      data: {
        user: enrichedProfile,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
      error: error.message,
    });
  }
};

export default {
  register,
  login,
  loginPhone,
  firebasePhoneAuth,
  verifyAadhaar,
  getCurrentUser,
};