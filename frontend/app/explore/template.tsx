"use client";

import { ReactNode } from "react";

export default function ExploreTemplate({ children }: { children: ReactNode }) {
  return <div className="page-slide-in">{children}</div>;
}
