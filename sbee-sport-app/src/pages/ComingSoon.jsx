import { Construction } from 'lucide-react'

export default function ComingSoon({ title = "Module en développement" }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#fffbeb] flex items-center justify-center mb-4">
        <Construction size={24} className="text-[#f59e0b]" />
      </div>
      <h2 className="text-[18px] font-semibold text-[#1e293b] mb-1">{title}</h2>
      <p className="text-[13px] text-[#94a3b8]">Ce module est en cours de développement.</p>
    </div>
  )
}
