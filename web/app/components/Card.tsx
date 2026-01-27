// web/app/components/Card.tsx
import { ReactNode } from "react";

interface CardProps {
  title: string;
  subtitle?: string;
  id?: string;
  children?: ReactNode;
}

export default function Card({ title, subtitle, id, children }: CardProps) {
  return (
    <section 
      id={id} 
      style={{ 
        background: "var(--card)", 
        border: "1px solid var(--border)", 
        borderRadius: 18, 
        padding: 18, 
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)" 
      }}
    >
      <h2 style={{ fontSize: 22, margin: 0, color: "var(--foreground)", fontWeight: 700 }}>{title}</h2>
      {subtitle && (
        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontWeight: 500, fontSize: 14 }}>
          {subtitle}
        </p>
      )}
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}