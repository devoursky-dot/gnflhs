// action.tsx
import React from 'react';
import { Action, View } from './types';
import { Settings2, Trash2 } from 'lucide-react';

interface ActionEditorProps {
  action: Action;
  views: View[];
  onUpdate: (updated: Action) => void;
  onDelete: (id: string) => void;
}

export default function ActionEditor({ action, views, onUpdate, onDelete }: ActionEditorProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-white rounded-tl-3xl shadow-sm border-l border-t border-slate-200">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Settings2 className="text-rose-500" /> 액션 설정: {action.name}
            </h2>
            <p className="text-sm text-slate-500 mt-1">카드 내 버튼 클릭 시 실행될 이벤트를 정의하세요.</p>
          </div>
          <button 
            onClick={() => onDelete(action.id)}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">액션 이름</label>
            <input
              type="text"
              value={action.name}
              onChange={(e) => onUpdate({ ...action, name: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">동작 유형</label>
            <select
              value={action.type}
              onChange={(e) => onUpdate({ ...action, type: e.target.value as Action['type'] })}
              className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none bg-white"
            >
              <option value="navigate">다른 뷰로 이동 (화면 전환)</option>
              <option value="alert">알림 메시지 띄우기</option>
            </select>
          </div>

          {action.type === 'navigate' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">이동할 타겟 뷰</label>
              <select
                value={action.targetViewId || ''}
                onChange={(e) => onUpdate({ ...action, targetViewId: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none bg-white"
              >
                <option value="">뷰를 선택하세요</option>
                {views.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          {action.type === 'alert' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">알림 메시지 내용</label>
              <input
                type="text"
                value={action.message || ''}
                onChange={(e) => onUpdate({ ...action, message: e.target.value })}
                placeholder="예: 처리되었습니다."
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none bg-white"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}