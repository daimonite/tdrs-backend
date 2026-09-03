/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces access based on 5 user roles: participant, volunteer, sponsor, partner, admin
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    // In production, req.user is decoded from JWT auth header
    const userRole = req.user?.role || req.headers['x-user-role'] || 'participant';

    if (allowedRoles.length === 0 || allowedRoles.includes(userRole) || userRole === 'admin') {
      req.userRole = userRole;
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: `Access denied. Requires one of [${allowedRoles.join(', ')}], current role is '${userRole}'`,
      code: 'RBAC_ACCESS_DENIED'
    });
  };
};
