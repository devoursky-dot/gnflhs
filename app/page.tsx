// 파일 경로: app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, LayoutGrid, Star, ArrowRight, LogIn, LogOut, Mail, Lock, ShieldCheck, User as UserIcon, X, CheckCircle2, Copy, Database, Loader2 } from 'lucide-react';
import { IconMap } from './design/picker';
import { useAuth } from './useAuth';
import { supabase } from './supabaseClient';

export default function MainAppLauncher() {
  const {
    user,
    profile,
    loading,
    authError,
    isAuthorized,
    isAdmin,
    handlePasswordLogin,
    handleLogout,
    handlePasswordChange,
  } = useAuth();

  const [apps, setApps] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // ── 로그인 폼 상태 ──
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // ── 권한 모달 상태 ──
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedAppForAccess, setSelectedAppForAccess] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [accessIsPublic, setAccessIsPublic] = useState(true);
  const [accessAllowedUsers, setAccessAllowedUsers] = useState<string[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // ── 비밀번호 변경 모달 상태 ──
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  // ── 앱 복제 관련 상태 ──
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloningApp, setCloningApp] = useState<any>(null);
  const [tableMappings, setTableMappings] = useState<Record<string, { action: 'reuse' | 'clone', newName: string }>>({});
  const [isCloning, setIsCloning] = useState(false);

  // ── 앱 목록 로드 ──
  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('id, name, created_at, app_config')
        .order('id', { ascending: false });
      if (error) throw error;
      if (data) {
        // 'engine_version'이 명시된 완전 독립 앱들만 메인 화면에 표시
        const independentApps = data.filter((app: any) => app.app_config?.engine_version);
        setApps(independentApps);
      }
    } catch (error) {
      console.error('앱 목록 로드 실패:', error);
    }
  };

  useEffect(() => {
    if (isAuthorized) fetchApps();
  }, [isAuthorized]);

  // ── 권한 모달 핸들러 ──
  const openAccessModal = async (e: React.MouseEvent, app: any) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedAppForAccess(app);
    const config = app.app_config || {};
    setAccessIsPublic(config.isPublic !== false);
    setAccessAllowedUsers(config.allowedUsers || []);
    setIsAccessModalOpen(true);
    setUserSearchTerm('');

    if (allUsers.length === 0) {
      const { data: tData } = await supabase.from('teachers').select('users, name');
      const { data: sData } = await supabase.from('students').select('students, name');
      const combined = [
        ...(tData || []).map((t: any) => ({ users: t.users, name: t.name, type: 'teacher' })),
        ...(sData || []).map((s: any) => ({ users: s.students, name: s.name, type: 'student' }))
      ];
      setAllUsers(combined);
    }
  };

  const handleSaveAccess = async () => {
    if (!isAdmin || !selectedAppForAccess) return;
    setIsSavingAccess(true);
    try {
      // 보안 설정 값 준비
      const securityPatch = {
        isPublic: accessIsPublic,
        allowedUsers: accessIsPublic ? [] : accessAllowedUsers
      };

      // 현재 DB에서 최신 app_config와 draft_config를 조회
      const { data: freshApp, error: fetchErr } = await supabase
        .from('apps')
        .select('app_config, draft_config')
        .eq('id', selectedAppForAccess.id)
        .single();
      if (fetchErr) throw fetchErr;

      // app_config와 draft_config 모두에 보안 설정을 동기화
      const updatedAppConfig = { ...(freshApp.app_config || {}), ...securityPatch };
      const updatedDraftConfig = { ...(freshApp.draft_config || {}), ...securityPatch };

      const { error } = await supabase
        .from('apps')
        .update({ app_config: updatedAppConfig, draft_config: updatedDraftConfig })
        .eq('id', selectedAppForAccess.id);
      if (error) throw error;
      alert('앱 접근 권한이 업데이트되었습니다.');
      setIsAccessModalOpen(false);
      fetchApps();
    } catch (err: any) {
      alert(`오류 발생: ${err.message}`);
    } finally {
      setIsSavingAccess(false);
    }
  };

  const toggleTeacherAccess = (email: string) => {
    setAccessAllowedUsers(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  // ── 비밀번호 변경 핸들러 ──
  const onPasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    setIsSavingPwd(true);

    const result = await handlePasswordChange(pwdCurrent, pwdNew, pwdConfirm);

    if (result.success) {
      setPwdSuccess('비밀번호가 성공적으로 변경되었습니다.');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPwdCurrent(''); setPwdNew(''); setPwdConfirm('');
        setPwdSuccess('');
      }, 1500);
    } else {
      setPwdError(result.error || '');
    }
    setIsSavingPwd(false);
  };

  /**
   * 앱 설정 내에서 사용 중인 테이블 목록 추출
   */
  const extractTablesFromApp = (config: any) => {
    const tables = new Set<string>();
    config.views?.forEach((v: any) => { if (v.tableName) tables.add(v.tableName); });
    config.actions?.forEach((a: any) => {
      if (a.insertTableName) tables.add(a.insertTableName);
      if (a.updateTableName) tables.add(a.updateTableName);
      if (a.deleteTableName) tables.add(a.deleteTableName);
    });
    return Array.from(tables);
  };

  /**
   * 앱 복제 시작
   */
  const startCloneApp = (e: React.MouseEvent, app: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin) return;
    
    const config = app.app_config || { views: [], actions: [] };
    const tables = extractTablesFromApp(config);
    
    const initialMappings: Record<string, { action: 'reuse' | 'clone', newName: string }> = {};
    tables.forEach(t => {
      initialMappings[t] = { action: 'reuse', newName: `${t}_copy` };
    });
    
    setCloningApp(app);
    setTableMappings(initialMappings);
    setIsCloneModalOpen(true);
  };

  /**
   * 앱 및 테이블 복제 실행
   */
  const handleCloneAppWithTables = async () => {
    if (!isAdmin || !cloningApp) return;
    setIsCloning(true);
    try {
      const config = JSON.parse(JSON.stringify(cloningApp.app_config || { views: [], actions: [] }));
      let configStr = JSON.stringify(config);

      // 1단계: 테이블 복제
      for (const [oldName, mapping] of Object.entries(tableMappings)) {
        if (mapping.action === 'clone') {
          const { error: rpcErr } = await supabase.rpc('clone_table', {
            source_table: oldName,
            target_table: mapping.newName,
            copy_data: true
          });
          if (rpcErr) throw new Error(`[${oldName}] 테이블 복제 실패: ${rpcErr.message}`);
          
          const oldNameRegex = new RegExp(`"${oldName}"`, 'g');
          configStr = configStr.replace(oldNameRegex, `"${mapping.newName}"`);
        }
      }

      const newConfig = JSON.parse(configStr);
      
      // 2단계: 신규 앱 삽입
      const { error: insErr } = await supabase.from('apps').insert([{
        name: `${cloningApp.name} (복제본)`,
        app_config: newConfig,
        draft_config: newConfig
      }]);

      if (insErr) throw insErr;

      alert('앱 복제가 완료되었습니다!');
      setIsCloneModalOpen(false);
      fetchApps(); // 목록 새로고침

    } catch (error: any) {
      alert(`복제 실패: ${error.message}`);
    } finally {
      setIsCloning(false);
    }
  };

  // ── 로그인 핸들러 ──
  const onLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handlePasswordLogin(loginId, loginPass);
  };

  // ── 앱 필터링 ──
  const filteredApps = apps.filter(app => {
    if (!app.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (isAdmin) return true;
    const config = app.app_config || {};
    const isPublic = config.isPublic !== false;
    if (isPublic) return true;
    return config.allowedUsers && config.allowedUsers.includes(user?.id || user?.email);
  });

  // ── 로그인 전 화면 ──
  if (!user || !profile || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200 mb-6">
              <ShieldCheck className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">경남외고 통합 관리</h1>
            <p className="text-slate-500 font-bold mt-2 italic">Teacher Access Only</p>
          </div>

          {user && profile && !isAuthorized ? (
            <div className="text-center space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-100 text-amber-700 text-sm font-bold rounded-2xl">
                &apos;{profile.name}&apos;님은 등록된 교사/관리자 계정이 아닙니다. 접근 권한이 없습니다.
              </div>
              <button onClick={handleLogout} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2">
                <LogOut size={18} /> 다른 계정으로 로그인
              </button>
            </div>
          ) : (
            <>
              {authError && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-2xl">{authError}</div>}
              <form onSubmit={onLoginSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="아이디 (이메일 혹은 학번+이름)" value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-slate-900" style={{ color: '#0f172a' }} required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="password" placeholder="비밀번호" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-slate-900" style={{ color: '#0f172a' }} required />
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black shadow-lg transition-all active:scale-95">로그인</button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── 로그인 완료 상태 UI ──
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">

      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <LayoutGrid className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">경남외고</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${isAdmin ? 'text-indigo-600 bg-indigo-50' : profile?.role === 'student' ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50'}`}>
                  <UserIcon size={10} /> {isAdmin ? 'Super Admin' : profile?.role === 'student' ? 'Student' : 'Teacher'}
                </span>
                <span className="text-[11px] font-bold text-slate-400">{profile?.name} ({user?.id || user?.email})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-black transition-all" title="비밀번호 변경">
              <Lock size={18} /> <span className="hidden sm:inline">비밀번호 변경</span>
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-black transition-all" title="로그아웃">
              <LogOut size={18} /> <span className="hidden sm:inline">로그아웃</span>
            </button>
            <Link
              href="/design"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 
                ${isAdmin
                  ? 'bg-slate-900 hover:bg-indigo-600 text-white opacity-100'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed grayscale'}`}
              onClick={(e) => !isAdmin && e.preventDefault()}
            >
              <Plus size={18} /> 빌더 열기
            </Link>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 flex flex-col gap-8 h-[calc(100vh-80px)]">
        <div className="relative shrink-0 z-10">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
          <input
            type="text"
            placeholder="실행할 앱 이름을 검색하세요..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-lg font-bold text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-slate-300"
          />
        </div>

        <div className="flex-1 overflow-y-auto pb-10 scrollbar-hide">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p>앱 목록을 불러오는 중입니다...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 space-y-4 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Search size={48} className="text-slate-200" />
              <p className="font-bold text-lg text-slate-500">
                {searchQuery ? '검색된 앱이 없습니다.' : '아직 생성된 앱이 없습니다.'}
              </p>
              {!searchQuery && (
                <Link href="/design" className="text-indigo-500 font-bold hover:underline">
                  우측 상단 버튼을 눌러 첫 번째 앱을 만들어보세요!
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredApps.map((app) => {
                const iconName = app.app_config?.icon;
                const AppIcon = iconName && IconMap && IconMap[iconName] ? IconMap[iconName] : Star;

                return (
                  <Link
                    key={app.id}
                    href={`/preview/${app.id}`}
                    className="group bg-white border border-slate-200 rounded-3xl p-6 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-[2] duration-500 ease-out z-0"></div>

                      {/* 배포 상태 표시 배지 */}
                      {app.app_config && (
                        <div className="absolute top-4 left-4 z-20 flex gap-1.5">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-full shadow-lg shadow-emerald-200 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                            LIVE
                          </span>
                          {/* 격리 버전 표시 */}
                          {app.app_config.engine_version && (
                            <span className="px-2 py-1 bg-slate-800 text-white text-[9px] font-black rounded-full shadow-lg">
                              {app.app_config.engine_version.toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}

                      {isAdmin && (
                        <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => startCloneApp(e, app)}
                            className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                            title="앱 복제하기"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={(e) => openAccessModal(e, app)}
                            className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                            title="접근 권한 설정"
                          >
                            <Lock size={16} />
                          </button>
                        </div>
                      )}

                    <div className="relative z-10 flex items-start gap-4 mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm shrink-0">
                        <AppIcon size={28} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-900 transition-colors line-clamp-2">
                          {app.name}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                          App ID: {app.id}
                        </p>
                      </div>
                    </div>

                    <div className="relative z-10 mt-auto flex items-center justify-between pt-4 border-t border-slate-100 group-hover:border-indigo-100 transition-colors">
                      <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-500">
                        {new Date(app.app_config?.deployed_at || app.created_at).toLocaleDateString()} {app.app_config?.deployed_at ? '최근 배포' : '생성됨'}
                      </span>
                      <span className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ArrowRight size={16} strokeWidth={3} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 권한 관리 모달 */}
      {isAccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-white shrink-0">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Lock className="text-indigo-600" /> 접근 권한 설정
              </h3>
              <button onClick={() => setIsAccessModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] bg-slate-50 flex flex-col gap-6">
              <div>
                <label className="text-sm font-black text-slate-700 mb-2 block">권한 범위</label>
                <div className="flex bg-slate-200/50 p-1 rounded-2xl">
                  <button onClick={() => setAccessIsPublic(true)} className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${accessIsPublic ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                    🚀 전체 공개 (Public)
                  </button>
                  <button onClick={() => setAccessIsPublic(false)} className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${!accessIsPublic ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                    🔒 제한됨 (Private)
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-2 ml-1">
                  {accessIsPublic ? '모든 등록된 교사가 앱 목록에서 보고 자유롭게 접근할 수 있습니다.' : '오직 선택된 교사들만 앱 목록에서 볼 수 있고 접속이 허용됩니다.'}
                </p>
              </div>

              {!accessIsPublic && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex-1 flex flex-col min-h-0">
                  <label className="text-sm font-black text-slate-700 mb-2 block">접속을 허용할 사용자 ({accessAllowedUsers.length}명 선택됨)</label>
                  <div className="relative mb-3 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="이름 또는 아이디 검색..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700"
                    />
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-y-auto max-h-[30vh]">
                    {allUsers
                      .filter((u: any) => u.name.includes(userSearchTerm) || u.users.includes(userSearchTerm))
                      .map((u: any) => {
                        const isSelected = accessAllowedUsers.includes(u.users);
                        return (
                          <div
                            key={u.users}
                            onClick={() => toggleTeacherAccess(u.users)}
                            className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-sm flex gap-2 items-center">
                                {u.name} 
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${u.type === 'student' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                  {u.type === 'student' ? 'Student' : 'Teacher'}
                                </span>
                              </span>
                              <span className="font-bold text-slate-400 text-xs">{u.users}</span>
                            </div>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all border-2 ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-sm text-white' : 'border-slate-200 text-transparent'}`}>
                              <CheckCircle2 size={14} strokeWidth={4} />
                            </div>
                          </div>
                        );
                      })}
                    {allUsers.filter((u: any) => u.name.includes(userSearchTerm) || u.users.includes(userSearchTerm)).length === 0 && (
                      <div className="p-8 text-center text-slate-400 font-bold text-sm">
                        검색된 사용자가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-5 bg-white border-t flex gap-3 shrink-0">
              <button onClick={() => setIsAccessModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all border border-slate-100">
                취소
              </button>
              <button onClick={handleSaveAccess} disabled={isSavingAccess} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
                {isSavingAccess ? "저장 중..." : "권한 설정 저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 변경 모달 */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-white shrink-0">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Lock size={18} className="text-indigo-600" /> 비밀번호 변경
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 bg-slate-50">
              {pwdError && <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl">{pwdError}</div>}
              {pwdSuccess && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold rounded-xl">{pwdSuccess}</div>}
              
              <form onSubmit={onPasswordChangeSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-500 mb-1.5 block">현재 비밀번호</label>
                  <input type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" required />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 mb-1.5 block">새 비밀번호</label>
                  <input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" required minLength={4} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 mb-1.5 block">새 비밀번호 확인</label>
                  <input type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" required minLength={4} />
                </div>
                
                <div className="pt-2 flex gap-2">
                  <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm bg-slate-100">취소</button>
                  <button type="submit" disabled={isSavingPwd} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 text-sm disabled:opacity-50">
                    {isSavingPwd ? '저장 중...' : '변경 완료'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* 앱 복제 모달 */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Copy size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">앱 및 테이블 복제하기</h2>
                  <p className="text-sm text-slate-400 font-bold mt-1">"{cloningApp?.name}" 앱을 복사합니다.</p>
                </div>
              </div>
              <button 
                disabled={isCloning}
                onClick={() => setIsCloneModalOpen(false)} 
                className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all disabled:opacity-30"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-10 max-h-[60vh] overflow-y-auto space-y-8">
              <div className="bg-indigo-50/50 p-6 rounded-[2rem] border-2 border-indigo-100 flex items-start gap-4 animate-in slide-in-from-top-2">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-md">?</div>
                <div>
                  <p className="text-[15px] font-black text-slate-800 leading-snug">이 앱에서 사용하는 테이블들을 어떻게 처리할까요?</p>
                </div>
              </div>

              <div className="space-y-4">
                {Object.keys(tableMappings).length === 0 ? (
                  <div className="py-10 text-center text-slate-400 font-bold bg-slate-50 rounded-3xl border border-dashed italic">이 앱은 사용 중인 테이블이 없습니다.</div>
                ) : (
                  Object.entries(tableMappings).map(([oldName, mapping]) => (
                    <div key={oldName} className={`p-6 rounded-[2rem] border-2 transition-all duration-300 ${mapping.action === 'clone' ? 'border-indigo-500 bg-white shadow-xl' : 'border-slate-100 bg-slate-50/30'}`}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <Database size={18} className={mapping.action === 'clone' ? 'text-indigo-600' : 'text-slate-400'} />
                          <span className="font-extrabold text-slate-700">{oldName}</span>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button 
                            disabled={isCloning}
                            onClick={() => setTableMappings(prev => ({ ...prev, [oldName]: { ...prev[oldName], action: 'reuse' } }))}
                            className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${mapping.action === 'reuse' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400'}`}
                          >
                            기존 유지
                          </button>
                          <button 
                            disabled={isCloning}
                            onClick={() => setTableMappings(prev => ({ ...prev, [oldName]: { ...prev[oldName], action: 'clone' } }))}
                            className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${mapping.action === 'clone' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                          >
                            테이블 복제
                          </button>
                        </div>
                      </div>

                      {mapping.action === 'clone' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <label className="text-[10px] font-black text-indigo-500 pl-1 uppercase tracking-widest">새 테이블 이름</label>
                          <input 
                            disabled={isCloning}
                            value={mapping.newName}
                            onChange={(e) => setTableMappings(prev => ({ ...prev, [oldName]: { ...prev[oldName], newName: e.target.value } }))}
                            className="w-full p-4 bg-white border-2 border-indigo-100 focus:border-indigo-600 outline-none rounded-2xl font-black text-sm text-slate-800 transition-all shadow-inner"
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
              <button 
                disabled={isCloning}
                onClick={() => setIsCloneModalOpen(false)} 
                className="flex-1 py-4 text-slate-400 font-extrabold rounded-2xl hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                취소
              </button>
              <button 
                disabled={isCloning}
                onClick={handleCloneAppWithTables}
                className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isCloning ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    복제 중...
                  </>
                ) : (
                  <>복제하기</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}