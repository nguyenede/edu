let scrollLockCount = 0;

type ScrollLockSnapshot = {
  rootOverflow: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
};

let snapshot: ScrollLockSnapshot | null = null;

export const lockPageScroll = () => {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  const root = document.documentElement;
  const body = document.body;

  scrollLockCount += 1;

  if (scrollLockCount === 1) {
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    snapshot = {
      rootOverflow: root.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
    };

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  return () => {
    if (scrollLockCount === 0) {
      return;
    }

    scrollLockCount -= 1;

    if (scrollLockCount > 0 || !snapshot) {
      return;
    }

    root.style.overflow = snapshot.rootOverflow;
    body.style.overflow = snapshot.bodyOverflow;
    body.style.paddingRight = snapshot.bodyPaddingRight;
    snapshot = null;
  };
};
