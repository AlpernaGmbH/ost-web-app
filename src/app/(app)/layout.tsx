import { BottomNav } from "@/components/bottom-nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6">{children}</main>
      <BottomNav />
    </>
  );
}
