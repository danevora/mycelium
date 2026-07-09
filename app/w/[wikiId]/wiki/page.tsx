import { redirect } from "next/navigation";

export default async function WikiIndexRedirect({
  params,
}: {
  params: Promise<{ wikiId: string }>;
}) {
  const { wikiId } = await params;
  redirect(`/w/${wikiId}/wiki/index`);
}
