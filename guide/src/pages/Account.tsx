import { Lock } from 'lucide-react';

export default function Account() {
  return (
    <section className="block center">
      <h1>Account</h1>
      <p className="muted">Guide dan SevnQuest memakai satu akun yang sama.</p>
      <button className="btn primary" disabled><Lock size={16} aria-hidden /> Login dengan akun SevnQuest</button>
      <p className="muted">
        Login dan impor rencana ke SevnQuest belum aktif. Fitur ini menunggu audit RLS, migrasi database yang
        disetujui, dan mekanisme SSO antar-domain (lihat <code>docs/prd/SEVNQUEST_GUIDE.md</code>).
        Sementara itu seluruh fitur Guide tetap bisa dipakai tanpa login.
      </p>
    </section>
  );
}
