'use client';

import { useState, useEffect } from 'react';

type ClientFormattedDateProps = {
  date: string;
};

export function ClientFormattedDate({ date }: ClientFormattedDateProps) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    setFormattedDate(new Date(date).toLocaleString());
  }, [date]);

  if (!formattedDate) {
    // You can return a placeholder or null while waiting for the client to mount
    return null;
  }

  return <>{formattedDate}</>;
}
