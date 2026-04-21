import { getAdmin, verifyAdminCaller } from './_admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const caller = await verifyAdminCaller(req);
    const a = getAdmin();

    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ error: 'Falta uid del usuario a eliminar' });
    if (uid === caller.uid) return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });

    // Eliminar de Auth
    await a.auth().deleteUser(uid);
    // Eliminar de Firestore
    await a.firestore().collection('users').doc(uid).delete();

    return res.status(200).json({ success: true });
  } catch (err) {
    const status = err.message?.includes('No autorizado') ? 401
                 : err.message?.includes('administradores') ? 403
                 : 500;
    return res.status(status).json({ error: err.message || 'Error desconocido' });
  }
}
