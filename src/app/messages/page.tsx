import { Mail } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center gap-2">
        <Mail size={20} className="text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">쪽지</h1>
      </div>
      <div className="text-center py-24 text-gray-400">
        <Mail size={40} className="mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium">쪽지 기능 준비 중</p>
        <p className="text-xs mt-1 opacity-70">Phase 2에서 오픈 예정입니다</p>
      </div>
    </div>
  );
}
