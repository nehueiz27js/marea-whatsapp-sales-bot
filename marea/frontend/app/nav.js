'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Resumen' },
  { href: '/chats', label: 'Conversaciones' },
  { href: '/simulator', label: 'Probar el bot' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="nav">
      <Link href="/" className="brand" aria-label="Marea, inicio">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M1 9c4-5 6 5 12 0s8 5 12 0M1 17c4-5 6 5 12 0s8 5 12 0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        Marea
      </Link>
      <nav aria-label="Principal">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={path === l.href ? 'page' : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
