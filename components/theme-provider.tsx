"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

// Suppress React 19 false-positive warning for next-themes inline script in development
if (process.env.NODE_ENV === "development") {
  const consoleErrorWithFlag = console.error as unknown as { __nextThemesPatched?: boolean };
  if (!consoleErrorWithFlag.__nextThemesPatched) {
    const originalError = console.error;
    const patchedError = (...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("Encountered a script tag while rendering React component")) {
        return;
      }
      originalError(...args);
    };
    (patchedError as unknown as { __nextThemesPatched?: boolean }).__nextThemesPatched = true;
    console.error = patchedError;
  }
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
