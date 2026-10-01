const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'La sesión venció. Vuelve a entrar.' });
  }
}

function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
}

function signUser(user) {
  return jwt.sign(
    {
      id: user.id,
      rol: user.rol,
      email: user.email,
      nombre: `${user.nombres} ${user.apellidos}`.trim(),
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' },
  );
}

module.exports = { requireAuth, allow, signUser };
