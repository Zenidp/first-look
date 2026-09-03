"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import Logo from "@/components/shared/logo";
import { headerCta, primaryNav } from "@/config/navigation";

/**
 * Sticky header and mobile drawer.
 *
 * This is the only client component in the site chrome. The layouts that
 * render it stay Server Components, which is the difference between shipping
 * a navigation bar's worth of JavaScript and shipping the whole page's.
 *
 * The drawer is a full-screen overlay rather than a dropdown, and it does the
 * three things a dialog owes a keyboard user: it traps focus while open, it
 * closes on Escape, and it puts focus back on the button that opened it.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Shrink after a small scroll. Reading scrollY in a passive listener rather
  // than an IntersectionObserver keeps this to one boolean of state.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Focus management and the trap, both scoped to while the drawer is open.
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    // Captured here rather than read in the cleanup: by the time cleanup runs
    // the ref may already point at a different node, or none.
    const toggle = toggleRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panel?.querySelector<HTMLElement>("a, button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // The page behind a full-screen overlay must not scroll under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      (toggle ?? previouslyFocused)?.focus();
    };
  }, [open]);

  const isActive = (href: string) => pathname === href;

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-paper/85 backdrop-blur-md transition-[border-color,box-shadow] ${
        scrolled ? "border-line shadow-raised" : "border-transparent"
      }`}
    >
      <div
        className={`mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-5 transition-[height] duration-200 sm:px-8 ${
          scrolled ? "h-14" : "h-16 sm:h-20"
        }`}
      >
        <Logo />

        <nav aria-label="Utama" className="hidden items-center gap-1 md:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-control px-3 py-2 text-step--1 no-underline transition-colors ${
                isActive(item.href)
                  ? "text-ink"
                  : "text-ink-soft hover:bg-surface hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={headerCta.href}
            className="hidden rounded-control bg-ink px-4 py-2.5 text-step--1 font-medium text-paper no-underline transition-colors hover:bg-accent md:inline-flex"
          >
            {headerCta.label}
          </Link>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-utama"
            className="-mr-2 flex size-11 items-center justify-center rounded-control text-ink md:hidden"
          >
            <span className="sr-only">{open ? "Tutup menu" : "Buka menu"}</span>
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div
          ref={panelRef}
          id="menu-utama"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-x-0 top-14 bottom-0 z-50 overflow-y-auto border-t border-line bg-paper px-5 pt-6 pb-10 md:hidden"
        >
          {/*
           * The drawer closes on the click that navigates, not in an effect
           * watching the path. Reacting to the route after the fact means a
           * second render pass, and leaves the overlay covering the page it
           * just asked for during the gap.
           */}
          <nav aria-label="Utama (ponsel)" className="flex flex-col">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className="border-b border-line py-4 no-underline"
              >
                <span className="block font-display text-step-1 text-ink">
                  {item.label}
                </span>
                {item.blurb && (
                  <span className="mt-0.5 block text-step--1 text-ink-faint">
                    {item.blurb}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <Link
            href={headerCta.href}
            onClick={() => setOpen(false)}
            className="mt-6 flex min-h-11 items-center justify-center rounded-control bg-ink px-5 text-step--1 font-medium text-paper no-underline"
          >
            {headerCta.label}
          </Link>
        </div>
      )}
    </header>
  );
}
