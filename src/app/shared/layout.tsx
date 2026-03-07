import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Shared Simulation | Mirror",
    description: "View a shared simulation report",
};

export default function SharedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
