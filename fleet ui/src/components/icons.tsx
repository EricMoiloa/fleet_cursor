import type { SVGProps } from 'react';

export const Icons = {
  logo: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v12c0 .6.4 1 1 1h8" />
      <path d="M16 17H8" />
      <path d="M12 11v6" />
      <path d="M11 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      <path d="M5 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
    </svg>
  ),
};
