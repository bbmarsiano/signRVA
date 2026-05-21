// ErrorBoundary — catch client render errors and show fallback UI
"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-base font-semibold text-zinc-900">
            Нещо се обърка. Опитай отново.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: "#0F6E56" }}
          >
            Опитай отново
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
