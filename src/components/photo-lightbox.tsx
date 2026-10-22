import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

type PhotoLightboxProps = {
  src: string;
  alt: string;
  /** Shown under the photo, e.g. the room name. */
  caption?: string;
  /** The thumbnail the photo grows out of and shrinks back into. */
  originEl: HTMLElement | null;
  onClose: () => void;
};

// Matches the photo's own rounded-xl, so the end of the zoom lands exactly on
// the resting style and nothing jumps when the animation lets go.
const FINAL_RADIUS = 12;
// The thumbnail's rounded-lg.
const ORIGIN_RADIUS = 8;
const EASE_ARRIVE = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_LEAVE = "cubic-bezier(0.4, 0, 0.2, 1)";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isOnScreen = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
};

/**
 * Full-screen photo view. The photo zooms out of its thumbnail into the centre
 * of the screen over a blurred, dimmed backdrop, and shrinks back into the
 * thumbnail on close. Closes on any click, or Escape.
 */
export function PhotoLightbox({ src, alt, caption, originEl, onClose }: PhotoLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const hasEntered = useRef(false);
  const isClosing = useRef(false);

  // The transform and crop that make the full photo sit exactly over the
  // thumbnail: scaled to cover the thumbnail's box (as its object-cover does),
  // then clipped back down to that box.
  const thumbnailPose = useCallback(() => {
    const img = imgRef.current;
    if (!img || !originEl) return null;
    const from = originEl.getBoundingClientRect();
    const to = img.getBoundingClientRect();
    if (!from.width || !to.width || !to.height) return null;

    const scale = Math.max(from.width / to.width, from.height / to.height);
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const insetX = (to.width - from.width / scale) / 2;
    const insetY = (to.height - from.height / scale) / 2;

    return {
      transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
      clipPath: `inset(${insetY}px ${insetX}px round ${ORIGIN_RADIUS / scale}px)`,
    };
  }, [originEl]);

  const restingPose = {
    transform: "translate(0px, 0px) scale(1)",
    clipPath: `inset(0px 0px round ${FINAL_RADIUS}px)`,
  };

  const enter = useCallback(() => {
    const img = imgRef.current;
    if (!img || hasEntered.current) return;
    hasEntered.current = true;
    img.style.visibility = "visible";

    const reduced = prefersReducedMotion();
    const from = reduced ? null : thumbnailPose();

    backdropRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: reduced ? 200 : 320,
      easing: "ease-out",
    });

    if (from) {
      img.animate([from, restingPose], { duration: 480, easing: EASE_ARRIVE });
    } else {
      img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    }

    captionRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 240,
      delay: reduced ? 0 : 240,
      easing: "ease-out",
      fill: "backwards",
    });
    // restingPose is a constant object literal; thumbnailPose covers originEl.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnailPose]);

  const close = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;

    const img = imgRef.current;
    const reduced = prefersReducedMotion();
    const to = !reduced && originEl && isOnScreen(originEl) ? thumbnailPose() : null;
    const options = { easing: EASE_LEAVE, fill: "forwards" as const };

    // Exit is quicker than the entrance.
    const animations = [
      backdropRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { ...options, duration: 240 }),
      captionRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { ...options, duration: 120 }),
      img &&
        (to
          ? img.animate([restingPose, to], { ...options, duration: 320 })
          : img.animate(
              [
                { opacity: 1, transform: "scale(1)" },
                { opacity: 0, transform: "scale(0.96)" },
              ],
              { ...options, duration: 180 },
            )),
    ].filter((a): a is Animation => Boolean(a));

    void Promise.all(animations.map((a) => a.finished))
      .catch(() => undefined)
      .then(() => {
        onClose();
        // Give keyboard users their place back on the thumbnail they opened.
        originEl?.focus({ preventScroll: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originEl, onClose, thumbnailPose]);

  // A cached photo can finish loading before the onLoad handler is attached.
  useLayoutEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) enter();
  }, [enter]);

  // Lock page scroll, take focus, and listen for Escape while open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus({ preventScroll: true });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [close]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      tabIndex={-1}
      onClick={close}
      className="fixed inset-0 z-[60] cursor-zoom-out outline-none"
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-gray-950/60 backdrop-blur-md"
      />
      <div className="relative flex h-full flex-col items-center justify-center gap-4 p-4 sm:p-10">
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={enter}
          onError={onClose}
          // Hidden until its final box is known, so the zoom starts from the
          // thumbnail instead of flashing at full size for a frame.
          style={{ visibility: "hidden" }}
          className="h-auto max-h-[80vh] w-auto max-w-full rounded-xl object-contain"
        />
        {caption && (
          <p ref={captionRef} className="text-sm font-medium text-white/90">
            {caption}
          </p>
        )}
        <span className="sr-only">Click anywhere or press Escape to close.</span>
      </div>
    </div>
  );
}
