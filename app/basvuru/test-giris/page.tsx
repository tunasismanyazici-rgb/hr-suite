import { notFound } from "next/navigation";
import { TestGirisForm } from "./test-giris-form";

export default function TestGirisPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <TestGirisForm />
    </div>
  );
}
