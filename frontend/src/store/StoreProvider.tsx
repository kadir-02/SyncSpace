"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./index";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // One store per browser session; created lazily so it is never shared between requests.
  const [store] = useState(makeStore);

  return <Provider store={store}>{children}</Provider>;
}
