import { describe, expect, it } from "vitest";
import { buildProfileActivation, type ProfileActivationInput } from "./activation";

const emptyProfile: ProfileActivationInput = {
  emailVerified: false,
  hasProfileBasics: false,
  activeItems: 0,
  sentProposals: 0,
  outgoingPending: 0,
  completedSwaps: 0,
  incomingPending: 0,
  acceptedSwaps: 0,
};

describe("buildProfileActivation", () => {
  it("guides a new user from email verification", () => {
    const activation = buildProfileActivation(emptyProfile);

    expect(activation.progress).toBe(0);
    expect(activation.nextStep?.id).toBe("verify");
    expect(activation.nextAction.href).toBe("#verify-email");
  });

  it("keeps the journey visible after the first listing", () => {
    const activation = buildProfileActivation({
      ...emptyProfile,
      emailVerified: true,
      hasProfileBasics: true,
      activeItems: 1,
    });

    expect(activation.progress).toBe(60);
    expect(activation.nextStep?.id).toBe("proposal");
    expect(activation.complete).toBe(false);
  });

  it("offers to resume a paused listing instead of creating a duplicate", () => {
    const activation = buildProfileActivation({
      ...emptyProfile,
      emailVerified: true,
      hasProfileBasics: true,
      pausedItems: 1,
    });

    expect(activation.nextStep?.id).toBe("proposal");
    expect(activation.nextAction.href).toBe("/my-items?status=paused");
  });

  it("prioritizes a proposal that needs the user's answer", () => {
    const activation = buildProfileActivation({ ...emptyProfile, incomingPending: 2 });

    expect(activation.nextAction.kind).toBe("urgent");
    expect(activation.nextAction.href).toBe("/exchange?tab=incoming");
  });

  it("offers a new exchange after the whole route is complete", () => {
    const activation = buildProfileActivation({
      emailVerified: true,
      hasProfileBasics: true,
      activeItems: 1,
      sentProposals: 1,
      outgoingPending: 0,
      completedSwaps: 1,
      incomingPending: 0,
      acceptedSwaps: 0,
    });

    expect(activation.complete).toBe(true);
    expect(activation.progress).toBe(100);
    expect(activation.nextAction.kind).toBe("complete");
  });

  it("recognizes a completed incoming exchange as a finished route", () => {
    const activation = buildProfileActivation({
      ...emptyProfile,
      emailVerified: true,
      hasProfileBasics: true,
      completedSwaps: 1,
    });

    expect(activation.complete).toBe(true);
    expect(activation.progress).toBe(100);
  });

  it("offers another option when previous proposals are no longer pending", () => {
    const activation = buildProfileActivation({
      ...emptyProfile,
      emailVerified: true,
      hasProfileBasics: true,
      sentProposals: 1,
    });

    expect(activation.nextStep?.id).toBe("completed");
    expect(activation.nextAction.href).toBe("/swipe");
    expect(activation.nextAction.label).toBe("Найти другой вариант");
  });
});
