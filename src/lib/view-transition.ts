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

export function navigateWithViewTransition(navigate: () => void, types: string[]) {
  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    navigate();
    return;
  }

  const previousUrl = window.location.href;
  document.startViewTransition({
    types,
    update: async () => {
      navigate();
      await waitForNavigation(previousUrl);
    },
  });
}
