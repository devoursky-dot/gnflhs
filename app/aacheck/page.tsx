"use client";

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';
import { 
  FolderOpen, FileText, Copy, Check, Loader2, RefreshCw, AlertCircle 
} from "lucide-react";

// 사용할 버킷 이름
const BUCKET_NAME = "photos";

// 파일 데이터 타입 정의
interface StorageFile {
  id: string;
  name: string;
  url: string;
  created_at: string;
  metadata?: any;
}

export default function StorageViewerPage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ==========================================
  // 🚀 스토리지 파일 목록 불러오기 함수
  // ==========================================
  const fetchStorageFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. 버킷에서 파일 리스트 가져오기
      const { data: fileList, error: listError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list("", {
          limit: 100, // 최대 100개
          offset: 0,
          sortBy: { column: "created_at", order: "desc" }, // 최신순 정렬
        });

      if (listError) throw listError;

      if (!fileList || fileList.length === 0) {
        setFiles([]);
        return;
      }

      // 2. 임시 폴더 파일 제외하고 Public URL 맵핑 (타입 강제 지정 및 안전한 처리)
      const filesWithUrls: StorageFile[] = fileList
        .filter(file => file.name !== ".emptyFolderPlaceholder")
        .map((file): StorageFile => {
          const { data: { publicUrl } } = supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(file.name);

          return {
            id: file.id ? String(file.id) : file.name, // id가 없으면 name을 id로 사용
            name: file.name,
            created_at: file.created_at || new Date().toISOString(), // 생성일이 없으면 현재 시간
            metadata: file.metadata || null,
            url: publicUrl,
          };
        });

      // 3. 상태 업데이트 (이제 타입 에러가 발생하지 않습니다)
      setFiles(filesWithUrls);

    } catch (err: any) {
      console.error("파일 로딩 에러:", err);
      setError(err.message || "파일 목록을 불러오는 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==========================================
  // 🔄 컴포넌트 마운트 시 최초 1회 실행
  // ==========================================
  useEffect(() => {
    fetchStorageFiles();
  }, [fetchStorageFiles]);

  // ==========================================
  // 📋 주소 클립보드 복사 함수
  // ==========================================
  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000); // 2초 후 V체크 해제
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* --- 헤더 섹션 --- */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <FolderOpen className="text-indigo-500 w-7 h-7" />
              스토리지 갤러리
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              <span className="font-bold text-indigo-500">'{BUCKET_NAME}'</span> 버킷에 업로드된 사진과 파일들입니다.
            </p>
          </div>
          
          <button 
            onClick={fetchStorageFiles} 
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </header>

        {/* --- 에러 알림창 --- */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 font-medium text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* --- 파일 리스트 섹션 (그리드 레이아웃) --- */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium text-sm">파일을 불러오는 중입니다...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200 border-dashed text-slate-400">
            <FolderOpen className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">업로드된 파일이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {files.map((file) => {
              // 이미지 파일인지 확인
              const isImage = file.metadata?.mimetype?.startsWith('image/') || 
                              /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);

              return (
                <div key={file.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                  {/* 썸네일 영역 */}
                  <div className="h-40 bg-slate-100 flex items-center justify-center overflow-hidden relative border-b border-slate-100">
                    {isImage ? (
                      <img 
                        src={file.url} 
                        alt={file.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <FileText className="w-12 h-12 text-slate-300" />
                    )}
                  </div>

                  {/* 정보 및 버튼 영역 */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-bold text-slate-800 truncate mb-1" title={file.name}>
                      {file.name}
                    </h3>
                    
                    <p className="text-[10px] text-slate-500 font-mono truncate bg-slate-50 p-1.5 rounded border border-slate-100 mb-4" title={file.url}>
                      {file.url}
                    </p>

                    <div className="mt-auto pt-2 border-t border-slate-100">
                      <button
                        onClick={() => copyToClipboard(file.url, file.id)}
                        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                          copiedId === file.id 
                            ? "bg-emerald-500 text-white" 
                            : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        }`}
                      >
                        {copiedId === file.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedId === file.id ? "주소 복사됨!" : "이미지 주소 복사"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}