export function ProfileEmptyState({ 
  loading, 
  loadingText = "正在加载数据...", 
  emptyText = "暂无数据" 
}: { 
  loading: boolean; 
  loadingText?: string; 
  emptyText?: string; 
}) {
  return (
    <div className="text-center text-[#a3aac4] text-[14px] py-10">
      {loading ? loadingText : emptyText}
    </div>
  );
}
