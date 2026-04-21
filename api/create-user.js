import { getAdmin, verifyAdminCaller } from './_admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    await verifyAdminCaller(req);
    const a = getAdmin();

    const { email, password, nombre, role, obraId } = req.body || {};
    if (!email || !password || !role) return res.status(400).json({ error: 'Faltan datos: email, password y rol son obligatorios' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    if (role !== 'admin' && role !== 'lider') return res.status(400).json({ error: 'Rol inválido' });
    if (role === 'lider' && !obraId) return res.status(400).json({ error: 'Líderes deben tener una obra asignada' });

    // Crear usuario en Firebase Auth
    const userRecord = await a.auth().createUser({
      email: email.toLowerCase().trim(),
      password,
      displayName: nombre || email,
    });

    // Crear documento de perfil en Firestore
    await a.firestore().collection('users').doc(userRecord.uid).set({
      email: email.toLowerCase().trim(),
      nombre: nombre || '',
      role,
      obraId: role === 'lider' ? obraId : null,
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
    });
  } catch (err) {
    const msg = err.code === 'auth/email-already-exists'
      ? 'Ese correo ya está registrado'
      : err.message || 'Error desconocido';
    const status = err.message?.includes('No autorizado') ? 401
                 : err.message?.includes('administradores') ? 403
                 : 500;
    return res.status(status).json({ error: msg });
  }
}
