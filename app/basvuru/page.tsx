import { BasvuruForm } from "./basvuru-form";

export default async function BasvuruSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <BasvuruForm baslangicHatasi={hata} />
    </div>
  );
}
