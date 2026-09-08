import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      // Clear potentially corrupted session data while keeping system essentials
      const keepKeys = ['theme'];
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keepKeys.includes(key)) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  private handleDismiss = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-[#121212] border border-[#262626] rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-neutral-100">
                Ocorreu uma falha no carregamento
              </h2>
              <p className="text-xs text-neutral-400">
                O sistema recuperou de um erro inesperado para evitar a tela em branco.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#080808] border border-neutral-800 rounded-xl text-left max-h-32 overflow-y-auto">
                <p className="text-[11px] font-mono text-rose-400 break-words font-medium">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={this.handleDismiss}
                className="w-full sm:flex-1 py-2.5 px-4 bg-[#c5a47e] text-neutral-950 font-bold text-xs rounded-xl hover:bg-[#b5946e] transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tentar Novamente</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="w-full sm:w-auto py-2.5 px-3 bg-[#181818] text-neutral-300 border border-[#2e2e2e] hover:border-neutral-600 font-medium text-xs rounded-xl transition-all cursor-pointer"
                title="Limpa dados temporários corrompidos e recarrega"
              >
                <span>Repor Sessão</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
