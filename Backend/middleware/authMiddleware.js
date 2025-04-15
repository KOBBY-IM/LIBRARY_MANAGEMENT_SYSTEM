const jwt = require('jsonwebtoken');

const authMiddleware = (roles) => {
    return (req, res, next) => {
        try {
            // Get the token from the Authorization header
            const authHeader = req.header('Authorization');
            if (!authHeader) {
                console.log('Auth middleware: No Authorization header provided');
                return res.status(401).json({ 
                    success: false, 
                    message: 'Access denied. No token provided.' 
                });
            }
            
            // Extract the token (handle both "Bearer token" and just "token" formats)
            const token = authHeader.startsWith('Bearer ') 
                ? authHeader.replace('Bearer ', '') 
                : authHeader;
                
            if (!token) {
                console.log('Auth middleware: No token extracted from header');
                return res.status(401).json({ 
                    success: false, 
                    message: 'Access denied. Invalid token format.' 
                });
            }

            try {
                // Verify the token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // Add user info to the request
                req.user = decoded;
                
                // Check if the user has the required role
                if (roles && Array.isArray(roles) && roles.length > 0) {
                    if (!roles.includes(decoded.role)) {
                        console.log(`Auth middleware: User role ${decoded.role} not in allowed roles: ${roles.join(', ')}`);
                        return res.status(403).json({ 
                            success: false, 
                            message: 'Access denied. You do not have permission for this action.' 
                        });
                    }
                }
                
                // If all checks pass, proceed to the next middleware/handler
                next();
            } catch (jwtError) {
                console.log('Auth middleware: JWT verification failed -', jwtError.message);
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid or expired token. Please log in again.' 
                });
            }
        } catch (err) {
            console.error('Auth middleware unexpected error:', err);
            res.status(500).json({ 
                success: false, 
                message: 'Server error during authentication.' 
            });
        }
    };
};

module.exports = authMiddleware;