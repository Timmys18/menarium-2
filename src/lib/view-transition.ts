"use client";

function nextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

function waitForNavigation(previousUrl: string) {
  return new Promise<void>((resolve) => {
    const deadline = performance.now() + 10_000;
    const check = () => {
      if (window.location.href !== previousUrl || performance.now() >= deadline) {
        void nextPaint().then(resolve);
        return;
      }
      window.requestAnimationFrame(check);
    };
    check();
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

  await nextPaint();
  const previousUrl = window.location.href;
  document.documentElement.dataset.viewTransitionActive = "true";

  const transition = document.startViewTransition({
    types,
    update: async () => {
      navigate();
      await waitForNavigation(previousUrl);
    },
  });

  try {
    await transition.finished;
    await nextPaint();
  } finally {
    delete document.documentElement.dataset.viewTransitionActive;
  }
}
