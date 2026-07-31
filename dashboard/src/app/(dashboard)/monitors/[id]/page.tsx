import { MonitorDetailPage } from '@/components/monitors/MonitorDetailPage'

export default async function MonitorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MonitorDetailPage id={id} />
}
