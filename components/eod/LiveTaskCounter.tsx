'use client';
import { useState, useEffect } from 'react';

export function LiveTaskCounter({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  
  useEffect(() => {
    const handleUpdate = (e: CustomEvent<number>) => setCount(e.detail);
    window.addEventListener('eod-tasks-changed', handleUpdate as EventListener);
    return () => window.removeEventListener('eod-tasks-changed', handleUpdate as EventListener);
  }, []);

  return <div className="text-3xl font-black mb-1">{count}</div>;
}
