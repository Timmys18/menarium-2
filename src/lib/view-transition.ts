"use client";

function waitForNavigation(previousUrl: string) {
  return new Promise<void>((resolve) => {
    const deadline = performance.now() + 4_000;
    const check = () => {
      if (window.location.href !== previousUrl || performance.now() >= deadline) {
        window.setTimeout(resolve, 50);
        return;
      }
      window.setTimeout(check, 16);
    };
    check();
  });
}

function waitForCommittedUi() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export async function navigateWithViewTransition(navigate: () => void, types: string[]) {
  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    navigate();
    return;
  }

  // Dialogs and sheets may have been closed in the same event. Let React
  // commit that state before the browser captures the outgoing screen.
  await waitForCommittedUi();
  const previousUrl = window.location.href;
  const transition = document.startViewTransition({
    types,
    update: async () => {
      navigate();
      await waitForNavigation(previousUrl);
    },
  });

  // Keep state updates that follow navigation from invalidating the browser's
  // snapshot while the new route is still being committed.
  await transition.finished;
}
