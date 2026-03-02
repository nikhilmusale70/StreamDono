import OverlayClient from "./OverlayClient"

export default async function OverlayPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <OverlayClient slug={slug.toLowerCase()} />
}
