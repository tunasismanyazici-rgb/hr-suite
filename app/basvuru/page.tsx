import { BasvuruForm } from "./basvuru-form";

export default async function BasvuruPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <BasvuruForm initialError={error} />
    </div>
  );
}
