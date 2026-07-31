import { ApiKeysPage } from '@/components/settings/ApiKeysPage'
import { PrometheusSettings } from '@/components/settings/PrometheusSettings'

export default function ApiKeysSettingsPage() {
  return (
    <div className="space-y-6">
      <ApiKeysPage />
      <PrometheusSettings />
    </div>
  )
}
