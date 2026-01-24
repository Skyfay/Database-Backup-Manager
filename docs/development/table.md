# Table Implementation Guide

This guide explains how to implement tables using the standardized `DataTable` component.

## Overview

The project uses a reusable `DataTable` component built on top of `@tanstack/react-table`. It supports two modes:
1.  **Client-Side Mode**: Pass all data at once, the table handles sorting, filtering, and pagination.
2.  **Server-Side (Manual) Mode**: Pass only the current page of data, the parent component handles state and fetching.

## 1. Client-Side Implementation (Simple)

Best for small datasets (< 1000 rows) where all data is loaded at once.

```tsx
"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { useRouter } from "next/navigation";

export function MyTableComponent({ data }) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      onRefresh={() => router.refresh()}
    />
  );
}
```

## 2. Server-Side Implementation (Manual Mode)

Best for large datasets (Audit Logs, History) requiring API pagination.

### Key Props
- `manualPagination={true}`
- `manualFiltering={true}`
- `rowCount`: Total number of items across all pages.
- `pageCount`: Total number of pages.
- `pagination` & `onPaginationChange`: Controlled state for current page/size.
- `columnFilters` & `onColumnFiltersChange`: Controlled state for active filters.
- `isLoading`: Shows spinner on refresh button.

### Example Code

```tsx
"use client";

import { useState, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { PaginationState, ColumnFiltersState } from "@tanstack/react-table";

export function ServerSideTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);

  // 1. Define State
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // 2. Fetch Function
  const fetchData = useCallback(async () => {
    setLoading(true);
    // Convert table state to API params
    const filters = {
       page: pagination.pageIndex + 1,
       limit: pagination.pageSize,
       search: columnFilters.find(f => f.id === "name")?.value,
       status: (columnFilters.find(f => f.id === "status")?.value as string[])?.[0]
    };

    // Call Server Action
    const result = await getData(filters);
    setData(result.items);
    setTotalRows(result.total);
    setLoading(false);
  }, [pagination, columnFilters]);

  // 3. Render
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"

      // Manual Mode
      manualPagination={true}
      manualFiltering={true}

      // State Binding
      pagination={pagination}
      onPaginationChange={setPagination}
      columnFilters={columnFilters}
      onColumnFiltersChange={setColumnFilters}

      // Meta Data
      rowCount={totalRows}
      pageCount={Math.ceil(totalRows / pagination.pageSize)}

      // Loading State
      onRefresh={fetchData}
      isLoading={loading}
    />
  );
}
```

## 3. Advanced Features

### Faceted Filters (with Counts)

To add dropdown filters with counters (e.g., "5 Active Users"), use `filterableColumns`.

```tsx
const filterableColumns = [
  {
    id: "status", // Matches accessorKey in columns
    title: "Status",
    options: [
      {
        label: "Active",
        value: "active",
        count: 15 // Optional: Server-side count
      },
      {
        label: "Inactive",
        value: "inactive",
        count: 3
      },
    ],
  },
];

<DataTable filterableColumns={filterableColumns} ... />
```

### Loading State

Pass `isLoading={true}` to show a spinner on the refresh button and disable interaction during data fetching.

```tsx
<DataTable isLoading={isLoading} onRefresh={fetchData} ... />
```

### Column Definitions

Create a `columns.tsx` file. Use the helper for sortable headers.

```tsx
export const columns: ColumnDef<MyData>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
];
```

## Creating a New Table Checklist

1. [ ] Create `columns.tsx` with column definitions.
2. [ ] Decide strategy: **Client-Side** (simple) vs **Server-Side** (scalable).
3. [ ] If Server-Side:
    - [ ] Create `useState` for `pagination` and `columnFilters`.
    - [ ] Create a `fetchData` function that maps state to API arguments.
    - [ ] Use `useEffect` or `useCallback` to trigger fetch on state change.
4. [ ] Implement `DataTable` with appropriate props.
5. [ ] Add `filterableColumns` if you need faceted filtering.
