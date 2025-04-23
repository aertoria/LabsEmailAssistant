import { Progress } from "@/components/ui/progress";

interface SyncStatusProps {
  status: {
    isActive: boolean;
    progress: number;
    total: number;
    processed: number;
  };
}

export function SyncStatus({ status }: SyncStatusProps) {
  if (!status || !status.isActive) return null;
  
  const percentage = Math.round((status.processed / status.total) * 100) || 0;
  
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-md p-4 flex items-center max-w-xs">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">Syncing your mailbox</p>
        <p className="text-xs text-gray-500 mb-1">
          Downloaded {status.processed} of {status.total} messages
        </p>
        <Progress value={percentage} className="h-1" />
      </div>
    </div>
  );
}
