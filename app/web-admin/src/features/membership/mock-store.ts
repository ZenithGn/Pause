import "server-only";

import { MOCK_MEMBERSHIP_PLANS, MOCK_SUBSCRIBERS } from "@/lib/mock-data";
import type { MembershipPlan, MembershipSubscriber } from "@/types/admin";

interface MockMembershipStore {
  plans: MembershipPlan[];
}

const globalForMockMembership = globalThis as typeof globalThis & {
  __pauseMockMembershipStore?: MockMembershipStore;
};

function getMockStore(): MockMembershipStore {
  if (!globalForMockMembership.__pauseMockMembershipStore) {
    globalForMockMembership.__pauseMockMembershipStore = {
      plans: MOCK_MEMBERSHIP_PLANS.map((plan) => ({ ...plan })),
    };
  }
  return globalForMockMembership.__pauseMockMembershipStore;
}

export function getMockMembershipPlans(includeInactive: boolean): MembershipPlan[] {
  const plans = getMockStore().plans
    .filter((plan) => includeInactive || plan.is_active)
    .map((plan) => ({ ...plan }));

  return plans.sort((a, b) => a.price_vnd - b.price_vnd);
}

export function getMockMembershipPlanById(id: string): MembershipPlan | null {
  const found = getMockStore().plans.find((plan) => plan.id === id);
  return found ? { ...found } : null;
}

export function upsertMockMembershipPlan(input: {
  id: string | null;
  name: string;
  description: string | null;
  price_vnd: number;
  duration_type: "monthly" | "yearly";
  extra_drawers: number;
  extra_storage_bytes: number;
  access_premium_templates: boolean;
  is_active: boolean;
}): { plan?: MembershipPlan; errorCode?: "NOT_FOUND" | "PLAN_NAME_TAKEN" } {
  const store = getMockStore();
  const duplicate = store.plans.find(
    (plan) => plan.name.toLowerCase() === input.name.toLowerCase() && plan.id !== input.id,
  );
  if (duplicate) {
    return { errorCode: "PLAN_NAME_TAKEN" };
  }

  if (!input.id) {
    const newPlan: MembershipPlan = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      price_vnd: input.price_vnd,
      duration_type: input.duration_type,
      extra_drawers: input.extra_drawers,
      extra_storage_bytes: input.extra_storage_bytes,
      access_premium_templates: input.access_premium_templates,
      is_active: input.is_active,
      created_at: new Date().toISOString(),
      subscriber_count: 0,
      active_subscriber_count: 0,
    };
    store.plans.push(newPlan);
    return { plan: { ...newPlan } };
  }

  const index = store.plans.findIndex((plan) => plan.id === input.id);
  if (index === -1) {
    return { errorCode: "NOT_FOUND" };
  }

  const existing = store.plans[index];
  const updated: MembershipPlan = {
    ...existing,
    name: input.name,
    description: input.description,
    price_vnd: input.price_vnd,
    duration_type: input.duration_type,
    extra_drawers: input.extra_drawers,
    extra_storage_bytes: input.extra_storage_bytes,
    access_premium_templates: input.access_premium_templates,
    is_active: input.is_active,
  };
  store.plans[index] = updated;
  return { plan: { ...updated } };
}

export function deleteMockMembershipPlan(
  id: string,
): { ok: true } | { ok: false; errorCode: "NOT_FOUND" | "PLAN_IN_USE" } {
  const store = getMockStore();
  const index = store.plans.findIndex((plan) => plan.id === id);
  if (index === -1) {
    return { ok: false, errorCode: "NOT_FOUND" };
  }

  const target = store.plans[index];
  if ((target.subscriber_count ?? 0) > 0) {
    return { ok: false, errorCode: "PLAN_IN_USE" };
  }

  store.plans.splice(index, 1);
  return { ok: true };
}

export function getMockSubscribers(): MembershipSubscriber[] {
  return MOCK_SUBSCRIBERS.map((item) => ({ ...item }));
}
