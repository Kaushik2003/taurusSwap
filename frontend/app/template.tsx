"use client";

import { ReactNode } from "react";

export default function RootTemplate({ children }: { children: ReactNode }) {
  return <div className="page-slide-in">{children}</div>;
}
