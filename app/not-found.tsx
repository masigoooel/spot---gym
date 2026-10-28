import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <Logo className="text-4xl" />
      <h1 className="text-2xl font-bold tracking-[-0.03em]">halamannya gak ketemu.</h1>
      <p className="max-w-sm text-spot-muted">mungkin link-nya salah ketik, atau datanya bukan punya akun ini.</p>
      <Link
        href="/dashboard"
        className="mt-2 flex min-h-11 items-center rounded-full bg-spot-orange px-5 font-semibold text-spot-bg hover:bg-spot-orange-dark"
      >
        balik ke dashboard
      </Link>
    </main>
  );
}
