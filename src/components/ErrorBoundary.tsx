import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Nama modul untuk judul fallback & log (mis. "Perpustakaan"). */
  label?: string;
  /** Dipanggil setelah pemain menekan "Coba Pulihkan" (mis. untuk menutup modul). */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

function forceReload() {
  const w = window as unknown as { __sevnForceReload?: () => void };
  if (typeof w.__sevnForceReload === 'function') {
    w.__sevnForceReload();
    return;
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
  }
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
  window.location.reload();
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error${this.props.label ? ` di modul "${this.props.label}"` : ''}:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  private reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { label } = this.props;
    return (
      <div
        role="alert"
        className="panel panel-stitched flex flex-col items-center justify-center min-h-[320px] p-6 m-3 rounded-3xl bg-surface-card border border-border-subtle shadow-md text-center"
      >
        <h2 className="font-heading font-bold text-lg mb-2 text-text-primary">
          {label ? `Modul ${label} sedang bermasalah` : 'Terjadi kendala tak terduga'}
        </h2>
        <p className="text-sm mb-5 text-text-secondary max-w-md">
          Progres kamu tetap tersimpan. Coba pulihkan modul ini; bila masih gagal, bersihkan cache lalu muat ulang.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
          <button
            type="button"
            className="btn-physical-primary min-h-[44px] py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold font-heading cursor-pointer"
            onClick={this.reset}
          >
            Coba Pulihkan
          </button>
          <button
            type="button"
            className="btn-physical-secondary min-h-[44px] py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold font-heading cursor-pointer"
            onClick={forceReload}
          >
            Bersihkan Cache &amp; Muat Ulang
          </button>
        </div>

        <details className="w-full max-w-2xl text-left">
          <summary className="cursor-pointer text-xs font-mono text-text-muted select-none">Detail teknis (untuk laporan bug)</summary>
          <div className="mt-2 bg-surface-inset border border-border-subtle shadow-inner p-3 rounded-xl overflow-auto max-h-72">
            <pre className="text-[11px] font-mono text-text-secondary break-all whitespace-pre-wrap">{this.state.error?.toString()}</pre>
            {this.state.error?.stack && (
              <pre className="text-[11px] font-mono text-text-muted break-all whitespace-pre-wrap mt-2 pt-2 border-t border-border-subtle">{this.state.error.stack}</pre>
            )}
            {this.state.errorInfo?.componentStack && (
              <pre className="text-[11px] font-mono text-text-muted break-all whitespace-pre-wrap mt-2 pt-2 border-t border-border-subtle">{this.state.errorInfo.componentStack}</pre>
            )}
          </div>
        </details>
      </div>
    );
  }
}
