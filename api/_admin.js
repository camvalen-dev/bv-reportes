import admin from 'firebase-admin';

let initialized = false;

export function getAdmin() {
  if (!initialized && !admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_KEY');
    const serviceAccount = JSON.parse(raw);
    // Las private keys con \n a veces vienen escapadas
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
  }
  return admin;
}

// Verifica el token y devuelve el uid + datos del caller
export async function verifyAdminCaller(req) {
  const a = getAdmin();
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!idToken) throw new Error('No autorizado: token faltante');

  const decoded = await a.auth().verifyIdToken(idToken);
  const callerDoc = await a.firestore().collection('users').doc(decoded.uid).get();
  if (!callerDoc.exists) throw new Error('Tu usuario no existe en la base');
  const callerData = callerDoc.data();
  if (callerData.role !== 'admin') throw new Error('Solo administradores pueden hacer esta acción');

  return { uid: decoded.uid, ...callerData };
}
