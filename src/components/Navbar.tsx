import { LogOut, RefreshCw, Copy, Check } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

interface NavbarProps {
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  proxyAddress: string | null;
  walletAddress: string;
  usdcBalance: string;
  displayIdentifier: string;
  displayAvatar: string;
  isRefreshingBalance: boolean;
  onRefreshBalance: () => void;
  copied: boolean;
  onCopyCopy: (text: string) => void;
  onClearState: () => void;
}

export default function Navbar({
  authenticated, login, logout, proxyAddress, walletAddress, usdcBalance, displayIdentifier, 
  displayAvatar, isRefreshingBalance, onRefreshBalance, copied, onCopyCopy, onClearState
}: NavbarProps) {

  return (
    <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex justify-center sm:block">
      {!authenticated ? (
        <button onClick={login} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold shadow-xl transition-all active:scale-95">
          一键登录对接
        </button>
      ) : (
        <div className="flex items-center gap-3 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-2 pr-4 rounded-full shadow-2xl shadow-black/50">
          <div className="relative">
            <img src={displayAvatar} alt="avatar" className="w-8 h-8 rounded-full border border-zinc-700 object-cover flex-shrink-0" crossOrigin="anonymous" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-bold leading-tight">{displayIdentifier}</span>
              <span className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[8px] font-black text-purple-400 tracking-tighter">Polygon</span>
            </div>
            {proxyAddress && (
              <div className="flex items-center gap-1">
                <span className="text-zinc-400 text-[10px] font-mono leading-none">
                  <span className="hidden sm:inline">Polymarket Proxy Wallet:</span>
                  <span className="sm:hidden">Proxy Wallet:</span>
                  {" "}{proxyAddress.slice(0, 6)}...{proxyAddress.slice(-4)}
                </span>
                <button onClick={() => onCopyCopy(proxyAddress)} title="Copy" className="text-zinc-600 hover:text-blue-400 transition-colors p-0.5">
                  {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 leading-none mt-0.5">
              <span className="text-green-400 text-[11px] font-black">${usdcBalance}</span>
              <button 
                onClick={onRefreshBalance} 
                disabled={isRefreshingBalance}
                className={`text-zinc-500 hover:text-blue-400 transition-all p-0.5 ${isRefreshingBalance ? 'animate-spin text-blue-400' : ''}`}
                title="刷新余额"
              >
                <RefreshCw size={10} />
              </button>
            </div>
          </div>
          <div className="w-[1px] h-6 bg-zinc-800" />
          <button onClick={async () => {
            await logout();
            onClearState();
          }} className="text-zinc-500 hover:text-red-400 transition-colors text-xs font-medium">
            退出
          </button>
        </div>
      )}
    </div>
  );
}
