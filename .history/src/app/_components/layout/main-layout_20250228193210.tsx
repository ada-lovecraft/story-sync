"use client";

import React from "react";
import Link from "next/link";

import { ScrollArea } from "@/app/_components/ui/scroll-area";
import { ThemeToggle } from "../theme-toggle";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col">
            {/* Navbar */}
            <header className="sticky top-0 z-10 border-b bg-background">
                <div className="container flex h-14 items-center px-4">
                    <div className="mr-4">
                        <Link href="/" className="flex items-center">
                            <span className="font-bold">ChatLog Cleaner</span>
                        </Link>
                    </div>
                    <div className="ml-auto flex items-center space-x-4">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-64 border-r">
                    <ScrollArea className="h-[calc(100vh-3.5rem)]">
                        <div className="px-3 py-4">
                            <h2 className="mb-2 px-4 text-lg font-semibold">Workflow</h2>
                            <nav className="space-y-1">
                                <Link
                                    href="/"
                                    className={cn(
                                        "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        "bg-accent text-accent-foreground"
                                    )}
                                >
                                    Upload/Select
                                </Link>
                                <Link
                                    href="/clean"
                                    className={cn(
                                        "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                                        "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    Clean/Format
                                </Link>
                                <Link
                                    href="/rounds"
                                    className={cn(
                                        "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                                        "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    Parse Rounds
                                </Link>
                                <Link
                                    href="/chapters"
                                    className={cn(
                                        "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                                        "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    Chapter Chunking
                                </Link>
                            </nav>
                        </div>
                    </ScrollArea>
                </aside>

                {/* Main content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="container py-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
} 