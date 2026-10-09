import { toneColors } from "@/lib/module-tone";

/** Module code as a chip in the module's own color; the same chip is used everywhere the module shows up. */
export function ModuleChip({ code, tone }: { code: string; tone: number | undefined }) {
  const { soft, ink } = toneColors(tone);
  return (
    <span className="inline-flex h-7 shrink-0 items-center rounded-pill px-3 text-[13px] font-bold leading-none" style={{ backgroundColor: soft, color: ink }}>
      {code}
    </span>
  );
}
