"use client";

import { ReactNode } from "react";

export default function PoolTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="page-slide-in">
      {children}
    </div>
  );
}
