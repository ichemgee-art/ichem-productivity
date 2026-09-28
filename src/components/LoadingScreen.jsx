import { LoaderCircle } from 'lucide-react'

export default function LoadingScreen({ label = 'جاري تجهيز النظام...' }) {
  return (
    <div className="loading-screen">
      <div className="loading-card">
        <LoaderCircle className="spin-icon" size={22} />
        <span>{label}</span>
      </div>
    </div>
  )
}
