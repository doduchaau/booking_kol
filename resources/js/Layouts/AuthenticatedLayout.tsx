import React, { PropsWithChildren, ReactNode } from 'react';
import AppLayout from './AppLayout';

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    return <AppLayout header={header}>{children}</AppLayout>;
}
