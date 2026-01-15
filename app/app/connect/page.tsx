import { Suspense } from "react";
import ConnectClient from "./ConnectClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ConnectClient />
    </Suspense>
  );
}
