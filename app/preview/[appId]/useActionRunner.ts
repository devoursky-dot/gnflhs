// 파일 경로: app/preview/[appId]/useActionRunner.ts
import { useState } from 'react';
import { supabase } from '@/app/supabaseClient';
import { processMappingValue, getKSTHelpers, evaluateExpression } from './utils';
import { EngineUtilsRegistry } from '../../engines/engineRegistry';

export function useActionRunner(runtime: any, userProfile: any) {
  const { 
    appData, currentView, currentViewId, setCurrentViewId, 
    fetchTableData, evaluateAllViewStates, resolveTableName, setToast,
    setSearchTerm, setExpandedGroups, setIsSelectionMode, setSelectedRowKeys
  } = runtime;

  const version = appData?.engine_version;
  const customUtils = version ? EngineUtilsRegistry[version as keyof typeof EngineUtilsRegistry] : null;
  const utils = {
    processMappingValue: customUtils?.processMappingValue || processMappingValue,
    evaluateExpression: customUtils?.evaluateExpression || evaluateExpression,
    getKSTHelpers: customUtils?.getKSTHelpers || getKSTHelpers,
  };

  // ── 모달 상태 ──
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [activeInsertAction, setActiveInsertAction] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [activeUpdateAction, setActiveUpdateAction] = useState<any>(null);
  const [activeRowData, setActiveRowData] = useState<any>(null);
  const [updateFormData, setUpdateFormData] = useState<Record<string, any>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // ── 자동화 상태 ──
  const [actionQueue, setActionQueue] = useState<any[]>([]);
  const [pendingRowData, setPendingRowData] = useState<any>(null);
  const [batchSourceRows, setBatchSourceRows] = useState<any[] | null>(null);
  
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationProgress, setAutomationProgress] = useState(0);
  const [automationLog, setAutomationLog] = useState("");

  const buildPayloadFromMappings = (mappings: any[] | undefined, row: any): Record<string, any> => {
    const payload: Record<string, any> = {};
    mappings?.forEach((m: any) => {
      if (m.mappingType === 'card_data') payload[m.targetColumn] = utils.processMappingValue(m.sourceValue, row, userProfile);
      else if (m.mappingType === 'static') payload[m.targetColumn] = m.sourceValue;
      else if (m.mappingType === 'user_name') payload[m.targetColumn] = userProfile?.name || '';
      else if (m.mappingType === 'user_email') payload[m.targetColumn] = userProfile?.email || '';
      else if (m.mappingType === 'prompt') {
        payload[m.targetColumn] = m.valueType === 'number' ? (m.defaultNumberValue ?? 0) : '';
      }
      if (m.valueType === 'number') payload[m.targetColumn] = Number(payload[m.targetColumn]) || 0;
    });
    return payload;
  };

  const executeBatchAction = async (action: any, view: any, sourceRows: any[]) => {
    if (action.requireConfirm) {
      if (!window.confirm(`선택된 ${sourceRows.length}개의 데이터에 대해 [${action.name}] 작업을 실행하시겠습니까?\n작업 후 되돌릴 수 없습니다.`)) {
        return;
      }
    }

    setIsAutomating(true);
    setAutomationProgress(0);
    setAutomationLog(`${action.name} 대량 처리 중...`);

    try {
      const steps = action.steps && action.steps.length > 0 ? action.steps : [action];
      const firstStep = steps[0];
      const stepType = firstStep.type;
      
      if (sourceRows.length > 0) {
        // [1] INSERT (추가)
        if (stepType === 'insert_row') {
          const mappings = firstStep.insertMappings;
          const targetTable = resolveTableName(firstStep.insertTableName);
          if (targetTable && mappings && mappings.length > 0) {
            const hasPrompt = mappings.some((m: any) => m.mappingType === 'prompt');
            if (hasPrompt) {
              setBatchSourceRows(sourceRows);
              setActiveInsertAction(firstStep);
              setActionQueue(steps.length > 1 ? steps.slice(1) : []);
              setPendingRowData(sourceRows[0]);
              setFormData(buildPayloadFromMappings(mappings, sourceRows[0]));
              setIsInputModalOpen(true);
              setIsSelectionMode(false);
              setSelectedRowKeys([]);
              return; 
            }
            const payloads = sourceRows.map((row: any) => buildPayloadFromMappings(mappings, row));
            const { error: insertErr } = await supabase.from(targetTable).insert(payloads);
            if (insertErr) console.warn("Insert error during batch:", insertErr);
          }
        }
        // [2] UPDATE (수정)
        else if (stepType === 'update_row') {
          const mappings = firstStep.updateMappings;
          const targetTable = resolveTableName(firstStep.updateTableName);
          if (targetTable && mappings && mappings.length > 0) {
            const hasPrompt = mappings.some((m: any) => m.mappingType === 'prompt');
            if (hasPrompt) {
              setBatchSourceRows(sourceRows);
              setActiveUpdateAction(firstStep);
              setActionQueue(steps.length > 1 ? steps.slice(1) : []);
              setActiveRowData(sourceRows[0]); 
              setPendingRowData(sourceRows[0]);
              setUpdateFormData(buildPayloadFromMappings(mappings, sourceRows[0]));
              setIsUpdateModalOpen(true);
              setIsSelectionMode(false);
              setSelectedRowKeys([]);
              return; 
            }
            const chunkSize = 50;
            for (let i = 0; i < sourceRows.length; i += chunkSize) {
              const chunk = sourceRows.slice(i, i + chunkSize);
              await Promise.all(chunk.map((row: any) => {
                const init = buildPayloadFromMappings(mappings, row);
                return supabase.from(targetTable).update(init).eq('id', row.id);
              }));
              setAutomationProgress(Math.floor(((i + chunk.length) / sourceRows.length) * 100));
            }
          }
        }
        // [3] DELETE (삭제)
        else if (stepType === 'delete_row') {
          const targetTable = resolveTableName(firstStep.deleteTableName);
          if (targetTable) {
            const idsToDelete = sourceRows.map((r: any) => r.id).filter((id: any) => id !== undefined && id !== null);
            if (idsToDelete.length > 0) {
              const { error: delErr } = await supabase.from(targetTable).delete().in('id', idsToDelete);
              if (delErr) console.warn("Delete error during batch:", delErr);
            }
          }
        }
      }

      if (steps.length > 1) {
        const remainingSteps = steps.slice(1);
        await processNextStep(remainingSteps, sourceRows?.[0] || {});
      } else if (firstStep.targetViewId) {
        setCurrentViewId(firstStep.targetViewId);
      }
      
      fetchTableData(currentView);
      setIsSelectionMode(false);
      setSelectedRowKeys([]);

    } catch (e: any) {
      console.error("Batch Execution Error:", e);
      alert(`배치 작업 중 오류가 발생했습니다: ${e.message}`);
    } finally {
      await evaluateAllViewStates();
      setAutomationProgress(100);
      setAutomationLog("실행 완료!");
      setTimeout(() => setIsAutomating(false), 500);
    }
  };

  const handleInitAutomation = async (action: any, view: any) => {
    setIsAutomating(true);
    setAutomationProgress(10);
    setAutomationLog(`${view.name} 자동화 확인 중...`);

    try {
      const steps = action.steps && action.steps.length > 0 ? action.steps : [action];
      const firstStep = steps[0];
      const isBatchMode = !!(firstStep.batchMode || action.batchMode);

      if (isBatchMode && view.tableName) {
        const isVt = view.tableName.startsWith('vt_');
        const vt = isVt ? appData?.app_config?.virtualTables?.find((v: any) => v.id === view.tableName) : null;
        const fetchTable = vt ? vt.baseTableName : view.tableName;

        const utilsToUse = customUtils || (await import('./utils'));
        const { applyViewQuery } = utilsToUse;
        let query: any = supabase.from(fetchTable).select("*");
        query = applyViewQuery(query, view, userProfile);
        const { data: rawRows, error: fetchErr } = await query.limit(1000000000000); 
        if (fetchErr) throw fetchErr;

        let sourceRows = rawRows || [];
        if (vt && sourceRows.length > 0) {
          const { resolveVirtualData } = utilsToUse;
          sourceRows = await resolveVirtualData(sourceRows, vt);
        }

        if (sourceRows.length > 0) {
           await executeBatchAction(action, view, sourceRows);
           return; 
        }
      } else {
        setAutomationLog("시작 동작 실행 중...");
        await processNextStep(steps, {});
      }

      await evaluateAllViewStates();
      setAutomationProgress(100);
      setAutomationLog("완료!");
      setTimeout(() => setIsAutomating(false), 500);

    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      setToast({ message: `자동화 오류: ${errorMsg}`, type: 'error' });
      setIsAutomating(false);
    }
  };

  const handleSmsAction = async (action: any, rowData: any) => {
    try {
      let phone = '';
      if (action.smsTargetColumn) phone = rowData[action.smsTargetColumn];
      else if (action.smsPhoneColumn) phone = rowData[action.smsPhoneColumn];
      if (!phone) phone = rowData.phone || rowData.PHONE || rowData['연락처'] || rowData['전화번호'];
      if (!phone) {
        const studentIdentifier = rowData.name || rowData.NAME || rowData.students || rowData.STUDENTS || rowData.student_id || rowData.STUDENT_ID;
        if (studentIdentifier) {
          const { data: studentData } = await supabase.from('students').select('phone').or(`name.eq."${studentIdentifier}",student_id.eq."${studentIdentifier}"`).maybeSingle();
          if (studentData?.phone) phone = studentData.phone;
        }
      }
      let message = action.smsMessageTemplate || '';
      message = message.replace(/\{\{(.*?)\}\}/g, (_: string, col: string) => {
        const key = col.trim();
        const val = rowData[key];
        return val !== undefined && val !== null ? String(val) : '';
      });
      if (!phone) {
        const proceed = confirm('대상 학생의 전화번호를 찾을 수 없습니다. 메시지를 클립보드에 복사할까요?');
        if (!proceed) return;
      }
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && phone) {
        const phoneClean = phone.replace(/[^0-9]/g, '');
        const smsUrl = isIOS ? `sms:${phoneClean}&body=${encodeURIComponent(message)}` : `sms:${phoneClean}?body=${encodeURIComponent(message)}`;
        window.location.href = smsUrl;
      } else {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          alert("메시지가 클립보드에 복사되었습니다.\n\n내용:\n" + message);
        } else {
          window.prompt("이 메시지를 복사하여 사용하세요:", message);
        }
      }
    } catch (err: any) {
      alert("문자 전송 처리 중 오류 발생: " + err.message);
    }
  };

  const processNextStep = async (queue: any[], rowData: any) => {
    if (!queue || queue.length === 0) {
      setActionQueue([]);
      setPendingRowData(null);
      return;
    }

    const [currentStep, ...remaining] = queue;
    setActionQueue(remaining);
    setPendingRowData(rowData);

    if (currentStep.type === 'alert') {
      alert(currentStep.message || '알림');
      await processNextStep(remaining, rowData);

    } else if (currentStep.type === 'navigate') {
      if (!currentStep.targetViewId) {
        await processNextStep(remaining, rowData);
        return;
      }
      setCurrentViewId(currentStep.targetViewId);
      setSearchTerm('');
      setExpandedGroups({});
      if (remaining.length > 0) {
        setTimeout(() => processNextStep(remaining, rowData), 100);
      } else {
        await processNextStep(remaining, rowData);
      }

    } else if (currentStep.type === 'insert_row') {
      setActiveInsertAction(currentStep);
      const init = buildPayloadFromMappings(currentStep.insertMappings, rowData);

      const hasPrompt = currentStep.insertMappings?.some((m: any) => m.mappingType === 'prompt');

      if (!hasPrompt) {
        setFormData(init);
        (async () => {
          setIsSubmitting(true);
          try {
            const targetTable = resolveTableName(currentStep.insertTableName);
            if (!targetTable) throw new Error("대상 테이블이 없습니다.");
            const { error } = await supabase.from(targetTable).insert([init]);
            if (error) throw error;
            setToast({ message: "즉시 저장 완료", type: 'success' });
            fetchTableData(currentView);
            processNextStep(remaining, rowData);
            evaluateAllViewStates();
          } catch (err: any) {
            setToast({ message: `저장 실패: ${err.message}`, type: 'error' });
          } finally {
            setIsSubmitting(false);
          }
        })();
      } else {
        setFormData(init);
        setIsInputModalOpen(true);
      }

    } else if (currentStep.type === 'delete_row') {
      const targetTable = resolveTableName(currentStep.deleteTableName);
      if (targetTable && rowData.id) {
        if (window.confirm("삭제하시겠습니까?")) {
          await supabase.from(targetTable).delete().eq('id', rowData.id);
          fetchTableData(currentView);
        }
      }
      await processNextStep(remaining, rowData);

    } else if (currentStep.type === 'update_row') {
      setActiveUpdateAction(currentStep);
      setActiveRowData(rowData);
      const init = buildPayloadFromMappings(currentStep.updateMappings, rowData);

      currentStep.updateMappings?.forEach((m: any) => {
        const hasExistingData = rowData && rowData[m.targetColumn] !== undefined && rowData[m.targetColumn] !== null;
        if (m.mappingType === 'prompt') {
          if (hasExistingData) init[m.targetColumn] = rowData[m.targetColumn];
        } else if (!init[m.targetColumn] && init[m.targetColumn] !== 0) {
          if (hasExistingData) init[m.targetColumn] = rowData[m.targetColumn];
        }
      });

      const hasPrompt = currentStep.updateMappings?.some((m: any) => m.mappingType === 'prompt');

      if (!hasPrompt) {
        setUpdateFormData(init);
        (async () => {
          setIsUpdating(true);
          try {
            const targetTable = resolveTableName(currentStep.updateTableName);
            if (!targetTable || !rowData.id) throw new Error("대상 데이터가 없습니다.");
            const { error } = await supabase.from(targetTable).update(init).eq('id', rowData.id);
            if (error) throw error;
            setToast({ message: "즉시 수정 완료", type: 'success' });
            fetchTableData(currentView);
            processNextStep(remaining, rowData);
            evaluateAllViewStates();
          } catch (err: any) {
            setToast({ message: `수정 실패: ${err.message}`, type: 'error' });
          } finally {
            setIsUpdating(false);
          }
        })();
      } else {
        setUpdateFormData(init);
        setIsUpdateModalOpen(true);
      }

    } else if (currentStep.type === 'send_sms') {
      await handleSmsAction(currentStep, rowData);
      await processNextStep(remaining, rowData);
    }
  };

  const handleAction = async (action: any, rowData: any) => {
    if (action.requireConfirm) {
      if (!window.confirm(`[${action.name}] 작업을 실행하시겠습니까?`)) {
        return;
      }
    }
    const steps = action.steps && action.steps.length > 0 ? action.steps : [action];
    processNextStep(steps, rowData);
  };

  const handleSubmitInsert = async (forced?: any) => {
    if (!activeInsertAction) return;
    setIsSubmitting(true);
    try {
      const targetTableId = activeInsertAction.insertTableName;
      const targetVt = targetTableId.startsWith('vt_') ? appData?.app_config?.virtualTables?.find((v: any) => v.id === targetTableId) : null;
      const targetTable = targetVt ? targetVt.baseTableName : targetTableId;
      const payload = forced || formData;

      if (batchSourceRows && batchSourceRows.length > 0) {
        const batchedPayloads = batchSourceRows.map((row: any) => {
           const basePayload = buildPayloadFromMappings(activeInsertAction.insertMappings, row);
           activeInsertAction.insertMappings?.forEach((m: any) => {
             if (m.mappingType === 'prompt') basePayload[m.targetColumn] = payload[m.targetColumn];
           });
           return basePayload;
        });
        const { error } = await supabase.from(targetTable).insert(batchedPayloads);
        if (error) throw error;
        setBatchSourceRows(null);
      } else {
        const { error } = await supabase.from(targetTable).insert([payload]);
        if (error) throw error;
      }
      
      setToast({ message: "성공적으로 저장되었습니다.", type: 'success' });
      setIsInputModalOpen(false);
      fetchTableData(currentView);
      processNextStep(actionQueue, pendingRowData);
      evaluateAllViewStates();
    } catch (err: any) {
      setToast({ message: `저장 실패: ${err.message}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitUpdate = async (forced?: any) => {
    if (!activeUpdateAction) return;
    setIsUpdating(true);
    try {
      const targetTableId = activeUpdateAction.updateTableName;
      const targetVt = targetTableId.startsWith('vt_') ? appData?.app_config?.virtualTables?.find((v: any) => v.id === targetTableId) : null;
      const targetTable = targetVt ? targetVt.baseTableName : targetTableId;
      const payload = forced || updateFormData;

      if (batchSourceRows && batchSourceRows.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < batchSourceRows.length; i += chunkSize) {
          const chunk = batchSourceRows.slice(i, i + chunkSize);
          await Promise.all(chunk.map((row: any) => {
            const basePayload = buildPayloadFromMappings(activeUpdateAction.updateMappings, row);
            activeUpdateAction.updateMappings?.forEach((m: any) => {
              if (m.mappingType === 'prompt') basePayload[m.targetColumn] = payload[m.targetColumn];
            });
            return supabase.from(targetTable).update(basePayload).eq('id', row.id);
          }));
        }
        setBatchSourceRows(null);
      } else {
        const { error } = await supabase.from(targetTable).update(payload).eq('id', activeRowData.id);
        if (error) throw error;
      }
      
      setToast({ message: "성공적으로 수정되었습니다.", type: 'success' });
      setIsUpdateModalOpen(false);
      fetchTableData(currentView);
      processNextStep(actionQueue, pendingRowData);
      evaluateAllViewStates();
    } catch (err: any) {
      setToast({ message: `수정 실패: ${err.message}`, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    isInputModalOpen, setIsInputModalOpen, activeInsertAction, formData, setFormData, isSubmitting,
    isUpdateModalOpen, setIsUpdateModalOpen, activeUpdateAction, activeRowData, updateFormData, setUpdateFormData, isUpdating,
    isAutomating, automationProgress, automationLog,
    executeBatchAction, handleInitAutomation, handleAction, handleSubmitInsert, handleSubmitUpdate,
    actionQueue, setActionQueue, setBatchSourceRows
  };
}
