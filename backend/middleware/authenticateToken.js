const admin = require('firebase-admin');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    console.warn('❌ No token provided');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;

    // 👇 Add this part to determine admin status by email or custom claim
    const ADMIN_EMAILS = ['grid.pro11@gmail.com', 'jsambhav338@gmail.com'];
    req.isAdmin = decodedToken.role === 'admin' || ADMIN_EMAILS.includes(decodedToken.email || '');

    console.log('✅ Token verified for user:', req.user.uid);
    if (req.isAdmin) {
      console.log('🔐 Admin access granted');
    }

    next(); 
  } catch (err) {
    console.error('❌ Invalid token:', err.message);
    return res.status(403).json({ message: 'Forbidden: Invalid token' });
  }
};

module.exports = authenticateToken;
