import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/create-member
 *
 * Creates a Firebase Auth user + Firestore profile without signing out the admin.
 * Protected: caller must supply a valid Firebase ID token in the Authorization header.
 * The token is verified server-side; only users with role === "admin" may proceed.
 *
 * Headers:
 *   Authorization: Bearer <firebase-id-token>
 *
 * Body: { email, password, name, phone, teamId? }
 *
 * Env vars needed:
 *   FIREBASE_SERVICE_ACCOUNT_JSON   — service account JSON string (local / non-GCP)
 *   (or Application Default Credentials on Cloud Run / GCF)
 */
export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse body ──────────────────────────────────────────────────────────
    const body = await req.json();
    const { email, password, name, phone, teamId } = body as {
      email: string; password: string; name: string; phone: string; teamId?: string;
    };

    if (!email || !password || !name || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── 2. Load firebase-admin ─────────────────────────────────────────────────
    let admin: typeof import("firebase-admin");
    try {
      admin = await import("firebase-admin");
    } catch {
      return NextResponse.json(
        { error: "firebase-admin not installed. Run: npm install firebase-admin" },
        { status: 500 }
      );
    }

    if (!admin.apps.length) {
      const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      admin.initializeApp(
        svcJson
          ? { credential: admin.credential.cert(JSON.parse(svcJson)) }
          : undefined  // ADC on Google Cloud
      );
    }

    // ── 3. Verify caller is an admin ───────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized — missing token" }, { status: 401 });
    }

    let callerUid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      callerUid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Unauthorized — invalid token" }, { status: 401 });
    }

    // Check Firestore role
    const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    // ── 4. Create the new member ───────────────────────────────────────────────
    const userRecord = await admin.auth().createUser({ email, password, displayName: name });
    const uid = userRecord.uid;

    await admin.firestore().collection("users").doc(uid).set({
      uid,
      name: String(name),
      phone: String(phone),
      email: String(email),
      role: "member",
      teamId: teamId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ uid }, { status: 201 });

  } catch (err: any) {
    console.error("create-member error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
