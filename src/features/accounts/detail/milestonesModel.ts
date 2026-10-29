import type { MilestoneStatus } from '@/lib/rewards.types';

/** One milestone per id: the window containing `today`, else the latest window. Order of first appearance is kept. */
export function currentMilestones(milestones: readonly MilestoneStatus[], today: string): MilestoneStatus[] {
  const byId = new Map<string, MilestoneStatus>();
  for (const m of milestones) {
    const best = byId.get(m.milestoneId);
    const inWindow = (x: MilestoneStatus) => x.windowStart <= today && today <= x.windowEnd;
    if (!best) byId.set(m.milestoneId, m);
    else if (inWindow(m) ? !inWindow(best) || m.windowStart > best.windowStart : !inWindow(best) && m.windowStart > best.windowStart) {
      byId.set(m.milestoneId, m);
    }
  }
  return [...byId.values()];
}
