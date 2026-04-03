// page.tsx 프리뷰 부분 발췌
const RenderPreviewLayout = ({ rows, rowData, actions, onNavigate }: any) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {rows.map((row: any) => (
        <div key={row.id} className="flex gap-2 w-full items-stretch">
          {row.cells.map((cell: any) => (
            <div key={cell.id} style={{ flex: cell.flex }} className="flex flex-col justify-center min-w-0">
              {cell.contentType === 'field' && (
                <span className="text-sm font-semibold text-slate-700 truncate">{rowData[cell.contentValue] || '-'}</span>
              )}
              {cell.contentType === 'action' && (() => {
                const act = actions.find((a: any) => a.id === cell.contentValue);
                return act ? (
                  <button 
                    onClick={() => act.type === 'alert' ? alert(act.message) : onNavigate(act.targetViewId)}
                    className="w-full bg-indigo-50 text-indigo-600 text-[10px] font-black py-1.5 rounded-md hover:bg-indigo-100"
                  >
                    {act.name}
                  </button>
                ) : null;
              })()}
              {cell.contentType === 'nested' && cell.nestedRows && (
                <RenderPreviewLayout rows={cell.nestedRows} rowData={rowData} actions={actions} onNavigate={onNavigate} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

// ... 중략 (프리뷰 메인 루프 내부)
<div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
  <RenderPreviewLayout 
    rows={previewView.layoutRows} 
    rowData={row} 
    actions={appState.actions} 
    onNavigate={(id: string) => setCurrentPreviewViewId(id)} 
  />
</div>