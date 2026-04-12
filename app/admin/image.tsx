// 파일 경로: app/admin/image.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from '@/app/supabaseClient';
import { Loader2, Image as ImageIcon, Copy, Check, X, FolderOpen, ClipboardPaste } from "lucide-react";

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';
interface UploadQueueItem {
  id: string;
  file: File;
  status: UploadStatus;
  url?: string;
  error?: string;
}

export default function ImageUploadModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isAllCopied, setIsAllCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleSelection = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadQueueItem[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      status: 'pending'
    }));

    setQueue(prev => [...newItems, ...prev]);
  };

  const copyAllToClipboard = () => {
    const successfulItems = queue.filter(item => item.status === 'success' && item.url);
    const tsvContent = successfulItems.map(item => `${item.file.name}\t${item.url}`).join('\n');
    
    navigator.clipboard.writeText(tsvContent);
    setIsAllCopied(true);
    setTimeout(() => setIsAllCopied(false), 2000);
  };

  useEffect(() => {
    const processQueue = async () => {
      if (isProcessing) return;
      const nextItem = queue.find(item => item.status === 'pending');
      if (!nextItem) return;

      setIsProcessing(true);
      
      setQueue(prev => prev.map(item => item.id === nextItem.id ? { ...item, status: 'uploading' } : item));

      const file = nextItem.file;
      
      // 한글, 영문, 숫자, 마침표(.), 하이픈(-), 언더바(_)만 허용
      const safeOriginalName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, ''); 
      const fileName = `${Date.now()}_${safeOriginalName}`; 

      try {
        const { data, error } = await supabase.storage.from('photos').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
        
        setQueue(prev => prev.map(item => 
          item.id === nextItem.id ? { ...item, status: 'success', url: publicUrl } : item
        ));
      } catch (err: any) {
        setQueue(prev => prev.map(item => 
          item.id === nextItem.id ? { ...item, status: 'error', error: err.message } : item
        ));
      } finally {
        setIsProcessing(false);
      }
    };

    processQueue();
  }, [queue, isProcessing]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[80vh]">
        <div className="p-5 border-b dark:border-zinc-800 flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-500" /> 이미지 대량 업로드</h3>
            <p className="text-xs text-zinc-500">업로드 완료 후 '전체 복사'를 눌러 시트에 붙여넣으세요.</p>
          </div>
          <div className="flex items-center gap-2">
            {queue.some(i => i.status === 'success') && (
              <button 
                onClick={copyAllToClipboard}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isAllCopied ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
              >
                {isAllCopied ? <Check className="w-3.5 h-3.5" /> : <ClipboardPaste className="w-3.5 h-3.5" />}
                {isAllCopied ? '복사됨!' : '전체 복사 (시트용)'}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-emerald-500/20 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/10 transition-all group"
            >
              <ImageIcon className="w-8 h-8 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">파일 개별 선택</span>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => { handleSelection(e.target.files); e.target.value = ""; }} accept="image/*" />
            </button>

            <button 
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessing}
              className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-blue-500/20 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/10 transition-all group"
            >
              <FolderOpen className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">폴더 통째로 선택</span>
              {/* @ts-ignore */}
              <input type="file" ref={folderInputRef} className="hidden" webkitdirectory="" directory="" onChange={(e) => { handleSelection(e.target.files); e.target.value = ""; }} />
            </button>
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">파일을 순차적으로 처리하고 있습니다...</span>
            </div>
          )}

          <div className="space-y-2">
            {queue.map((item, idx) => (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${item.status === 'uploading' ? 'bg-emerald-50/50 border-emerald-200 animate-pulse' : 'bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700'}`}>
                <div className="w-12 h-12 rounded bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0 border dark:border-zinc-600">
                  {item.url ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      {item.status === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold truncate dark:text-zinc-200">{item.file.name}</p>
                    {item.status === 'success' && <Check className="w-3 h-3 text-emerald-500" />}
                    {item.status === 'error' && <span className="text-[10px] text-red-500 font-bold" title={item.error}>실패</span>}
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate font-mono mt-0.5">
                    {item.url || (item.status === 'uploading' ? '업로드 중...' : '대기 중')}
                  </p>
                </div>
                {item.url && (
                  <button 
                    onClick={() => copyToClipboard(item.url!, idx)}
                    className="px-3 py-1.5 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 rounded-md border border-emerald-200 dark:border-emerald-900/50 transition-all flex items-center gap-1.5 text-[11px] font-bold text-emerald-600"
                  >
                    {copiedIndex === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    주소 복사
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
