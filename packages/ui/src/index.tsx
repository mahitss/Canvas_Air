import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const baseStyle = "px-4 py-2 rounded text-sm font-semibold transition-all";
  const variantStyle =
    variant === "primary"
      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700";

  return (
    <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function Card({ title, className = "", children, ...props }: CardProps) {
  return (
    <div className={`p-6 rounded-xl bg-zinc-900 border border-zinc-800 text-white ${className}`} {...props}>
      {title ? <h3 className="text-lg font-bold mb-2 tracking-tight text-white">{title}</h3> : null}
      {children}
    </div>
  );
}
