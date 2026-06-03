import { Suspense } from "react";
import ContentStudio from "@/components/ContentStudio";

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="size-full flex items-center justify-center">Loading studio...</div>}>
      <ContentStudio />
    </Suspense>
  );
}
