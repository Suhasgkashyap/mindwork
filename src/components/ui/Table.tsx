import React from 'react';

export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`overflow-x-auto rounded-2xl border border-[#E7E1D2] bg-white shadow-sm ${className}`}>
    <table className="w-full text-left border-collapse text-sm text-[#292524]">
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <thead className={`bg-[#F7F3E9] text-[#57534E] text-xs font-semibold uppercase tracking-wider border-b border-[#E7E1D2] ${className}`}>
    {children}
  </thead>
);

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <tbody className={`divide-y divide-[#EFE9DC] ${className}`}>{children}</tbody>;

export const TableRow: React.FC<{
  children: React.ReactNode;
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
}> = ({ children, clickable = false, onClick, className = '' }) => (
  <tr
    onClick={onClick}
    className={`transition-colors ${
      clickable ? 'cursor-pointer hover:bg-[#FAF6ED] active:bg-[#F4EFE2]' : 'hover:bg-[#FAF8F2]'
    } ${className}`}
  >
    {children}
  </tr>
);

export const TableHead: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <th className={`px-4.5 py-3.5 font-semibold text-[#44403C] text-xs ${className}`}>
    {children}
  </th>
);

export const TableCell: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <td className={`px-4.5 py-3.5 align-middle text-sm text-[#292524] ${className}`}>
    {children}
  </td>
);
