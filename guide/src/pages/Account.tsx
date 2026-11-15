import { Lock } from 'lucide-react';

export default function Account() {
  return (
    <section className="panel panel-stitched mt-4 flex flex-col items-center text-center gap-3 py-10">
      <h1 className="text-heading-page">Account</h1>
      <p className="text-body-regular">Guide dan SevnQuest memakai satu akun yang sama.</p>
      <button className="btn rpg-btn rpg-btn-primary opacity-50 cursor-not-allowed" disabled><Lock size={16} aria-hidden /> Login dengan akun SevnQuest</button>
      <p className="text-body-regular max-w-md">
        Login dan impor rencana ke SevnQuest belum aktif. Fitur ini menunggu audit RLS, migrasi database yang
        disetujui, dan mekanisme SSO antar-domain (lihat <code className="font-mono">docs/prd/SEVNQUEST_GUIDE.md</code>).
        Sementara itu seluruh fitur Guide tetap bisa dipakai tanpa login.
      </p>
    </section>
  );
}
