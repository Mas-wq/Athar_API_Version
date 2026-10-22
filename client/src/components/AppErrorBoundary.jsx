import React from "react";

export default class AppErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Athar page render error:", error, info);
    this.setState({ error });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
          <section className="max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h1 className="text-2xl font-semibold">Page couldn’t load</h1>
            <p className="mt-3 text-slate-400">Refresh the page to try again. If the problem continues, check the browser console and the server terminal.</p>
            {this.state.error && <details className="mt-4 rounded-lg bg-slate-950 p-3 text-start text-xs text-rose-300"><summary className="cursor-pointer">Show error details</summary><pre className="mt-2 whitespace-pre-wrap break-words">{String(this.state.error.message || this.state.error)}</pre></details>}
            <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950">Refresh page</button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
