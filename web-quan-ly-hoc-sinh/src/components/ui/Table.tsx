import React from 'react';
import { cn } from './Button';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

function Table<T extends { id: string | number }>({ 
  columns, 
  data, 
  isLoading, 
  onRowClick,
  emptyMessage = "Không có dữ liệu hiển thị." 
}: TableProps<T>) {
  return (
    <div className="w-full bg-white">
      <div className="scrollbar-hidden overflow-x-auto">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="h-[52px] border-b border-[#EDEDF2] bg-white">
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  className={cn(
                    "px-4 text-[12px] font-semibold text-[#6E6E73] text-left uppercase tracking-wider whitespace-nowrap",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="h-14 border-b border-[#EDEDF2] animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 whitespace-nowrap">
                      <div className="h-4 bg-[#F5F5F7] rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-40 text-center text-[#6E6E73]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr 
                  key={item.id} 
                  className={cn(
                    "h-14 border-b border-[#EDEDF2] transition-colors hover:bg-[#0071E3]/[0.035]",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col, i) => (
                    <td key={i} className={cn("px-4 text-[15px] text-[#1D1D1F] whitespace-nowrap", col.className)}>
                      {typeof col.accessor === 'function' 
                        ? col.accessor(item) 
                        : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
